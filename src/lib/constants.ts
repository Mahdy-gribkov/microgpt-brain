/** Default hyperparameters and theme constants */

export const THEME = {
  amber: '#d4943a',
  amberLight: '#e8b468',
  amberDim: '#a06b22',
  bg: '#0c0b0e',
  bgCard: '#141318',
  bgHover: '#1c1b22',
  text: '#e8e6f0',
  textMuted: '#9896a3',
  border: '#2a2833',
} as const;

export const MODEL_DEFAULTS = {
  blockSize: 64,
  nLayer: 4,
  nHead: 4,
  nEmbd: 64,
} as const;

export const TRAINING_DEFAULTS = {
  lr: 0.01,
  beta1: 0.85,
  beta2: 0.99,
  eps: 1e-8,
  maxSteps: 500,
} as const;

export const GENERATION_DEFAULTS = {
  maxTokens: 200,
  temperature: 0.8,
} as const;

export const SECURITY_LIMITS = {
  maxInputTextLength: 50_000,
  maxParamCount: 5_000_000,
  maxStepDurationMs: 30_000,
  minTrainIntervalMs: 500,
} as const;

export const SLIDER_RANGES = {
  nLayer: { min: 1, max: 8, step: 1 },
  nHead: { min: 1, max: 8, step: 1 },
  nEmbd: { min: 16, max: 256, step: 16 },
  blockSize: { min: 16, max: 128, step: 16 },
  lr: { min: 0.0001, max: 0.05, step: 0.0001 },
  maxSteps: { min: 100, max: 2000, step: 100 },
  temperature: { min: 0.1, max: 2.0, step: 0.1 },
  maxTokens: { min: 50, max: 500, step: 50 },
} as const;

export const MODEL_PRESETS = {
  tiny: { label: 'Tiny', nLayer: 2, nHead: 2, nEmbd: 32, blockSize: 32, desc: '~10K params' },
  small: { label: 'Small', nLayer: 4, nHead: 4, nEmbd: 64, blockSize: 64, desc: '~80K params' },
  medium: { label: 'Medium', nLayer: 6, nHead: 4, nEmbd: 128, blockSize: 64, desc: '~500K params' },
} as const;

export const HYPERPARAMETER_TOOLTIPS: Record<string, string> = {
  nLayer: 'Number of transformer blocks stacked sequentially. More layers = deeper understanding but slower training.',
  nHead: 'Number of attention heads per layer. Each head learns different relationships in the text.',
  nEmbd: 'Embedding dimension — the size of the internal representation vector. Must be divisible by nHead.',
  blockSize: 'Context window — how many characters the model can "see" at once when predicting the next character.',
  lr: 'Learning rate — how big each optimization step is. Too high = unstable, too low = slow convergence.',
  maxSteps: 'Total training iterations. More steps = better learning, but diminishing returns after convergence.',
  temperature: 'Controls randomness in generation. Low = predictable/repetitive, high = creative/chaotic.',
  maxTokens: 'Maximum number of characters to generate in one pass.',
};

export const INSPIRATIONS = [
  { name: 'nanoGPT', desc: 'Andrej Karpathy\'s minimal GPT implementation in PyTorch — the direct inspiration for this project.', url: 'https://github.com/karpathy/nanoGPT' },
  { name: 'makemore', desc: 'Character-level language modeling series by Karpathy — from bigrams to transformers.', url: 'https://github.com/karpathy/makemore' },
  { name: 'micrograd', desc: 'A tiny autograd engine — backpropagation over a DAG of scalar values.', url: 'https://github.com/karpathy/micrograd' },
  { name: 'GPT-2 Paper', desc: '"Language Models are Unsupervised Multitask Learners" — the architecture this implements.', url: 'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf' },
  { name: 'Attention Is All You Need', desc: 'The 2017 paper that introduced the Transformer architecture.', url: 'https://arxiv.org/abs/1706.03762' },
  { name: 'Karpathy\'s Neural Networks: Zero to Hero', desc: 'YouTube playlist walking through neural nets from scratch — the best way to learn.', url: 'https://www.youtube.com/playlist?list=PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ' },
] as const;

export const SOCIAL_LINKS = {
  portfolio: 'https://mahdygribkov.vercel.app',
  github: 'https://github.com/mahdy-gribkov',
  githubSporesec: 'https://github.com/spore-sec',
  githubBlip: 'https://github.com/mahdygr-blip',
  linkedin: 'https://www.linkedin.com/in/mahdy-gribkov',
  codepen: 'https://codepen.io/mahdy-gribkov',
  email: 'mahdygribkov@gmail.com',
} as const;

export const TECH_STACK = [
  'TypeScript', 'Next.js 16', 'React 19', 'WebGPU', 'Tailwind CSS', 'Framer Motion', 'Recharts', 'Web Workers',
] as const;

export const SPRING = {
  gentle: { type: 'spring' as const, stiffness: 100, damping: 20 },
  snappy: { type: 'spring' as const, stiffness: 300, damping: 30 },
  bouncy: { type: 'spring' as const, stiffness: 400, damping: 15 },
};

export const STAGGER = {
  fast: 0.05,
  normal: 0.08,
  slow: 0.12,
};
