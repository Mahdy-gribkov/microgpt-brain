import { MicroGPT, trainStep } from '../engine/model';
import { CharTokenizer } from '../engine/tokenizer';
import { AdamOptimizer } from '../engine/optimizer';
import { generate } from '../engine/generate';
import { SECURITY_LIMITS } from '../lib/constants';
import { initGpu } from '../gpu/device';
import type { WorkerRequest, TrainProgress, TrainComplete, GenerateResult, ErrorMessage, ReadyMessage, TimeoutMessage, GpuStatusMessage } from './messages';

let model: MicroGPT | null = null;
let tokenizer: CharTokenizer | null = null;
let stopRequested = false;
let gpuDetected = false;

// Detect GPU on worker load
(async () => {
  try {
    const ctx = await initGpu();
    if (ctx) {
      gpuDetected = true;
      const msg: GpuStatusMessage = {
        type: 'gpu-status',
        available: true,
        gpuName: ctx.adapterName,
        backend: 'webgpu',
      };
      self.postMessage(msg);
      // Note: GPU backend is available but not yet wired into the training loop.
      // The model currently uses CPU ops directly. Future: pass backend to model.
      ctx.device.destroy(); // Release for now — will re-init when needed
    } else {
      const msg: GpuStatusMessage = {
        type: 'gpu-status',
        available: false,
        gpuName: '',
        backend: 'cpu',
      };
      self.postMessage(msg);
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
})();

function validateTrainInput(msg: Extract<WorkerRequest, { type: 'train' }>) {
  if (typeof msg.text !== 'string') throw new Error('Invalid input: text must be a string');
  if (msg.text.length > SECURITY_LIMITS.maxInputTextLength) {
    throw new Error(`Input text too long: ${msg.text.length} > ${SECURITY_LIMITS.maxInputTextLength}`);
  }

  const { nLayer, nHead, nEmbd } = msg.modelConfig;
  if (nLayer < 1 || nLayer > 8) throw new Error(`nLayer must be 1-8, got ${nLayer}`);
  if (nHead < 1 || nHead > 8) throw new Error(`nHead must be 1-8, got ${nHead}`);
  if (nEmbd < 16 || nEmbd > 256) throw new Error(`nEmbd must be 16-256, got ${nEmbd}`);
  if (nEmbd % nHead !== 0) throw new Error(`nEmbd (${nEmbd}) must be divisible by nHead (${nHead})`);

  const { lr, maxSteps } = msg.adamConfig;
  if (lr <= 0 || lr > 0.05) throw new Error(`lr must be (0, 0.05], got ${lr}`);
  if (maxSteps < 1 || maxSteps > 2000) throw new Error(`maxSteps must be 1-2000, got ${maxSteps}`);
}

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data;

  switch (msg.type) {
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

    for (let step = 0; step < maxSteps; step++) {
      if (stopRequested) break;

      const stepStart = performance.now();

      model.zeroGrad();
      const loss = trainStep(model, tokens);
      optimizer.step(model.parameters());

      const stepDuration = performance.now() - stepStart;
      if (stepDuration > SECURITY_LIMITS.maxStepDurationMs) {
        const timeout: TimeoutMessage = { type: 'timeout', step: step + 1 };
        self.postMessage(timeout);
        return;
      }

      const progress: TrainProgress = {
        type: 'progress',
        step: step + 1,
        loss,
        totalSteps: maxSteps,
      };
      self.postMessage(progress);

      // Yield to allow stop messages to be processed
      if (step % 10 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

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
