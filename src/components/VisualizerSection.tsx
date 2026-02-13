"use client";

import { useState, useEffect, useRef } from "react";
import Visualizer from "@/components/visualizer/Visualizer";
import InputBar from "@/components/visualizer/InputBar";
import Sidebar from "@/components/visualizer/Sidebar";
import { runInference } from "@/engine/visualizer-model";
import { Tokenizer } from "@/engine/visualizer-tokenizer";
import { InferenceTrace, ModelConfig, ModelWeights } from "@/lib/visualizer-types";
import { useInView } from "framer-motion";

export default function VisualizerSection() {
    const sectionRef = useRef(null);
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
        <section ref={sectionRef} className="relative w-full h-[800px] bg-black text-white overflow-hidden border-t border-white/10">
            {/* Header / Title Overlay */}
            <div className="absolute top-0 left-0 w-full p-6 z-10 pointer-events-none">
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#d4943a] to-[#ffcc80] mb-2 drop-shadow-lg">
                    Neural Internals
                </h2>
                <p className="text-white/60 max-w-md text-sm">
                    Interact with a pre-trained GPT-2 (Small) model in 3D. Inspect attention heads, embeddings, and layer activations in real-time.
                </p>
            </div>

            {isInView ? (
                <>
                   <div className="absolute inset-0 z-0">
                        <Visualizer trace={trace} processing={isProcessing} />
                   </div>
                    
                    {/* Controls Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                         {/* Input Bar needs pointer events */}
                        <div className="pointer-events-auto w-full flex justify-center pt-24">
                             <div className="w-full max-w-2xl px-4">
                                <InputBar onProcess={(t) => handleProcess(t)} isProcessing={isProcessing} />
                             </div>
                        </div>

                        {/* Sidebar needs pointer events */}
                        <div className="pointer-events-auto absolute right-0 top-0 h-full">
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
                </>
            ) : (
                 <div className="w-full h-full flex items-center justify-center text-white/30">
                    <p>Scroll into view to load 3D Engine...</p>
                 </div>
            )}
        </section>
    );
}
