"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Visualizer from "@/components/visualizer/Visualizer";
import InputBar from "@/components/visualizer/InputBar";
import Sidebar from "@/components/visualizer/Sidebar";
import { runInference } from "@/engine/visualizer-model";
import { Tokenizer } from "@/engine/visualizer-tokenizer";
import type { InferenceTrace, ModelConfig, ModelWeights } from "@/lib/visualizer-types";
import { useTrainingBridge } from "@/contexts/TrainingContext";

type WeightSource = 'demo' | 'live';

const DEFAULT_INPUT = "The cat sat on";

export default function VisualizerSection() {

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

    // Load demo weights on mount
    useEffect(() => {
        if (!hasLoaded) {
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
    }, [hasLoaded]);

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
        <div className="relative w-full h-full">
            {/* 3D Canvas */}
            <div className="absolute inset-0 z-0">
                <Visualizer trace={trace} processing={isProcessing} />
            </div>

            {/* Controls Overlay */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-end">
                {/* Status badge */}
                <div className="absolute top-3 left-3 pointer-events-none">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-[10px] font-mono text-amber-500/80 tracking-widest uppercase">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeSource === 'live' ? 'bg-green-500' : 'bg-amber-500'} animate-pulse`} />
                        {activeSource === 'live' ? `Live · Step ${snapshotStep}` : 'Demo'}
                    </div>
                </div>

                {/* Source toggle (only when live weights available) */}
                {liveWeights && (
                    <div className="absolute top-3 right-3 pointer-events-auto">
                        <div className="flex gap-1 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 p-0.5" role="group" aria-label="Weight source">
                            <button
                                type="button"
                                onClick={() => setPreferredSource('demo')}
                                aria-pressed={activeSource === 'demo'}
                                className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-colors min-h-[44px] ${activeSource === 'demo' ? 'bg-amber-500/20 text-amber-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Demo
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreferredSource('live')}
                                aria-pressed={activeSource === 'live'}
                                className={`px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider transition-colors min-h-[44px] ${activeSource === 'live' ? 'bg-green-500/20 text-green-400' : 'text-white/40 hover:text-white/60'}`}
                            >
                                Live
                            </button>
                        </div>
                    </div>
                )}

                {/* Sidebar (Right HUD) - hidden on mobile */}
                <div className="hidden md:block absolute right-0 top-12 bottom-16 w-full max-w-xs pointer-events-none">
                    <div className="pointer-events-auto h-full p-4 flex flex-col justify-center">
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

                {/* Input Bar (Bottom) */}
                <div className="pointer-events-auto w-full pb-4 flex justify-center bg-gradient-to-t from-black/80 to-transparent pt-8">
                    <div className="w-full max-w-2xl px-4">
                        <InputBar onProcess={(t) => handleProcess(t)} isProcessing={isProcessing} />
                    </div>
                </div>
            </div>
        </div>
    );
}
