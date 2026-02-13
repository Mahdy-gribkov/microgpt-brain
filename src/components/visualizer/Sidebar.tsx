"use client";

import { InferenceTrace } from "@/lib/visualizer-types";
import { motion, AnimatePresence } from "framer-motion";

// ... imports

interface SidebarProps {
    trace: InferenceTrace | null;
    currentStep: number;
    hoveredLayer: number | null;
    temperature: number;
    topK: number;
    onParamsChange: (temp: number, k: number) => void;
}

export default function Sidebar({ trace, currentStep, hoveredLayer, temperature, topK, onParamsChange }: SidebarProps) {
    const Controls = () => (
        <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
            <h3 className="text-xs font-mono text-gray-400 mb-3 uppercase tracking-widest">Model Controls</h3>

            <div className="mb-4">
                <div className="flex justify-between text-xs font-mono text-gray-300 mb-1">
                    <span>Temperature</span>
                    <span className="text-[#d4943a]">{temperature.toFixed(1)}</span>
                </div>
                <input
                    type="range"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => onParamsChange(parseFloat(e.target.value), topK)}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#d4943a]"
                />
                <p className="text-[10px] text-gray-500 mt-1">Higher = Creative, Lower = Deterministic</p>
            </div>

            <div>
                <div className="flex justify-between text-xs font-mono text-gray-300 mb-1">
                    <span>Top-K</span>
                    <span className="text-[#d4943a]">{topK}</span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={topK}
                    onChange={(e) => onParamsChange(temperature, parseInt(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#d4943a]"
                />
                <p className="text-[10px] text-gray-500 mt-1">Limit to top K probable tokens</p>
            </div>
        </div>
    );

    if (!trace) {
        return (
            <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="absolute top-20 right-4 w-80 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-6 text-white/50"
            >
                <h2 className="text-xl font-bold text-white mb-2 font-mono">microGPT Brain</h2>
                <p className="mb-4">Enter text and click run to visualize the transformer inference process.</p>

                <Controls />

                <div className="mt-4 text-sm space-y-1 font-mono">
                    <p>Model: ~100K Params</p>
                    <p>Layers: 4</p>
                    <p>Heads: 4</p>
                    <p>Embedding: 64-dim</p>
                </div>
            </motion.div>
        );
    }

    // Determine what to show based on hover or current animation step
    const activeLayerIndex = hoveredLayer !== null ? hoveredLayer : Math.min(Math.floor(currentStep / 2), 3); // simplistic mapping
    const layerData = trace.layers[activeLayerIndex];

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            key="analysis-panel"
            className="absolute top-20 right-4 w-80 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 text-white overflow-y-auto max-h-[calc(100vh-120px)] shadow-2xl shadow-black/50"
        >
            <Controls />
            <h2 className="text-lg font-bold mb-4 text-[#d4943a] font-mono border-b border-white/10 pb-2">Analysis</h2>

            <div className="space-y-4">
                {/* Prediction Section (Always visible) */}
                <div className="bg-white/5 p-3 rounded border border-white/10">
                    <div className="text-xs text-white/50 uppercase tracking-widest mb-1 font-mono">Prediction</div>
                    <div className="flex justify-between items-end">
                        <span className="text-2xl font-mono text-white">
                            {trace.predictedToken.replace("\n", "\\n")}
                        </span>
                        <span className="text-sm text-[#d4943a] font-mono">
                            {(trace.probabilities[trace.predictedTokenId] * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Layer specific details */}
                <AnimatePresence mode="wait">
                    {layerData && (
                        <motion.div
                            key={activeLayerIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="bg-white/5 p-3 rounded border border-white/10"
                        >
                            <div className="text-xs text-white/50 uppercase tracking-widest mb-1 font-mono">Layer {activeLayerIndex + 1}</div>
                            <div className="space-y-2 text-xs font-mono">
                                <div className="flex justify-between">
                                    <span>Attention Heads</span>
                                    <span>4</span>
                                </div>
                                {/* Just some dummy viz of values for now */}
                                <div>
                                    <span className="block mb-1 opacity-70">Attention Pattern</span>
                                    <div className="h-8 flex gap-0.5">
                                        {layerData.scores[0][0].map((v, i) => (
                                            <div key={i} className="flex-1 bg-[#d4943a]" style={{ opacity: v }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
