"use client";

import { useState, useEffect, useRef } from "react";
import Visualizer from "@/components/visualizer/Visualizer";
import InputBar from "@/components/visualizer/InputBar";
import Sidebar from "@/components/visualizer/Sidebar";
import { runInference } from "@/engine/visualizer-model";
import { Tokenizer } from "@/engine/visualizer-tokenizer";
import { InferenceTrace, ModelConfig, ModelWeights } from "@/lib/visualizer-types";
import { useInView } from "framer-motion";

interface VisualizerSectionProps {
    startTour?: boolean;
}

export default function VisualizerSection({ startTour }: VisualizerSectionProps) {
    const sectionRef = useRef<HTMLDivElement>(null);
    const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

    // Lazy load state to save resources until scrolled into view
    const [weights, setWeights] = useState<any>(null);
    const [trace, setTrace] = useState<InferenceTrace | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
    const [temperature, setTemperature] = useState(1.0);
    const [topK, setTopK] = useState(5);
    const [lastInput, setLastInput] = useState("");
    const [hasLoaded, setHasLoaded] = useState(false);

    // Load weights only when in view
    useEffect(() => {
        if (isInView && !hasLoaded) {
            setHasLoaded(true);
            console.log("Visualizer section in view. Loading 3D assets...");
            fetch("/pretrained-weights.json")
                .then((res) => res.json())
                .then((data) => {
                    setModelConfig(data.config);
                    setWeights(data.weights);
                    console.log("Model loaded for visualizer:", data.config);
                })
                .catch((err) => console.error("Failed to load visualizer weights:", err));
        }
    }, [isInView, hasLoaded]);

    const handleProcess = async (text: string, skipDelay = false) => {
        if (!weights || !modelConfig) return;

        setLastInput(text);
        setIsProcessing(true);

        if (!skipDelay) {
            setTrace(null);
            await new Promise(r => setTimeout(r, 100));
        }

        try {
            const tokenizer = new Tokenizer(modelConfig.chars);
            const tokenIds = tokenizer.encode(text);
            const tokens = text.split("");

            const result = runInference(tokens, tokenIds, modelConfig, weights as ModelWeights, { temperature, topK });
            result.predictedToken = tokenizer.decode([result.predictedTokenId]);

            setTrace(result);
            setIsProcessing(false);
        } catch (e) {
            console.error("Visualizer Inference failed", e);
            setIsProcessing(false);
        }
    };

    const handleParamsChange = (newTemp: number, newTopK: number) => {
        setTemperature(newTemp);
        setTopK(newTopK);
    };

    useEffect(() => {
        if (lastInput) {
            handleProcess(lastInput, true);
        }
    }, [temperature, topK, weights, modelConfig]);

    return (
        <section ref={sectionRef} className="relative w-full h-[900px] border-y border-white/5 overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            {/* Header / Title Overlay */}
            <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none flex flex-col items-center pt-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-amber-500/80 mb-4 tracking-widest uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Live Inference Engine
                </div>
                <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-amber-500 to-amber-200 mb-4 drop-shadow-[0_0_15px_rgba(212,148,58,0.3)] text-center">
                    Neural Internals
                </h2>
                <p className="text-white/40 max-w-lg text-center text-sm leading-relaxed">
                    Peer inside the transformer architecture. Watch tokens flow through attention heads and MLP layers in real-time.
                </p>
            </div>

            {isInView ? (
                <>
                    <div className="absolute inset-0 z-0">
                        <Visualizer trace={trace} processing={isProcessing} startTour={startTour} />
                    </div>

                    {/* Controls Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
                        {/* Sidebar (Right HUD) */}
                        <div className="absolute right-0 top-0 h-full w-full max-w-md pointer-events-none">
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
