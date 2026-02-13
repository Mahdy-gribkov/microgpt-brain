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
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute top-0 left-0 w-full z-10 p-4 bg-black/50 backdrop-blur-md border-b border-white/10 flex justify-center"
        >
            <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
                <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-md px-4 py-2 text-white placeholder:text-white/30 focus:outline-none focus:border-[#d4943a] transition-colors font-mono"
                    placeholder="Enter text to analyze..."
                    disabled={isProcessing}
                />
                <Button type="submit" disabled={isProcessing} className="w-32 bg-[#d4943a] hover:bg-[#b87d2e] text-black font-bold">
                    {isProcessing ? (
                        <span className="animate-pulse">Processing...</span>
                    ) : (
                        <>
                            <Play className="w-4 h-4 mr-2" /> Run
                        </>
                    )}
                </Button>
            </form>
        </motion.div>
    );
}
