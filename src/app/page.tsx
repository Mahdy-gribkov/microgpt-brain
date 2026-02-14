'use client';

import dynamic from 'next/dynamic';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Playground } from '../components/Playground';
import { GpuStatus } from '../components/GpuStatus';
import { useGpuDetector } from '../hooks/useGpuDetector';

const VisualizerSection = dynamic(() => import('../components/VisualizerSection'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center text-white/20 font-mono text-xs">
      Loading 3D Engine...
    </div>
  ),
});

// Chapter data for the scrollytelling sections
const CHAPTERS = [
  {
    number: 1,
    title: 'Tokenization',
    subtitle: 'Text to Numbers',
    description:
      'Before a neural network can process text, it needs numbers. A tokenizer converts each character into an integer ID. Our character-level tokenizer maps every unique character in your training text to an index.',
    tryIt: 'Type your name below and see how the model sees it — as a sequence of numbers.',
  },
  {
    number: 2,
    title: 'Embeddings',
    subtitle: 'Numbers to Vectors',
    description:
      'Each token ID is mapped to a dense vector (a list of numbers) called an embedding. These vectors start random and are learned during training. Position encodings are added so the model knows where each token sits in the sequence.',
    tryIt: 'Notice how similar characters end up with similar vectors after training. That similarity is learned, not programmed.',
  },
  {
    number: 3,
    title: 'Attention',
    subtitle: 'Who Attends to Whom?',
    description:
      'Self-attention is the core mechanism. Each token produces three vectors: Query (what am I looking for?), Key (what do I contain?), and Value (what do I output?). The dot product of Q and K determines how much each token "attends" to every other token. A causal mask ensures tokens can only look backward.',
    tryIt: 'Click different tokens in the 3D view to see what each one attends to. Bright arcs = strong attention.',
  },
  {
    number: 4,
    title: 'Transformer Block',
    subtitle: 'The Repeating Unit',
    description:
      'A transformer block combines Multi-Head Self-Attention (mixing information between tokens) with a Feed-Forward Network (processing each token independently). Residual connections and Layer Normalization keep gradients flowing and training stable.',
    tryIt: 'Watch data flow through one block: attention first, then FFN. The residual connection adds the input back.',
  },
  {
    number: 5,
    title: 'Stacking Layers',
    subtitle: 'Depth = Understanding',
    description:
      'The full model stacks multiple transformer blocks. Early layers learn simple patterns (common character pairs). Later layers learn complex patterns (word structure, grammar). More layers = deeper understanding, but slower training.',
    tryIt: 'The 3D scene shows all layers. Each platform is one transformer block. Particles flow upward through the stack.',
  },
  {
    number: 6,
    title: 'Training',
    subtitle: 'Teaching the Model',
    description:
      'Training is iterative: feed text in, predict the next character, compute how wrong the prediction was (cross-entropy loss), then nudge every weight slightly in the direction that reduces the error (gradient descent via Adam optimizer). Repeat hundreds of times.',
    tryIt: 'Paste some text below and hit Train. Watch the loss drop from ~4.6 (random guessing) toward convergence.',
  },
  {
    number: 7,
    title: 'Generation',
    subtitle: 'Sampling from Learned Patterns',
    description:
      'After training, the model can generate new text. It predicts a probability distribution over all possible next characters, then samples from it. Temperature controls randomness: low = safe and repetitive, high = creative and chaotic.',
    tryIt: 'Try generating after training. Slide the temperature up to see the model get more adventurous.',
  },
] as const;

function ChapterSection({
  chapter,
  children,
}: {
  chapter: (typeof CHAPTERS)[number];
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section
      ref={ref}
      id={`chapter-${chapter.number}`}
      className="relative min-h-screen flex flex-col justify-center py-16 px-4 md:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="max-w-4xl mx-auto w-full"
      >
        {/* Chapter header */}
        <div className="mb-8">
          <span className="text-[10px] font-mono text-amber/60 uppercase tracking-[0.3em]">
            Chapter {chapter.number}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-text mt-1">
            {chapter.title}
          </h2>
          <p className="text-lg text-amber/80 mt-1">{chapter.subtitle}</p>
        </div>

        {/* Explanation */}
        <p className="text-base md:text-lg text-muted leading-relaxed max-w-2xl mb-6">
          {chapter.description}
        </p>

        {/* Interactive widget area */}
        {children}

        {/* Try-it prompt */}
        <p className="text-sm text-amber/60 mt-6 italic">{chapter.tryIt}</p>
      </motion.div>
    </section>
  );
}

