'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING } from '../lib/constants';

const STORAGE_KEY = 'microgpt-onboarded';

interface OnboardingOverlayProps {
  onStartTraining: () => void;
  onStartTour: () => void;
}

const steps = [
  {
    title: 'Welcome to microGPT Playground',
    body: 'Train a GPT-2 model from scratch, entirely in your browser. No servers, no API keys. Pure TypeScript and math.',
  },
  {
    title: 'How it works',
    body: 'Paste any text, pick a model size, and hit Train. The model learns character-by-character patterns using a transformer architecture with multi-head attention, RMSNorm, and AdamW.',
  },
  {
    title: 'Explore the internals',
    body: 'Scroll down to the 3D Neural Internals visualizer. Watch tokens flow through embedding, attention heads, feed-forward layers, and output probabilities in real-time.',
  },
];

export function OnboardingOverlay({ onStartTraining, onStartTour }: OnboardingOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot first-visit check
        setVisible(true);
      }
    } catch {
      // localStorage blocked
    }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // localStorage blocked
    }
  };

  const handleTraining = () => {
    dismiss();
    onStartTraining();
  };

  const handleTour = () => {
    dismiss();
    onStartTour();
  };

  if (!visible) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={SPRING.gentle}
          className="max-w-md w-full mx-4 bg-bg border border-border rounded-2xl p-8 shadow-2xl shadow-amber-500/5"
        >
          {/* Progress dots */}
          <div className="flex gap-2 mb-6 justify-center">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${i === step ? 'bg-amber-500' : i < step ? 'bg-amber-500/40' : 'bg-white/10'}`}
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-3">{current.title}</h2>
              <p className="text-white/60 leading-relaxed mb-6">{current.body}</p>
            </motion.div>
          </AnimatePresence>

          <div className="flex gap-3 justify-between items-center">
            {/* Skip button */}
            <button
              type="button"
              onClick={dismiss}
              className="text-xs text-white/30 hover:text-white/50 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 rounded"
            >
              Skip
            </button>

            <div className="flex gap-3">
              {!isLast ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                >
                  Next
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleTour}
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-white/70 hover:text-white hover:border-amber-500/50 font-medium text-sm transition-all min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  >
                    Guided Tour
                  </button>
                  <button
                    type="button"
                    onClick={handleTraining}
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                  >
                    Start Training
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
