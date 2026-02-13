'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING } from '../lib/constants';

interface EducationSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface SectionData {
  title: string;
  content: string;
}

const sections: SectionData[] = [
  {
    title: 'Character-Level Tokenization',
    content:
      'Unlike GPT-4 which uses BPE (byte-pair encoding) with ~100K tokens, this model tokenizes at the character level. Each unique character (a, b, !, space, etc.) gets an integer ID. The vocabulary is tiny — typically 30–80 tokens — which makes the model small enough to train in your browser. The tradeoff: the model must learn spelling from scratch and needs longer context windows to capture word-level patterns.',
  },
  {
    title: 'Transformer Architecture',
    content:
      'Each transformer block has two sub-layers: (1) Multi-Head Self-Attention — each head computes Q, K, V projections and finds which previous characters are relevant to predicting the next one. Multiple heads learn different relationship patterns. (2) Feed-Forward Network — a two-layer MLP (expand 4×, ReLU, project back) that processes each position independently. Both sub-layers use residual connections (add input back to output) and RMSNorm for training stability.',
  },
  {
    title: 'Training Loop',
    content:
      'Each step: (1) Forward pass — sample a random chunk of text, run it through the model, compute cross-entropy loss between predictions and actual next characters. (2) Backward pass — backpropagate gradients through every layer using the chain rule. (3) Optimizer step — Adam updates each parameter using its gradient, plus momentum (running mean of gradients) and adaptive learning rates (running mean of squared gradients). Learning rate decays linearly to zero over training.',
  },
  {
    title: 'Reading the Loss Curve',
    content:
      'The loss measures how surprised the model is by the next character (cross-entropy, in nats). At the start, loss ≈ ln(vocab_size) — pure random guessing. A steadily decreasing curve means the model is learning patterns. Flattening = convergence, the model has learned what it can given its size. Spiking up = instability, try a lower learning rate. Final loss < 1.0 usually means the model is memorizing; 1.0–2.0 means good generalization for this scale.',
  },
];

function CollapsibleSection({ section }: { section: SectionData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-3 text-left text-sm font-medium text-text hover:text-amber transition-colors"
      >
        {section.title}
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-muted text-xs"
        >
          &#9660;
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={SPRING.snappy}
            className="overflow-hidden"
          >
            <p className="text-xs text-muted leading-relaxed pb-3">
              {section.content}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function EducationSidebar({ isOpen, onToggle }: EducationSidebarProps) {
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="px-3 py-1.5 text-xs rounded-full border border-border text-muted hover:text-amber hover:border-amber transition-colors"
      >
        {isOpen ? 'Hide' : '(?) Learn'}
      </button>

      {/* Sidebar content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -20, width: 0 }}
            transition={SPRING.snappy}
            className="card overflow-hidden"
          >
            <h3 className="text-sm font-medium text-text mb-3">How It Works</h3>
            <div className="space-y-0">
              {sections.map((section) => (
                <CollapsibleSection key={section.title} section={section} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
