import { useState, useRef, useCallback, useEffect } from 'react';
import { TRAINING_DEFAULTS, SECURITY_LIMITS } from '../lib/constants';
import { computeParamCount } from '../engine/model';
import type { WorkerResponse, TrainRequest } from '../worker/messages';
import type { AdamConfig } from '../engine/optimizer';
import type { ModelConfigState } from './useModelConfig';
import type { ModelConfig, ModelWeights } from '../lib/visualizer-types';

export type TrainingStatus = 'idle' | 'initializing' | 'training' | 'complete' | 'error';

interface UseTrainingWorkerReturn {
  status: TrainingStatus;
  currentStep: number;
  currentLoss: number;
  lossHistory: Array<{ step: number; loss: number }>;
  paramCount: number;
  vocabSize: number;
  generatedText: string;
  isGenerating: boolean;
  trainingStartTime: number | null;
  train: (text: string, config: ModelConfigState) => string | null;
  stop: () => void;
  reset: () => void;
  generate: (temperature: number, maxTokens: number) => void;
  exportLoss: () => void;
}

interface SnapshotCallback {
  (weights: ModelWeights, config: ModelConfig, step: number): void;
}

export function useTrainingWorker(
  addToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  onWeightsSnapshot?: SnapshotCallback,
): UseTrainingWorkerReturn {
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  const [lossHistory, setLossHistory] = useState<{ step: number; loss: number }[]>([]);
  const [paramCount, setParamCount] = useState(0);
  const [vocabSize, setVocabSize] = useState(0);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [trainingStartTime, setTrainingStartTime] = useState<number | null>(null);

  const workerRef = useRef<Worker | null>(null);
  const lastTrainTime = useRef(0);
  const snapshotCbRef = useRef(onWeightsSnapshot);
  useEffect(() => {
    snapshotCbRef.current = onWeightsSnapshot;
  }, [onWeightsSnapshot]);

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
      addToast(`Model too large: ~${(estimated / 1e6).toFixed(1)}M params exceeds ${(SECURITY_LIMITS.maxParamCount / 1e6).toFixed(0)}M limit.`, 'error');
      return 'Too large';
    }

    setStatus('initializing');
    setLossHistory([]);
    setCurrentStep(0);
    setCurrentLoss(0);
    setGeneratedText('');
    setTrainingStartTime(null);

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
          addToast(`Training step ${msg.step} exceeded timeout. Try a smaller model.`, 'error');
          worker.terminate();
          workerRef.current = null;
          break;
        case 'weights-snapshot':
          snapshotCbRef.current?.(msg.weights, msg.config, msg.step);
          break;
        case 'gpu-status':
          break;
        case 'error':
          setStatus('error');
          addToast(msg.message, 'error');
          setIsGenerating(false);
          break;
      }
    };

    worker.onerror = (err) => {
      setStatus('error');
      addToast(err.message, 'error');
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

    return null; // success
  }, [addToast]);

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
    addToast('Loss data exported as CSV', 'success');
  }, [lossHistory, addToast]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  return {
    status,
    currentStep,
    currentLoss,
    lossHistory,
    paramCount,
    vocabSize,
    generatedText,
    isGenerating,
    trainingStartTime,
    train,
    stop,
    reset,
    generate,
    exportLoss,
  };
}
