"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useState, Suspense } from "react";
import TransformerScene from "./scene/TransformerScene";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
    const [inspectorData, setInspectorData] = useState<import("@/lib/visualizer-types").InspectorData | null>(null);

    // Sync with prop when it changes from false to true
    if (startTour && !isTourActive) {
        setIsTourActive(true);
    }

    return (
        <div className="w-full h-full bg-bg relative" role="img" aria-label="3D Neural Network Visualizer">
            <Canvas dpr={[1, 1.5]} frameloop="demand">
                <PerspectiveCamera makeDefault position={[0, 10, 30]} fov={50} />
                <OrbitControls
                    target={[0, 8, 0]}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI / 2}
                    enabled={!isTourActive}
                />

                <ambientLight intensity={1.5} />
                <pointLight position={[10, 10, 10]} intensity={2} color={SCENE_CONFIG.COLORS.accent} />

                <Suspense fallback={null}>
                    <TransformerScene
                        trace={trace}
                        processing={processing}
                        onInspect={setInspectorData}
                    />
                </Suspense>

                <GuidedTour isActive={isTourActive} onEnd={() => setIsTourActive(false)} />

                <EffectComposer enableNormalPass={false}>
                    <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={200} intensity={0.6} levels={2} />
                </EffectComposer>
            </Canvas>

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
