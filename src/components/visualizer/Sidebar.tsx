"use client";

import { InferenceTrace } from "@/lib/visualizer-types";
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Layers, Zap, Settings } from "lucide-react";

interface SidebarProps {
    trace: InferenceTrace | null;
    currentStep: number;
    hoveredLayer: number | null;
    temperature: number;
    topK: number;
    onParamsChange: (temp: number, k: number) => void;
}

export default function Sidebar({ trace, currentStep, hoveredLayer, temperature, topK, onParamsChange }: SidebarProps) {

    // Premium slider component
    const Slider = ({ label, value, min, max, step, onChange, unit }: any) => (
        <div className="mb-6">
            <div className="flex justify-between text-[10px] font-mono text-gray-400 mb-2 uppercase tracking-wide">
                <span>{label}</span>
                <span className="text-amber-400">{value}{unit}</span>
            </div>
            <div className="relative h-1 bg-white/10 rounded-full">
                <div
                    className="absolute h-full bg-amber-500 rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                    style={{ width: `${((value - min) / (max - min)) * 100}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
            </div>
        </div>
    );

    const Controls = () => (
        <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                <Settings className="w-3 h-3 text-amber-500" />
                <h3 className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">Hyperparameters</h3>
            </div>
            <Slider
                label="Temperature"
                value={temperature}
                min={0.1} max={2.0} step={0.1}
                onChange={(v: number) => onParamsChange(v, topK)}
                unit=""
            />
            <Slider
                label="Top-K Sampling"
                value={topK}
                min={1} max={50} step={1}
                onChange={(v: number) => onParamsChange(temperature, v)}
                unit=""
            />
        </div>
    );

    // Initial State (No Trace)
    if (!trace) {
        return (
            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="w-80 space-y-4"
            >
                <Controls />

                <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-5 shadow-2xl">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                        <Cpu className="w-3 h-3 text-amber-500" />
                        <h3 className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">Architecture Spec</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[10px] font-mono text-white/70">
                        <div className="bg-white/5 p-2 rounded">
                            <span className="block text-white/30 text-[8px] uppercase">Params</span>
                            120K
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                            <span className="block text-white/30 text-[8px] uppercase">Layers</span>
                            4
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                            <span className="block text-white/30 text-[8px] uppercase">Heads</span>
                            4
                        </div>
                        <div className="bg-white/5 p-2 rounded">
                            <span className="block text-white/30 text-[8px] uppercase">Ctx Len</span>
                            64
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    }

    const activeLayerIndex = hoveredLayer !== null ? hoveredLayer : (currentStep <= 4 ? currentStep : 4);
    const layerData = trace.layers[Math.min(activeLayerIndex, trace.layers.length - 1)];

    return (
        <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-80 space-y-4 h-full overflow-y-auto pr-2 custom-scrollbar"
        >
            <div className="flex justify-end mb-2">
                <div className="bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded text-[10px] text-amber-500 font-mono animate-pulse">
                    ● SYSTEM ACTIVE
                </div>
            </div>

            <Controls />

            <div className="backdrop-blur-xl bg-black/40 border border-white/10 rounded-xl p-5 shadow-2xl">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-white/5">
                    <Zap className="w-3 h-3 text-amber-500" />
                    <h3 className="text-[10px] font-mono text-white/50 uppercase tracking-[0.2em]">Live Analysis</h3>
                </div>

                {/* Prediction Result */}
                <div className="bg-gradient-to-r from-amber-500/10 to-transparent p-4 rounded-lg border border-amber-500/20 mb-4">
                    <div className="text-[10px] text-amber-500/70 uppercase tracking-widest mb-1 font-mono">Next Token Prediction</div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-3xl font-mono text-white font-bold tracking-tighter">
                            {trace.predictedToken.replace("\n", "\\n")}
                        </span>
                        <span className="text-sm font-mono text-amber-400">
                            {(trace.probabilities[trace.predictedTokenId] * 100).toFixed(1)}%
                        </span>
                    </div>
                </div>

                {/* Layer Details Animation */}
                <AnimatePresence mode="wait">
                    {layerData && (
                        <motion.div
                            key={activeLayerIndex}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded border border-white/5">
                                <Layers className="w-3 h-3 text-white/50" />
                                <span className="text-xs font-mono text-white/80">Transformer Block {activeLayerIndex + 1}</span>
                            </div>

                            <div className="space-y-1">
                                <span className="text-[10px] text-white/30 uppercase font-mono">Attention Activation</span>
                                <div className="h-12 flex gap-1">
                                    {layerData.scores[0][0].map((v, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 bg-amber-500 rounded-sm transition-all duration-300"
                                            style={{ height: `${v * 100}%`, opacity: Math.max(0.2, v * 2) }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
