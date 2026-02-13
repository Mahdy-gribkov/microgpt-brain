'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TextInput } from './TextInput';
import { ModelConfig } from './ModelConfig';
import { ModelPresets } from './ModelPresets';
import { TrainingControls } from './TrainingControls';
import { TrainingStats } from './TrainingStats';
import { LossChart } from './LossChart';
import { GeneratePanel } from './GeneratePanel';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { EducationSidebar } from './EducationSidebar';
import { ToastContainer, type Toast } from './ToastContainer';
import { MODEL_DEFAULTS, TRAINING_DEFAULTS, SECURITY_LIMITS, MODEL_PRESETS } from '../lib/constants';
import { computeParamCount } from '../engine/model';
import type { WorkerResponse, TrainRequest } from '../worker/messages';
import type { AdamConfig } from '../engine/optimizer';
import { useGpuDetector } from '../hooks/useGpuDetector';

export type TrainingStatus = 'idle' | 'initializing' | 'training' | 'complete' | 'error';

interface ModelConfigState {
  nLayer: number;
  nHead: number;
  nEmbd: number;
  blockSize: number;
  lr: number;
  maxSteps: number;
}

export function Playground() {
  const [text, setText] = useState('');
  const [config, setConfig] = useState<ModelConfigState>({
    nLayer: MODEL_DEFAULTS.nLayer,
    nHead: MODEL_DEFAULTS.nHead,
    nEmbd: MODEL_DEFAULTS.nEmbd,
    blockSize: MODEL_DEFAULTS.blockSize,
    lr: TRAINING_DEFAULTS.lr,
    maxSteps: TRAINING_DEFAULTS.maxSteps,
  });
  const [status, setStatus] = useState<TrainingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [currentLoss, setCurrentLoss] = useState(0);
  const [lossHistory, setLossHistory] = useState<{ step: number; loss: number }[]>([]);
  const [paramCount, setParamCount] = useState(0);
  const [vocabSize, setVocabSize] = useState(0);
  const [generatedText, setGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { available: gpuAvailable, gpuName } = useGpuDetector();
  const [educationOpen, setEducationOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('small');
  const [trainingStartTime, setTrainingStartTime] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const workerRef = useRef<Worker | null>(null);
  const lastTrainTime = useRef(0);

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handlePresetSelect = useCallback((preset: { nLayer: number; nHead: number; nEmbd: number; blockSize: number }) => {
    setConfig((prev) => ({
      ...prev,
      ...preset,
    }));
    const entry = Object.entries(MODEL_PRESETS).find(
      ([, v]) => v.nLayer === preset.nLayer && v.nHead === preset.nHead && v.nEmbd === preset.nEmbd
    );
    setActivePreset(entry ? entry[0] : null);
  }, []);

  const handleExportLoss = useCallback(() => {
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

  const handleTrain = useCallback(() => {
    if (!text.trim()) return;

    const now = Date.now();
    if (now - lastTrainTime.current < SECURITY_LIMITS.minTrainIntervalMs) return;
    lastTrainTime.current = now;

    const estimated = computeParamCount(
      { blockSize: config.blockSize, nLayer: config.nLayer, nHead: config.nHead, nEmbd: config.nEmbd },
      80
    );
    if (estimated > SECURITY_LIMITS.maxParamCount) {
      addToast(`Model too large: ~${(estimated / 1e6).toFixed(1)}M params exceeds ${(SECURITY_LIMITS.maxParamCount / 1e6).toFixed(0)}M limit.`, 'error');
      return;
    }

    setStatus('initializing');
    setLossHistory([]);
    setCurrentStep(0);
    setCurrentLoss(0);
    setGeneratedText('');
    setTrainingStartTime(null);

    const worker = new Worker(
      new URL('../worker/training.worker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    // Initialize GPU safely
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
          addToast(`Training step ${msg.step} exceeded 30s timeout. Try a smaller model.`, 'error');
          worker.terminate();
          workerRef.current = null;
          break;
        case 'gpu-status':
          // GPU status is now handled by the useGpuDetector hook globally
          // We can log it or specific worker metrics here if needed
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
  }, [text, config, addToast]);

  const handleStop = useCallback(() => {
    workerRef.current?.postMessage({ type: 'stop' });
  }, []);

  const handleReset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus('idle');
    setLossHistory([]);
    setCurrentStep(0);
    setCurrentLoss(0);
    setGeneratedText('');
    setTrainingStartTime(null);
  }, []);

  const handleGenerate = useCallback((temperature: number, maxTokens: number) => {
    if (!workerRef.current || (status !== 'complete' && status !== 'training')) return;
    setIsGenerating(true);
    setGeneratedText('');
    workerRef.current.postMessage({
      type: 'generate',
      temperature,
      maxTokens,
    });
  }, [status]);

  const handleCopyText = useCallback(() => {
    addToast('Text copied to clipboard', 'success');
  }, [addToast]);

  // Keyboard shortcut: Ctrl+Space to train/stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (status === 'training' || status === 'initializing') {
          handleStop();
        } else if (status === 'idle' || status === 'complete' || status === 'error') {
          handleTrain();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, handleStop, handleTrain]);

  const isTraining = status === 'training' || status === 'initializing';

  return (
    <section className="py-8 px-4 md:px-8">
      {/* Playground header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-text">Playground</h2>
          <span className="hidden md:inline text-xs text-muted/60">(Ctrl+Space to train/stop)</span>
        </div>
        <EducationSidebar isOpen={educationOpen} onToggle={() => setEducationOpen(!educationOpen)} />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Input + Config + Controls */}
        <div className="space-y-6">
          <TextInput
            value={text}
            onChange={setText}
            disabled={isTraining}
          />

          <ModelPresets
            onSelect={handlePresetSelect}
            disabled={isTraining}
            activePreset={activePreset}
          />

          <ModelConfig
            config={config}
            onChange={(c) => {
              setConfig(c);
              setActivePreset(null);
            }}
            disabled={isTraining}
            paramCount={paramCount}
          />

          <TrainingControls
            status={status}
            currentStep={currentStep}
            totalSteps={config.maxSteps}
            currentLoss={currentLoss}
            onTrain={handleTrain}
            onStop={handleStop}
            onReset={handleReset}
            disabled={!text.trim()}
          />

          <TrainingStats
            currentStep={currentStep}
            totalSteps={config.maxSteps}
            currentLoss={currentLoss}
            paramCount={paramCount}
            vocabSize={vocabSize}
            startTime={trainingStartTime}
            status={status}
          />
        </div>

        {/* Right column: Chart + Architecture + Generate */}
        <div className="space-y-6">
          <AnimatePresence>
            {lossHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <LossChart data={lossHistory} onExport={handleExportLoss} />
              </motion.div>
            )}
          </AnimatePresence>

          <ArchitectureDiagram
            nLayer={config.nLayer}
            nHead={config.nHead}
            nEmbd={config.nEmbd}
          />

          <GeneratePanel
            onGenerate={handleGenerate}
            generatedText={generatedText}
            isGenerating={isGenerating}
            disabled={status !== 'complete' && status !== 'training'}
            onCopyText={handleCopyText}
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
