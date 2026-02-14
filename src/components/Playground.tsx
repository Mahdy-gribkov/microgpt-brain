'use client';

import { useState, useCallback, useEffect } from 'react';
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
import { ChallengeCards } from './ChallengeCards';
import { ToastContainer } from './ToastContainer';
import { useToasts } from '../hooks/useToasts';
import { useModelConfig } from '../hooks/useModelConfig';
import { useTrainingBridge, type TrainingStatus } from '../contexts/TrainingContext';

export type { TrainingStatus };

export function Playground() {
  const [text, setText] = useState('');
  const [educationOpen, setEducationOpen] = useState(false);

  const { toasts, addToast, dismissToast } = useToasts();
  const { config, activePreset, handlePresetSelect, updateConfig } = useModelConfig();
  const {
    status, currentStep, currentLoss, lossHistory,
    paramCount, vocabSize, generatedText, isGenerating,
    trainingStartTime, lastError, train, stop, reset, generate, exportLoss,
  } = useTrainingBridge();

  // Show errors as toasts
  useEffect(() => {
    if (lastError) {
      addToast(lastError, 'error');
    }
  }, [lastError, addToast]);

  const handleTrain = useCallback(() => {
    const err = train(text, config);
    if (err) addToast(err, 'error');
  }, [train, text, config, addToast]);

  const handleCopyText = useCallback(() => {
    addToast('Text copied to clipboard', 'success');
  }, [addToast]);

  // Keyboard shortcut: Ctrl+Space to train/stop
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        if (status === 'training' || status === 'initializing') {
          stop();
        } else if (status === 'idle' || status === 'complete' || status === 'error') {
          handleTrain();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [status, stop, handleTrain]);

  const isTraining = status === 'training' || status === 'initializing';

  return (
    <section className="py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold text-text">Playground</h2>
          <span className="hidden md:inline text-xs text-muted/60">(Ctrl+Space to train/stop)</span>
        </div>
        <EducationSidebar isOpen={educationOpen} onToggle={() => setEducationOpen(!educationOpen)} />
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <TextInput value={text} onChange={setText} disabled={isTraining} />
          <ModelPresets onSelect={handlePresetSelect} disabled={isTraining} activePreset={activePreset} />
          <ModelConfig config={config} onChange={updateConfig} disabled={isTraining} paramCount={paramCount} />
          <TrainingControls
            status={status}
            currentStep={currentStep}
            totalSteps={config.maxSteps}
            currentLoss={currentLoss}
            onTrain={handleTrain}
            onStop={stop}
            onReset={reset}
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

        <div className="space-y-6">
          <AnimatePresence>
            {lossHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <LossChart data={lossHistory} onExport={exportLoss} />
              </motion.div>
            )}
          </AnimatePresence>
          <ArchitectureDiagram nLayer={config.nLayer} nHead={config.nHead} nEmbd={config.nEmbd} />
          <GeneratePanel
            onGenerate={generate}
            generatedText={generatedText}
            isGenerating={isGenerating}
            disabled={status !== 'complete' && status !== 'training'}
            onCopyText={handleCopyText}
          />
          <ChallengeCards
            status={status}
            currentStep={currentStep}
            currentLoss={currentLoss}
            lossHistory={lossHistory}
            vocabSize={vocabSize}
          />
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </section>
  );
}
