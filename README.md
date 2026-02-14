# MicroGPT Playground

A browser-based, educational implementation of a GPT (Generative Pre-trained Transformer) running entirely client-side using **Web Workers** and **WebGPU**.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Next.js](https://img.shields.io/badge/Next.js-16-black)

## Overview

This project allows users to:
1. **Train** a character-level GPT model in the browser on custom text.
2. **Visualize** the internal activations, attention scores, and token flow in 3D.
3. **Generate** text in real-time.
4. **Watch the model learn** via live weight snapshots bridged to the 3D visualizer.

All training happens locally. Your data never leaves your device. Deployed on Vercel with automatic HTTPS.

## Features

- **Zero-Server Training:** All computation is client-side. No API keys, no backend.
- **Web Worker Engine:** Custom auto-grad and transformer engine in pure TypeScript.
- **3D Neural Internals:** Interactive visualizer using React Three Fiber to peer inside the model.
- **Live Training Bridge:** Weight snapshots every 50 steps feed into the 3D visualizer in real-time.
- **Guided Tour:** 8-step interactive tour explaining each transformer component with formulas.
- **Gamified Challenges:** Track your training progress with achievement cards.
- **First-Visit Onboarding:** Overlay explains what the playground does and how to use it.
- **WebGPU Detection:** Falls back to CPU automatically if WebGPU is unavailable.
- **Security Hardened:** CSP headers, input sanitization, prototype pollution prevention.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5.7 (strict mode, zero `any`)
- **3D Library:** React Three Fiber (Three.js) + post-processing
- **Styling:** Tailwind CSS v4
- **State Management:** React Hooks + Web Worker messaging + React Context
- **Icons:** Lucide React
- **Animation:** Framer Motion

## Installation & Usage

1. **Clone the repository:**
    ```bash
    git clone https://github.com/mahdy-gribkov/microgpt-playground.git
    cd microgpt-playground
    ```

2. **Install dependencies:**
    ```bash
    npm install
    ```

3. **Run the development server:**
    ```bash
    npm run dev
    ```

4. **Open locally:**
    Visit `http://localhost:3000` in your browser. (HTTPS is automatic in production on Vercel.)

5. **Deploy to Vercel:**
    ```bash
    npx vercel
    ```

## Architecture

### Core Engine (`src/engine/`)
- `model.ts`: GPT architecture (Transformer Block, Causal Self-Attention, MLP, RMSNorm).
- `tensor.ts` + `tensor-ops-cpu.ts`: Lightweight tensor library with CPU matrix operations.
- `optimizer.ts`: AdamW optimizer implementation.
- `weight-bridge.ts`: Converts training tensors to visualizer weight format.
- `grad-check.ts`: Numerical gradient verification (dev only).

### Web Worker (`src/worker/`)
- `training.worker.ts`: Off-main-thread training loop with weight snapshot posting.
- `messages.ts`: Strictly typed message passing between UI and Worker.

### Visualizer (`src/components/visualizer/`)
- `Visualizer.tsx`: Main 3D canvas with post-processing (Bloom, Vignette, ChromaticAberration).
- `TransformerScene.tsx`: Renders stacked transformer layers with loading state.
- `ParticleFlow.tsx`: Particle system visualizing data flow.
- `GuidedTour.tsx`: 8-step interactive tour with keyboard navigation.
- `ComponentInspector.tsx`: Click any 3D component to see its math and current state.

### Hooks (`src/hooks/`)
- `useTrainingWorker.ts`: Worker lifecycle, state management, weight snapshots.
- `useModelConfig.ts`: Model configuration and presets.
- `useToasts.ts`: Toast notification management.

## Troubleshooting

**Onboarding overlay not showing?**
Run in browser console: `localStorage.removeItem('microgpt-onboarded')` then refresh.

**GPU not detected?**
The app falls back to CPU automatically. WebGPU requires Chrome 113+ or Edge 113+.

**3D visualizer shows only particles?**
Wait for pretrained weights to load. The full transformer architecture renders after auto-inference completes.

**Training seems slow?**
Try the "Tiny" preset first. Larger models (>100K params) take longer on CPU.

## Contributing

1. Fork the repo.
2. Create a feature branch: `git checkout -b feature/amazing-feature`.
3. Commit changes: `git commit -m 'feat: Add amazing feature'`.
4. Push to branch: `git push origin feature/amazing-feature`.
5. Open a Pull Request.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

---

*Built by Mahdy Gribkov*
