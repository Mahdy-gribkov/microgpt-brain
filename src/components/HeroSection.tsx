'use client';

import { motion } from 'framer-motion';
import { GpuStatus } from './GpuStatus';
import { SPRING, STAGGER } from '../lib/constants';

interface HeroSectionProps {
  onScrollToPlayground: () => void;
  onStartTour?: () => void;
  gpuAvailable: boolean | null;
  gpuName: string;
}

const titleWords = ['micro', 'GPT', 'Playground'];

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER.normal },
  },
};

const wordVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: SPRING.gentle },
};

export function HeroSection({ onScrollToPlayground, gpuAvailable, gpuName }: HeroSectionProps) {
  return (
    <section className="min-h-[80vh] flex flex-col items-center justify-center px-4 text-center relative">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-3xl mx-auto"
      >
        <div className="flex items-center justify-center gap-3 mb-6">
          <GpuStatus available={gpuAvailable} gpuName={gpuName} />
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          {titleWords.map((word, i) => (
            <motion.span
              key={i}
              variants={wordVariants}
              className={i === 0 ? 'text-text' : i === 1 ? 'text-amber' : 'text-muted'}
            >
              {word}
            </motion.span>
          ))}
        </h1>

        <motion.p
          variants={wordVariants}
          className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-4"
        >
          Train a character-level GPT in your browser.{' '}
          <span className="text-amber">Zero servers. Zero API calls.</span>{' '}
          Pure TypeScript.
        </motion.p>

        <motion.p
          variants={wordVariants}
          className="text-sm text-muted/70 max-w-xl mx-auto mb-4 leading-relaxed"
        >
          This playground implements a complete GPT-2 architecture from scratch — tokenizer, transformer blocks
          with multi-head attention, RMSNorm, and an Adam optimizer — all running in a Web Worker.
          Paste any text, configure the model, and watch it learn character patterns in real time.
        </motion.p>

        <motion.p
          variants={wordVariants}
          className="text-xs text-muted/50 mb-8"
        >
          Inspired by Andrej Karpathy&apos;s nanoGPT, makemore, and the GPT-2 paper
        </motion.p>

        <div className="flex gap-4 justify-center">
          <motion.button
            variants={wordVariants}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onScrollToPlayground}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-dim via-amber to-amber-light text-bg font-semibold text-base shadow-lg shadow-amber/20 hover:shadow-amber/30 transition-shadow"
          >
            Start Training
          </motion.button>

          {onStartTour && (
            <motion.button
              variants={wordVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartTour}
              className="px-8 py-3 rounded-xl border border-muted/20 text-muted hover:text-text hover:border-amber/50 hover:bg-amber/5 font-semibold text-base transition-all backdrop-blur-sm"
            >
              Start Guided Tour
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-5 h-8 rounded-full border border-border flex items-start justify-center pt-1.5"
        >
          <div className="w-1 h-2 rounded-full bg-muted" />
        </motion.div>
      </motion.div>
    </section>
  );
}
