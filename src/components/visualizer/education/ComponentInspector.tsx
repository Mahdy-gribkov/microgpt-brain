import { motion } from "framer-motion";
import { InspectorData } from "@/lib/visualizer-types";

interface InspectorProps {
    data: InspectorData;
    onClose: () => void;
}

export default function ComponentInspector({ data, onClose }: InspectorProps) {
    if (!data) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="fixed top-20 right-4 w-80 bg-black/90 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl z-50 overflow-y-auto max-h-[80vh]"
        >
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-white">{data.title}</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-6">
                <div className="bg-white/5 p-4 rounded-lg">
                    <h3 className="text-xs font-mono text-gray-400 mb-2 uppercase">Concept</h3>
                    <p className="text-sm text-gray-200 leading-relaxed">{data.description}</p>
                </div>

                {data.formula && (
                    <div className="bg-black/50 p-4 rounded-lg border border-white/10">
                        <h3 className="text-xs font-mono text-gray-400 mb-2 uppercase">Math</h3>
                        <code className="text-sm text-green-400 font-mono block overflow-x-auto">
                            {data.formula}
                        </code>
                    </div>
                )}

                {data.values && (
                    <div>
                        <h3 className="text-xs font-mono text-gray-400 mb-2 uppercase">Current State</h3>
                        <div className="grid grid-cols-4 gap-1">
                            {data.values.slice(0, 16).map((v: number, i: number) => (
                                <div
                                    key={i}
                                    className="h-6 rounded-sm transition-colors"
                                    style={{
                                        backgroundColor: `rgba(139, 92, 246, ${Math.abs(v)})`
                                    }}
                                    title={v.toFixed(3)}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 italic">First 16 dimensions visualized</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
