'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { TrainingStatus } from '../hooks/useTrainingWorker';
import { SPRING } from '../lib/constants';

interface Challenge {
  id: string;
  title: string;
  description: string;
  check: (ctx: ChallengeContext) => boolean;
}

interface ChallengeContext {
  status: TrainingStatus;
  currentStep: number;
  currentLoss: number;
  lossHistory: Array<{ step: number; loss: number }>;
  vocabSize: number;
}

interface ChallengeCardsProps extends ChallengeContext {
  className?: string;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'first-train',
    title: 'Hello World',
    description: 'Start your first training run',
    check: ({ status }) => status === 'training' || status === 'complete',
  },
  {
    id: 'loss-below-3',
    title: 'Getting Warmer',
    description: 'Reach a loss below 3.0',
    check: ({ currentLoss }) => currentLoss > 0 && currentLoss < 3.0,
  },
  {
    id: 'loss-below-2',
    title: 'Pattern Seeker',
    description: 'Reach a loss below 2.0',
    check: ({ currentLoss }) => currentLoss > 0 && currentLoss < 2.0,
  },
  {
    id: 'loss-below-1',
    title: 'Memorizer',
    description: 'Reach a loss below 1.0',
    check: ({ currentLoss }) => currentLoss > 0 && currentLoss < 1.0,
  },
  {
    id: 'complete-run',
    title: 'Full Course',
    description: 'Complete a full training run',
    check: ({ status }) => status === 'complete',
  },
  {
    id: 'big-vocab',
    title: 'Linguist',
    description: 'Train on text with 40+ unique characters',
    check: ({ vocabSize }) => vocabSize > 40,
  },
];

export function ChallengeCards({ className, ...ctx }: ChallengeCardsProps) {
  const completed = useMemo(
    () => CHALLENGES.filter((c) => c.check(ctx)),
    [ctx],
  );

  const completedIds = useMemo(() => new Set(completed.map((c) => c.id)), [completed]);

  return (
    <div className={`card ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text">Challenges</h3>
        <span className="text-[10px] font-mono text-amber-500/80">
          {completed.length}/{CHALLENGES.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {CHALLENGES.map((challenge) => {
          const done = completedIds.has(challenge.id);
          return (
            <motion.div
              key={challenge.id}
              layout
              transition={SPRING.snappy}
              className={`relative px-3 py-2 rounded-lg border text-left transition-colors ${
                done
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-white/5 bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`text-xs ${done ? 'text-amber-400' : 'text-white/20'}`}>
                  {done ? '\u2713' : '\u25CB'}
                </span>
                <span className={`text-xs font-medium ${done ? 'text-amber-300' : 'text-white/50'}`}>
                  {challenge.title}
                </span>
              </div>
              <p className="text-[10px] text-white/30 leading-snug pl-4">
                {challenge.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
