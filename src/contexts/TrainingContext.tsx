'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from 'react';
import { TRAINING_DEFAULTS, SECURITY_LIMITS } from '../lib/constants';
import { computeParamCount } from '../engine/model';
import type { WorkerResponse, TrainRequest } from '../worker/messages';
import type { AdamConfig } from '../engine/optimizer';
import type { ModelConfigState } from '../hooks/useModelConfig';
import type { ModelConfig, ModelWeights } from '../lib/visualizer-types';

export type TrainingStatus = 'idle' | 'initializing' | 'training' | 'complete' | 'error';

interface TrainingState {
  status: TrainingStatus;
  currentStep: number;
  currentLoss: number;
  lossHistory: Array<{ step: number; loss: number }>;
  paramCount: number;
  vocabSize: number;
  generatedText: string;
  isGenerating: boolean;
  trainingStartTime: number | null;
  /** Live weights from the training worker */
  liveWeights: ModelWeights | null;
  /** Model config from the training worker */
  liveConfig: ModelConfig | null;
  /** Current training step when snapshot was taken */
  snapshotStep: number;
  /** Whether training is actively running */
  isTraining: boolean;
  /** Error message from last failure */
  lastError: string | null;
}

interface TrainingActions {
  train: (text: string, config: ModelConfigState) => string | null;
  stop: () => void;
  reset: () => void;
  generate: (temperature: number, maxTokens: number) => void;
  exportLoss: () => void;
}

type TrainingContextValue = TrainingState & TrainingActions;

const TrainingContext = createContext<TrainingContextValue | null>(null);

export function TrainingBridgeProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  const [lossHistory, setLossHistory] = useState<{ step: number; loss: number }[]>([]);
  const [paramCount, setParamCount] = useState(0);
  const [vocabSize, setVocabSize] = useState(0);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // Live weights for visualizer
  const [liveWeights, setLiveWeights] = useState<ModelWeights | null>(null);
  const [liveConfig, setLiveConfig] = useState<ModelConfig | null>(null);
  const [snapshotStep, setSnapshotStep] = useState(0);

  const workerRef = useRef<Worker | null>(null);
  const lastTrainTime = useRef(0);

  const isTraining = status === 'training' || status === 'initializing';

  const train = useCallback((text: string, config: ModelConfigState): string | null => {
    if (!text.trim()) return 'No text provided';

    const now = Date.now();
    if (now - lastTrainTime.current < SECURITY_LIMITS.minTrainIntervalMs) return 'Too soon';
    lastTrainTime.current = now;

    const estimated = computeParamCount(
      { blockSize: config.blockSize, nLayer: config.nLayer, nHead: config.nHead, nEmbd: config.nEmbd },
      80
    );
    if (estimated > SECURITY_LIMITS.maxParamCount) {
      setLastError(`Model too large: ~${(estimated / 1e6).toFixed(1)}M params exceeds ${(SECURITY_LIMITS.maxParamCount / 1e6).toFixed(0)}M limit.`);
      return 'Too large';
    }

    // Terminate previous worker if any
    workerRef.current?.terminate();

    setStatus('initializing');
    setLossHistory([]);
    setCurrentStep(0);
    setCurrentLoss(0);
    setGeneratedText('');
    setTrainingStartTime(null);
    setLastError(null);

    const worker = new Worker(
      new URL('../worker/training.worker.ts', import.meta.url)
    );
    workerRef.current = worker;
    worker.postMessage({ type: 'init_gpu' });

    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'ready':
          setParamCount(msg.paramCount);
          setVocabSize(msg.vocabSize);
          setTrainingStartTime(Date.now());
          setStatus('training');
          break;
        case 'progress':
          setCurrentStep(msg.step);
          setCurrentLoss(msg.loss);
          setLossHistory((prev) => [...prev, { step: msg.step, loss: msg.loss }]);
          break;
        case 'complete':
          setStatus('complete');
          break;
        case 'generated':
          setGeneratedText(msg.text);
          setIsGenerating(false);
          break;
        case 'timeout':
          setStatus('error');
          setLastError(`Training step ${msg.step} exceeded timeout. Try a smaller model.`);
          worker.terminate();
          workerRef.current = null;
          break;
        case 'weights-snapshot':
          setLiveWeights(msg.weights);
          setLiveConfig(msg.config);
          setSnapshotStep(msg.step);
          break;
        case 'gpu-status':
          break;
        case 'error':
          setStatus('error');
          setLastError(msg.message);
          setIsGenerating(false);
          break;
      }
    };

    worker.onerror = (err) => {
      setStatus('error');
      setLastError(err.message);
    };

    const adamConfig: AdamConfig = {
      lr: config.lr,
      beta1: TRAINING_DEFAULTS.beta1,
      beta2: TRAINING_DEFAULTS.beta2,
      eps: TRAINING_DEFAULTS.eps,
      maxSteps: config.maxSteps,
    };

    const request: TrainRequest = {
      type: 'train',
      text,
      modelConfig: {
        blockSize: config.blockSize,
        nLayer: config.nLayer,
        nHead: config.nHead,
        nEmbd: config.nEmbd,
      },
      adamConfig,
    };
    worker.postMessage(request);

    return null;
  }, []);

  const stop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' });
  }, []);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('idle');
    setLossHistory([]);
    setCurrentStep(0);
    setCurrentLoss(0);
    setGeneratedText('');
    setTrainingStartTime(null);
    setLastError(null);
    setLiveWeights(null);
    setLiveConfig(null);
    setSnapshotStep(0);
  }, []);

  const generate = useCallback((temperature: number, maxTokens: number) => {
    if (!workerRef.current || (status !== 'complete' && status !== 'training')) return;
    setIsGenerating(true);
    setGeneratedText('');
    workerRef.current.postMessage({ type: 'generate', temperature, maxTokens });
  }, [status]);

  const exportLoss = useCallback(() => {
    if (lossHistory.length === 0) return;
    const csv = 'step,loss\n' + lossHistory.map((d) => `${d.step},${d.loss}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'training-loss.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [lossHistory]);

  // Cleanup worker on unmount (app close)
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return (
    <TrainingContext.Provider
      value={{
        status, currentStep, currentLoss, lossHistory, paramCount, vocabSize,
        generatedText, isGenerating, trainingStartTime, lastError,
        liveWeights, liveConfig, snapshotStep, isTraining,
        train, stop, reset, generate, exportLoss,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTrainingBridge(): TrainingContextValue {
  const ctx = useContext(TrainingContext);
  if (!ctx) throw new Error('useTrainingBridge must be used within TrainingBridgeProvider');
  return ctx;
}
