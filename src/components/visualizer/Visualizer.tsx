"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";
import { useState, Suspense, useEffect } from "react";
import TransformerScene from "./scene/TransformerScene";
import { EffectComposer, Bloom, Noise, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import { InferenceTrace } from "@/lib/visualizer-types";
import GuidedTour from "./education/GuidedTour";
import ComponentInspector from "./education/ComponentInspector";
import { AnimatePresence } from "framer-motion";

interface VisualizerProps {
    trace: InferenceTrace | null;
    processing: boolean;
    startTour?: boolean;
}

export default function Visualizer({ trace, processing, startTour = false }: VisualizerProps) {
    const [isTourActive, setIsTourActive] = useState(startTour);
    const [inspectorData, setInspectorData] = useState<any>(null);

    // Effect to react to prop changes if tour is triggered externally later
    useEffect(() => {
        if (startTour) setIsTourActive(true);
    }, [startTour]);

    return (
        <div className="w-full h-screen bg-[#0c0b0e] relative">
            <Canvas dpr={[1, 2]}>
                <PerspectiveCamera makeDefault position={[0, 10, 30]} fov={50} />
                <OrbitControls
                    target={[0, 8, 0]}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2}
                    enabled={!isTourActive} // Disable manual control during tour
                />

                <ambientLight intensity={1.5} />
                <pointLight position={[10, 10, 10]} intensity={2} color={SCENE_CONFIG.COLORS.accent} />
                <pointLight position={[-10, 10, -10]} intensity={1} color="#4444ff" />
                <spotLight position={[0, 50, 0]} angle={0.5} penumbra={1} intensity={2} castShadow />
                <Environment preset="city" />

                <Suspense fallback={null}>
                    <TransformerScene
                        trace={trace}
                        processing={processing}
                        onInspect={setInspectorData}
                    />
                </Suspense>

                <GuidedTour isActive={isTourActive} onEnd={() => setIsTourActive(false)} />

                <EffectComposer disableNormalPass>
                    <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.0} levels={8} />
                    <Noise opacity={0.05} />
                    <Vignette eskil={false} offset={0.1} darkness={1.1} />
                    {/* @ts-ignore */}
                    <ChromaticAberration offset={[0.002, 0.002]} />
                </EffectComposer>
            </Canvas>

            {/* UI Overlays */}
            <div className="absolute top-4 left-4 z-50 flex gap-4">
                <button
                    onClick={() => setIsTourActive(!isTourActive)}
                    className="px-4 py-2 bg-purple-600/80 backdrop-blur hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg transition-all"
                >
                    {isTourActive ? "Stop Tour" : "🎓 Start Guided Tour"}
                </button>
            </div>

            <AnimatePresence>
                {inspectorData && (
                    <ComponentInspector
                        data={inspectorData}
                        onClose={() => setInspectorData(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}
