"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Visualizer from "@/components/visualizer/Visualizer";
import InputBar from "@/components/visualizer/InputBar";
import Sidebar from "@/components/visualizer/Sidebar";
import { runInference } from "@/engine/visualizer-model";
import { Tokenizer } from "@/engine/visualizer-tokenizer";
import type { InferenceTrace, ModelConfig, ModelWeights } from "@/lib/visualizer-types";
import { useInView } from "framer-motion";
import { useTrainingBridge } from "@/contexts/TrainingContext";

interface VisualizerSectionProps {
    startTour?: boolean;
}

type WeightSource = 'demo' | 'live';

const DEFAULT_INPUT = "The cat sat on";

export default function VisualizerSection({ startTour }: VisualizerSectionProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    // Track current visibility (canvas mounts/unmounts with scroll)
    const isInView = useInView(sectionRef, { margin: "-50px" });

    // Demo (pretrained) weights
    const [demoWeights, setDemoWeights] = useState<ModelWeights | null>(null);
    const [demoConfig, setDemoConfig] = useState<ModelConfig | null>(null);

    const [trace, setTrace] = useState<InferenceTrace | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [temperature, setTemperature] = useState(1.0);
    const [topK, setTopK] = useState(5);
    const lastInputRef = useRef("");
    const [hasLoaded, setHasLoaded] = useState(false);

    // Live training weights from context
    const { liveWeights, liveConfig, snapshotStep, isTraining } = useTrainingBridge();

    // Auto-switch to live when training, fallback to demo
    const [preferredSource, setPreferredSource] = useState<WeightSource>('demo');
    const activeSource: WeightSource = preferredSource === 'live' && liveWeights ? 'live' : 'demo';

    const weights = activeSource === 'live' ? liveWeights : demoWeights;
    const modelConfig = activeSource === 'live' ? liveConfig : demoConfig;

    // Auto-switch when training starts/stops
    useEffect(() => {
        if (isTraining && liveWeights) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external flag
            setPreferredSource('live');
        }
    }, [isTraining, liveWeights]);

    // Load demo weights only when in view
    useEffect(() => {
        if (isInView && !hasLoaded) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot load guard
            setHasLoaded(true);
            fetch("/pretrained-weights.json")
                .then((res) => res.json())
                .then((data: { config: ModelConfig; weights: ModelWeights }) => {
                    setDemoConfig(data.config);
                    setDemoWeights(data.weights);
                })
                .catch((err: unknown) => console.error("Failed to load visualizer weights:", err));
        }
    }, [isInView, hasLoaded]);

    // Auto-run inference with default text when demo weights first load
    const hasAutoRun = useRef(false);
    useEffect(() => {
        if (demoWeights && demoConfig && !hasAutoRun.current && !trace) {
            hasAutoRun.current = true;
            lastInputRef.current = DEFAULT_INPUT;
            try {
                const tokenizer = new Tokenizer(demoConfig.chars);
                const tokenIds = tokenizer.encode(DEFAULT_INPUT);
                const tokens = DEFAULT_INPUT.split("");
                const result = runInference(tokens, tokenIds, demoConfig, demoWeights, { temperature, topK });
                result.predictedToken = tokenizer.decode([result.predictedTokenId]);
                // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-inference on weight load
                setTrace(result);
            } catch (e) {
                console.error("Auto-inference failed:", e);
            }
        }
    }, [demoWeights, demoConfig, trace, temperature, topK]);

    // Auto re-run inference when live weights update during training
    const prevSnapshotStep = useRef(0);
    useEffect(() => {
        if (activeSource === 'live' && snapshotStep !== prevSnapshotStep.current && lastInputRef.current && weights && modelConfig) {
            prevSnapshotStep.current = snapshotStep;
            const text = lastInputRef.current;
            const tokenizer = new Tokenizer(modelConfig.chars);
            const tokenIds = tokenizer.encode(text);
            const tokens = text.split("");
            const result = runInference(tokens, tokenIds, modelConfig, weights, { temperature, topK });
            result.predictedToken = tokenizer.decode([result.predictedTokenId]);
            setTrace(result);
        }
    }, [activeSource, snapshotStep, weights, modelConfig, temperature, topK]);

    const handleProcess = useCallback(async (text: string, skipDelay = false) => {
        if (!weights || !modelConfig) return;

        lastInputRef.current = text;
        setIsProcessing(true);

        if (!skipDelay) {
            setTrace(null);
            await new Promise(r => setTimeout(r, 100));
        }

        try {
            const tokenizer = new Tokenizer(modelConfig.chars);
            const tokenIds = tokenizer.encode(text);
            const tokens = text.split("");

            const result = runInference(tokens, tokenIds, modelConfig, weights, { temperature, topK });
            result.predictedToken = tokenizer.decode([result.predictedTokenId]);

            setTrace(result);
            setIsProcessing(false);
        } catch (e) {
            console.error("Visualizer Inference failed", e);
            setIsProcessing(false);
        }
    }, [weights, modelConfig, temperature, topK]);

    const handleParamsChange = useCallback((newTemp: number, newTopK: number) => {
        setTemperature(newTemp);
        setTopK(newTopK);
        // Re-run inference with new params after state update
        if (lastInputRef.current && weights && modelConfig) {
            // Defer to next tick so state is updated
            setTimeout(() => {
                const text = lastInputRef.current;
                if (!text) return;
                const tokenizer = new Tokenizer(modelConfig.chars);
                const tokenIds = tokenizer.encode(text);
                const tokens = text.split("");
                const result = runInference(tokens, tokenIds, modelConfig, weights, { temperature: newTemp, topK: newTopK });
                result.predictedToken = tokenizer.decode([result.predictedTokenId]);
                setTrace(result);
            }, 0);
        }
    }, [weights, modelConfig]);

    return (
        <section ref={sectionRef} className="relative w-full h-[600px] md:h-[900px] border-y border-white/5 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            {/* Header / Title Overlay */}
            <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex flex-col items-center pt-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-amber-500/80 mb-4 tracking-widest uppercase">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSource === 'live' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                    {activeSource === 'live' ? `Live Training · Step ${snapshotStep}` : 'Demo Inference Engine'}
                </div>
                <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 mb-4 drop-shadow-[0_0_15px_rgba(212,148,58,0.3)] text-center">
                    Neural Internals
                </h2>
                <p className="text-white/40 max-w-lg text-center text-sm leading-relaxed">
                    {activeSource === 'live'
                        ? 'Watching your model learn in real-time. Weights update every 50 training steps.'
                        : 'Peer inside the transformer architecture. Watch tokens flow through attention heads and MLP layers in real-time.'}
                </p>
                {/* Source toggle */}
                {liveWeights && (
                    <div className="pointer-events-auto mt-3 flex gap-1 rounded-full bg-white/5 border border-white/10 p-0.5" role="group" aria-label="Weight source">
                        <button
                            type="button"
                            onClick={() => setPreferredSource('demo')}
                            aria-pressed={activeSource === 'demo'}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${activeSource === 'demo' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}
                        >
                            Demo
                        </button>
                        <button
                            type="button"
                            onClick={() => setPreferredSource('live')}
                            aria-pressed={activeSource === 'live'}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 ${activeSource === 'live' ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:text-white/60'}`}
                        >
                            Live
                        </button>
                    </div>
                )}
            </div>

            {isInView ? (
                <>
                    <div className="absolute inset-0 z-0">
                        <Visualizer trace={trace} processing={isProcessing} startTour={startTour} />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
                        {/* Sidebar (Right HUD) - hidden on mobile */}
                        <div className="hidden md:block absolute right-0 top-0 h-full w-full max-w-md pointer-events-none">
                            <div className="pointer-events-auto h-full p-6 flex flex-col justify-center">
                                <Sidebar
                                    trace={trace}
                                    currentStep={0}
                                    hoveredLayer={null}
                                    temperature={temperature}
                                    topK={topK}
                                    onParamsChange={handleParamsChange}
                                />
                            </div>
                        </div>

                        {/* Input Bar (Bottom Command Deck) */}
                        <div className="pointer-events-auto w-full pb-12 flex justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-20">
                            <div className="w-full max-w-3xl px-6">
                                <InputBar onProcess={(t) => handleProcess(t)} isProcessing={isProcessing} />
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20 font-mono text-xs uppercase tracking-widest">
                    [ Scroll to Initialize Neural Engine ]
                </div>
            )}
        </section>
    );
}
