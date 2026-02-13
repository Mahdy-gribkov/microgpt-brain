"use client";

import { useState } from "react";
import { Button } from "./ui/Button";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

interface InputBarProps {
    onProcess: (text: string) => void;
    isProcessing: boolean;
}

export default function InputBar({ onProcess, isProcessing }: InputBarProps) {
    const [text, setText] = useState("The cat sat on");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim()) {
            onProcess(text);
        }
    };

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full"
        >
            <form onSubmit={handleSubmit} className="flex gap-0 relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500/20 to-purple-500/20 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>

                <div className="relative flex w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden p-1 shadow-2xl">
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="flex-1 bg-transparent border-none text-white placeholder:text-white/20 focus:scale-[1.01] focus:ring-0 px-6 py-4 text-lg font-mono transition-all outline-none"
                        placeholder="Type a prompt to visualize..."
                        disabled={isProcessing}
                    />
                    <Button
                        type="submit"
                        disabled={isProcessing}
                        className="px-8 bg-amber-600/90 hover:bg-amber-500 text-white font-bold rounded-lg border-l border-white/10 transition-all hover:shadow-[0_0_20px_rgba(212,148,58,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span className="font-mono text-xs uppercase tracking-wider">Processing</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Play className="w-4 h-4 fill-current" />
                                <span className="font-mono text-sm uppercase tracking-wider">Run</span>
                            </div>
                        )}
                    </Button>
                </div>
            </form>

            {/* Decorative Tech Lines */}
            <div className="flex justify-between mt-2 px-4 opacity-30">
                <div className="h-1 w-1 bg-white rounded-full" />
                <div className="h-px w-full bg-gradient-to-r from-transparent via-white/50 to-transparent mx-4 self-center" />
                <div className="h-1 w-1 bg-white rounded-full" />
            </div>
        </motion.div>
    );
}
