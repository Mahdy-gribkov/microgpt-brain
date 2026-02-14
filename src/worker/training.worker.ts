import { MicroGPT, trainStep } from '../engine/model';
import { CharTokenizer } from '../engine/tokenizer';
import { AdamOptimizer } from '../engine/optimizer';
import { generate } from '../engine/generate';
import { extractWeights, extractModelConfig } from '../engine/weight-bridge';
import { SECURITY_LIMITS } from '../lib/constants';
import { sanitizeText, estimateMemoryMB } from '../lib/sanitize';
import { initGpu } from '../gpu/device';
import type { WorkerRequest, TrainProgress, TrainComplete, GenerateResult, ErrorMessage, ReadyMessage, TimeoutMessage, GpuStatusMessage, WeightsSnapshotMessage } from './messages';

let model: MicroGPT | null = null;
let tokenizer: CharTokenizer | null = null;
let stopRequested = false;

// Safe initialization: Do not run async code at top level.
// Wait for 'init_gpu' message or initialize lazily.

async function handleInitGpu() {
  try {
    const ctx = await initGpu();
    if (ctx) {
      const msg: GpuStatusMessage = {
        type: 'gpu-status',
        available: true,
        gpuName: ctx.adapterName,
        backend: 'webgpu',
      };
      self.postMessage(msg);
      ctx.device.destroy();
    } else {
      throw new Error("GPU context null");
    }
  } catch {
    const msg: GpuStatusMessage = {
      type: 'gpu-status',
      available: false,
      gpuName: '',
      backend: 'cpu',
    };
    self.postMessage(msg);
  }
}

const MAX_MEMORY_MB = 500;
const MAX_TRAINING_TIME_MS = 5 * 60 * 1000; // 5 minutes

function validateTrainInput(msg: Extract<WorkerRequest, { type: 'train' }>) {
  // Sanitize and validate text
  sanitizeText(msg.text);

  const { nLayer, nHead, nEmbd } = msg.modelConfig;
  if (nLayer < 1 || nLayer > 8) throw new Error(`nLayer must be 1-8, got ${nLayer}`);
  if (nHead < 1 || nHead > 8) throw new Error(`nHead must be 1-8, got ${nHead}`);
  if (nEmbd < 16 || nEmbd > 256) throw new Error(`nEmbd must be 16-256, got ${nEmbd}`);
  if (nEmbd % nHead !== 0) throw new Error(`nEmbd (${nEmbd}) must be divisible by nHead (${nHead})`);

  // Memory estimation check
  const memMB = estimateMemoryMB({ nLayer, nEmbd });
  if (memMB > MAX_MEMORY_MB) {
    throw new Error(`Estimated memory ${memMB.toFixed(0)}MB exceeds limit of ${MAX_MEMORY_MB}MB`);
  }

  const { lr, maxSteps } = msg.adamConfig;
  if (lr <= 0 || lr > 0.05) throw new Error(`lr must be (0, 0.05], got ${lr}`);
  if (maxSteps < 1 || maxSteps > 2000) throw new Error(`maxSteps must be 1-2000, got ${maxSteps}`);
}

const VALID_MESSAGE_TYPES = new Set(['init_gpu', 'train', 'generate', 'stop']);

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  if (!msg || typeof msg.type !== 'string' || !VALID_MESSAGE_TYPES.has(msg.type)) {
    const error: ErrorMessage = { type: 'error', message: `Unknown message type: ${String(msg?.type)}` };
    self.postMessage(error);
    return;
  }

  switch (msg.type) {
    case 'init_gpu':
      await handleInitGpu();
      break;
    case 'train':
      await handleTrain(msg);
      break;
    case 'generate':
      handleGenerate(msg);
      break;
    case 'stop':
      stopRequested = true;
      break;
  }
};

async function handleTrain(msg: Extract<WorkerRequest, { type: 'train' }>) {
  try {
    stopRequested = false;
    validateTrainInput(msg);

    tokenizer = new CharTokenizer(msg.text);
    const config = { ...msg.modelConfig, vocabSize: tokenizer.vocabSize };
    model = new MicroGPT(config);

    const ready: ReadyMessage = {
      type: 'ready',
      paramCount: model.paramCount(),
      vocabSize: tokenizer.vocabSize,
    };
    self.postMessage(ready);

    const optimizer = new AdamOptimizer(model.parameters(), msg.adamConfig);
    const tokens = tokenizer.encodeDoc(msg.text);
    const { maxSteps } = msg.adamConfig;
    const trainingStart = performance.now();
    const PROGRESS_INTERVAL = 10; // Only post every Nth step to reduce message overhead
    const WEIGHTS_SNAPSHOT_INTERVAL = 50; // Post weight snapshots for live visualizer

    for (let step = 0; step < maxSteps; step++) {
      if (stopRequested) break;

      // Total training time limit
      if (performance.now() - trainingStart > MAX_TRAINING_TIME_MS) {
        const timeout: TimeoutMessage = { type: 'timeout', step: step + 1 };
        self.postMessage(timeout);
        return;
      }

      const stepStart = performance.now();

      const loss = trainStep(model, tokens);
      optimizer.step(model.parameters());

      const stepDuration = performance.now() - stepStart;
      if (stepDuration > SECURITY_LIMITS.maxStepDurationMs) {
        const timeout: TimeoutMessage = { type: 'timeout', step: step + 1 };
        self.postMessage(timeout);
        return;
      }

      // Throttle progress messages to every PROGRESS_INTERVAL steps + last step
      if (step % PROGRESS_INTERVAL === 0 || step === maxSteps - 1) {
        const progress: TrainProgress = {
          type: 'progress',
          step: step + 1,
          loss,
          totalSteps: maxSteps,
        };
        self.postMessage(progress);
      }

      // Post weight snapshots for live visualizer
      if (step % WEIGHTS_SNAPSHOT_INTERVAL === 0 || step === maxSteps - 1) {
        const snapshot: WeightsSnapshotMessage = {
          type: 'weights-snapshot',
          weights: extractWeights(model),
          config: extractModelConfig(model.config, tokenizer),
          step: step + 1,
        };
        self.postMessage(snapshot);
      }

      // Yield to allow stop messages to be processed
      if (step % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // Final snapshot
    const finalSnapshot: WeightsSnapshotMessage = {
      type: 'weights-snapshot',
      weights: extractWeights(model),
      config: extractModelConfig(model.config, tokenizer),
      step: maxSteps,
    };
    self.postMessage(finalSnapshot);

    const complete: TrainComplete = {
      type: 'complete',
      finalLoss: 0, // last loss was already sent via progress
    };
    self.postMessage(complete);
  } catch (err) {
    const error: ErrorMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
}

function handleGenerate(msg: Extract<WorkerRequest, { type: 'generate' }>) {
  if (!model || !tokenizer) {
    const error: ErrorMessage = { type: 'error', message: 'Model not trained yet' };
    self.postMessage(error);
    return;
  }

  try {
    const text = generate(model, tokenizer, msg.maxTokens, msg.temperature);
    const result: GenerateResult = { type: 'generated', text };
    self.postMessage(result);
  } catch (err) {
    const error: ErrorMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    };
    self.postMessage(error);
  }
}
