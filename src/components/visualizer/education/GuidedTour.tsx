import { useFrame, useThree } from "@react-three/fiber";
import { useState, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
    target: THREE.Vector3;
    cameraPos: THREE.Vector3;
    title: string;
    description: string;
    formula?: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: new THREE.Vector3(0, -5, 0),
        cameraPos: new THREE.Vector3(0, 0, 22),
        title: "Overview",
        description: "You're looking at a transformer neural network. Data flows bottom-to-top: text goes in, predictions come out. Each layer refines the representation.",
    },
    {
        target: new THREE.Vector3(0, 0, 0),
        cameraPos: new THREE.Vector3(0, 5, 20),
        title: "Token Embedding",
        description: "Each character is mapped to a dense vector of numbers (the embedding). This is the model's internal representation of each token.",
        formula: "x = E[token_id] + P[position]",
    },
    {
        target: new THREE.Vector3(0, 8, 0),
        cameraPos: new THREE.Vector3(12, 12, 16),
        title: "RMSNorm",
        description: "Before each sub-layer, the activations are normalized. RMSNorm divides by the root-mean-square, keeping values stable during training.",
        formula: "x_norm = x / sqrt(mean(x^2) + eps)",
    },
    {
        target: new THREE.Vector3(0, 15, 0),
        cameraPos: new THREE.Vector3(15, 20, 15),
        title: "Multi-Head Attention",
        description: "The core mechanism. Each head projects the input into Query, Key, and Value vectors, then computes 'who should attend to whom'. Multiple heads capture different relationship types.",
        formula: "Attn(Q,K,V) = softmax(QK^T / sqrt(d_k)) V",
    },
    {
        target: new THREE.Vector3(0, 22, 0),
        cameraPos: new THREE.Vector3(-12, 25, 16),
        title: "Attention Patterns",
        description: "The colored arcs show attention weights. Bright arcs mean strong connections. Notice how later tokens attend to earlier ones (causal masking prevents looking ahead).",
    },
    {
        target: new THREE.Vector3(0, 30, 0),
        cameraPos: new THREE.Vector3(-15, 35, 15),
        title: "Feed-Forward Network",
        description: "A two-layer MLP expands the representation to 4x width, applies ReLU activation, then projects back. This is where the model 'thinks' about each position independently.",
        formula: "FFN(x) = W2 * ReLU(W1 * x)",
    },
    {
        target: new THREE.Vector3(0, 38, 0),
        cameraPos: new THREE.Vector3(10, 42, 18),
        title: "Residual Connections",
        description: "After each sub-layer, the original input is added back (skip connection). This lets gradients flow directly through the network, making deep models trainable.",
        formula: "output = x + sublayer(x)",
    },
    {
        target: new THREE.Vector3(0, 45, 0),
        cameraPos: new THREE.Vector3(0, 50, 20),
        title: "Output Layer",
        description: "The final layer projects back to vocabulary size and applies softmax to produce a probability distribution over every possible next character.",
        formula: "P(next) = softmax(W_out * h_final)",
    },
];

export default function GuidedTour({ isActive, onEnd }: { isActive: boolean; onEnd: () => void }) {
    const { camera, controls } = useThree();
    const [stepIndex, setStepIndex] = useState(0);

    // Reset when activated
    useEffect(() => {
        if (isActive) {
            setStepIndex(0);
        }
    }, [isActive]);

    useFrame((_state, delta) => {
        if (!isActive) return;

        const targetStep = TOUR_STEPS[stepIndex];

        // Smoothly interpolate camera position and lookAt
        camera.position.lerp(targetStep.cameraPos, delta * 2);

        // Move controls target (if orbit controls are used)
        const orbitControls = controls as unknown as { target: THREE.Vector3; update: () => void } | null;
        if (orbitControls) {
            orbitControls.target.lerp(targetStep.target, delta * 2);
            orbitControls.update();
        }
    });

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            onEnd();
        }
    };

    const handleBack = () => {
        if (stepIndex > 0) {
            setStepIndex(prev => prev - 1);
        }
    };

    // Keyboard navigation
    useEffect(() => {
        if (!isActive) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); handleNext(); }
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); handleBack(); }
            else if (e.key === 'Escape') { e.preventDefault(); onEnd(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isActive, stepIndex]);

    if (!isActive) return null;

    const current = TOUR_STEPS[stepIndex];

    return (
        <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
            <div className="absolute bottom-4 left-4 right-4 md:left-1/2 md:right-auto md:-translate-x-1/2 md:w-full md:max-w-2xl pointer-events-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-black/80 backdrop-blur-md border border-border p-4 md:p-6 rounded-xl text-white shadow-2xl"
                    >
                        <h3 className="text-lg md:text-2xl font-bold mb-2 text-amber-400">{current.title}</h3>
                        <p className="text-white/60 mb-2 text-sm md:text-lg leading-relaxed">{current.description}</p>

                        {current.formula && (
                            <p className="text-amber-500/60 font-mono text-xs md:text-sm mb-3 bg-white/5 px-3 py-1.5 rounded-lg inline-block">
                                {current.formula}
                            </p>
                        )}

                        <div className="flex justify-between items-center mt-4">
                            <div className="flex items-center gap-3">
                                <span className="text-xs md:text-sm text-white/30">Step {stepIndex + 1} / {TOUR_STEPS.length}</span>
                                <div className="flex gap-1">
                                    {TOUR_STEPS.map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-1.5 h-1.5 rounded-full transition-colors ${i === stepIndex ? 'bg-amber-400' : i < stepIndex ? 'bg-amber-600' : 'bg-white/10'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {stepIndex > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        aria-label="Previous tour step"
                                        className="px-4 py-2 border border-white/10 hover:border-white/20 rounded-lg text-sm text-white/60 hover:text-white transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                                    >
                                        Back
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    aria-label={stepIndex === TOUR_STEPS.length - 1 ? "Finish guided tour" : "Next tour step"}
                                    className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg font-semibold transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
                                >
                                    {stepIndex === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next"}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </Html>
    );
}
