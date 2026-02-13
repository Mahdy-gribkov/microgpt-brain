"use client";

import { useState, useEffect } from "react";
import Visualizer from "@/components/visualizer/Visualizer";
import InputBar from "@/components/visualizer/InputBar";
import Sidebar from "@/components/visualizer/Sidebar";
import { runInference } from "@/engine/visualizer-model";
import { Tokenizer } from "@/engine/visualizer-tokenizer";
import { InferenceTrace, ModelConfig, ModelWeights } from "@/lib/visualizer-types";

export default function VisualizerPage() {
    const [weights, setWeights] = useState<any>(null); // Type 'any' for the RAW json structure, verified at runtime
    const [trace, setTrace] = useState<InferenceTrace | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null);
    const [temperature, setTemperature] = useState(1.0);
    const [topK, setTopK] = useState(5);
    const [lastInput, setLastInput] = useState("");

    // Load weights on mount
    useEffect(() => {
        fetch("/pretrained-weights.json")
            .then((res) => res.json())
            .then((data) => {
                // data.config, data.weights
                setModelConfig(data.config);
                setWeights(data.weights);
                console.log("Model loaded:", data.config);
            })
            .catch((err) => console.error("Failed to load weights:", err));
    }, []);

    const handleProcess = async (text: string, skipDelay = false) => {
        if (!weights || !modelConfig) return;

        setLastInput(text);
        setIsProcessing(true);

        if (!skipDelay) {
            setTrace(null);
            // Simulate delay for "processing" feel + allow UI to update
            await new Promise(r => setTimeout(r, 100));
        }

        try {
            const tokenizer = new Tokenizer(modelConfig.chars);
            const tokenIds = tokenizer.encode(text);
            const tokens = text.split(""); // Character level

            const result = runInference(tokens, tokenIds, modelConfig, weights as ModelWeights, { temperature, topK });

            // Populate specific predicted token char from ID
            result.predictedToken = tokenizer.decode([result.predictedTokenId]);

            setTrace(result);
            setIsProcessing(false); // Done computing

        } catch (e) {
            console.error("Inference failed", e);
            setIsProcessing(false);
        }
    };

    const handleParamsChange = (newTemp: number, newTopK: number) => {
        setTemperature(newTemp);
        setTopK(newTopK);
    };

    // Re-run when params change
    useEffect(() => {
        if (lastInput) {
            handleProcess(lastInput, true);
        }
    }, [temperature, topK, weights, modelConfig]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-between bg-black text-white">
            <InputBar onProcess={(t) => handleProcess(t)} isProcessing={isProcessing} />
            <Visualizer trace={trace} processing={isProcessing} />
            <Sidebar
                trace={trace}
                currentStep={0}
                hoveredLayer={null}
                temperature={temperature}
                topK={topK}
                onParamsChange={handleParamsChange}
            />
        </main>
    );
}
