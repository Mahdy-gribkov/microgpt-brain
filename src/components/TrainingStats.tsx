'use client';

import { useEffect, useRef } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import type { TrainingStatus } from './Playground';

interface TrainingStatsProps {
  currentStep: number;
  totalSteps: number;
  currentLoss: number;
  paramCount: number;
  vocabSize: number;
  startTime: number | null;
  status: TrainingStatus;
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (v) =>
    decimals > 0 ? v.toFixed(decimals) : Math.round(v).toLocaleString()
  );
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    return display.on('change', (v) => {
      if (ref.current) ref.current.textContent = v;
    });
  }, [display]);

  return <span ref={ref}>{decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}</span>;
}

function StatCard({ label, children, color = 'text-text' }: { label: string; children: React.ReactNode; color?: string }) {
  return (
    <div className="flex-1 min-w-[80px] bg-bg rounded-lg p-2.5 border border-border">
      <div className="text-[10px] text-muted mb-0.5">{label}</div>
      <div className={`text-sm font-mono ${color}`}>{children}</div>
    </div>
  );
}

export function TrainingStats({ currentStep, totalSteps, currentLoss, paramCount, vocabSize, startTime, status }: TrainingStatsProps) {
  const isActive = status === 'training' || status === 'complete';
  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;
  const speed = elapsed > 0 && currentStep > 0 ? currentStep / elapsed : 0;
  const remaining = speed > 0 ? (totalSteps - currentStep) / speed : 0;

  const lossColor = currentLoss < 1.0 ? 'text-green-400' : currentLoss < 3.0 ? 'text-amber' : 'text-red-400';

  if (!isActive && status !== 'initializing') return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap gap-2"
    >
      <StatCard label="Step">
        <AnimatedNumber value={currentStep} /> / {totalSteps}
      </StatCard>
      <StatCard label="Loss" color={lossColor}>
        <AnimatedNumber value={currentLoss} decimals={3} />
      </StatCard>
      <StatCard label="Params">
        {(paramCount / 1000).toFixed(1)}K
      </StatCard>
      <StatCard label="Vocab">
        {vocabSize}
      </StatCard>
      {speed > 0 && (
        <StatCard label="Speed">
          {speed.toFixed(1)} steps/s
        </StatCard>
      )}
      {remaining > 0 && status === 'training' && (
        <StatCard label="ETA">
          {remaining < 60 ? `${Math.ceil(remaining)}s` : `${Math.ceil(remaining / 60)}m`}
        </StatCard>
      )}
    </motion.div>
  );
}