export default function Home() {
  const { available: gpuAvailable, gpuName } = useGpuDetector();

  const ch6Ref = useRef<HTMLElement>(null);
  const scrollToTraining = () => {
    ch6Ref.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="relative">
      {/* Hero */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4 text-center relative">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <GpuStatus available={gpuAvailable} gpuName={gpuName} />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-6">
            <span className="text-text">Build a </span>
            <span className="text-amber">GPT</span>
            <span className="text-muted"> from Scratch</span>
          </h1>

          <p className="text-lg md:text-xl text-muted max-w-2xl mx-auto mb-4">
            An interactive guide to the transformer architecture.{' '}
            <span className="text-amber">Train a real model in your browser.</span>{' '}
            Zero servers. Pure TypeScript.
          </p>

          <p className="text-xs text-muted/50 mb-8">
            Inspired by Karpathy&apos;s nanoGPT, 3Blue1Brown, and Distill.pub
          </p>

          <button
            onClick={scrollToTraining}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-dim via-amber to-amber-light text-bg font-semibold text-base shadow-lg shadow-amber/20 hover:shadow-amber/30 transition-shadow"
          >
            Start Learning
          </button>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8">
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-5 h-8 rounded-full border border-border flex items-start justify-center pt-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-muted" />
          </motion.div>
        </div>
      </section>

      {/* Chapter 1: Tokenization */}
      <ChapterSection chapter={CHAPTERS[0]}>
        <div className="card p-6">
          <p className="text-muted/50 text-sm font-mono">[Tokenizer widget coming in Phase 2]</p>
        </div>
      </ChapterSection>

      {/* Chapter 2: Embeddings */}
      <ChapterSection chapter={CHAPTERS[1]}>
        <div className="card p-6">
          <p className="text-muted/50 text-sm font-mono">[Embedding scatter plot coming in Phase 2]</p>
        </div>
      </ChapterSection>

      {/* Chapter 3: Attention — 3D Visualizer inline */}
      <ChapterSection chapter={CHAPTERS[2]}>
        <div className="w-full h-[500px] md:h-[700px] rounded-xl border border-border relative">
          <VisualizerSection />
        </div>
      </ChapterSection>

      {/* Chapter 4: Transformer Block */}
      <ChapterSection chapter={CHAPTERS[3]}>
        <div className="card p-6">
          <p className="text-muted/50 text-sm font-mono">
            The 3D view above shows one block in action. Scroll back up to interact with it.
          </p>
        </div>
      </ChapterSection>

      {/* Chapter 5: Stacking Layers */}
      <ChapterSection chapter={CHAPTERS[4]}>
        <div className="card p-6">
          <p className="text-muted/50 text-sm font-mono">
            The full stack is visible in the 3D scene. Each glowing platform is one transformer block.
          </p>
        </div>
      </ChapterSection>

      {/* Chapter 6: Training — full Playground sandbox */}
      <section
        ref={ch6Ref}
        id="chapter-6"
        className="relative py-16 px-4 md:px-8"
      >
        <div className="max-w-4xl mx-auto mb-8">
          <span className="text-[10px] font-mono text-amber/60 uppercase tracking-[0.3em]">
            Chapter 6
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-text mt-1">Training</h2>
          <p className="text-lg text-amber/80 mt-1">Teaching the Model</p>
          <p className="text-base md:text-lg text-muted leading-relaxed max-w-2xl mt-4 mb-2">
            {CHAPTERS[5].description}
          </p>
          <p className="text-sm text-amber/60 italic">{CHAPTERS[5].tryIt}</p>
        </div>

        <Playground />
      </section>

      {/* Chapter 7: Generation */}
      <ChapterSection chapter={CHAPTERS[6]}>
        <div className="card p-6">
          <p className="text-muted/50 text-sm font-mono">
            Generation controls are in the Playground above. Train first, then generate.
          </p>
        </div>
      </ChapterSection>

      {/* Footer */}
      <footer className="py-16 px-4 text-center border-t border-border">
        <p className="text-sm text-muted/60">
          Built by{' '}
          <a href="https://mahdygribkov.vercel.app" target="_blank" rel="noopener noreferrer" className="text-amber hover:underline">
            Mahdy Gribkov
          </a>
          {' '}| Inspired by{' '}
          <a href="https://github.com/karpathy/nanoGPT" target="_blank" rel="noopener noreferrer" className="text-amber/60 hover:underline">
            nanoGPT
          </a>
        </p>
      </footer>
    </main>
  );
}
