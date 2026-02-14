import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { InferenceTrace, InspectorData } from "@/lib/visualizer-types";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import EmbeddingLayer from "./EmbeddingLayer";
import TransformerBlock from "./TransformerBlock";
import OutputLayer from "./OutputLayer";
import ParticleFlow from "./ParticleFlow";
import { Text } from "@react-three/drei";
import * as THREE from "three";

interface TransformerSceneProps {
    trace: InferenceTrace | null;
    processing: boolean;
    onInspect?: (data: InspectorData) => void;
}

export default function TransformerScene({ trace, onInspect }: TransformerSceneProps) {
    const groupRef = useRef<THREE.Group>(null);
    const startTime = useRef(0);
    const lastFlooredStep = useRef(0);
    const [step, setStep] = useState(0);

    // Reset timer when trace changes
    useEffect(() => {
        if (trace) {
            startTime.current = Date.now();
            lastFlooredStep.current = 0;
            // eslint-disable-next-line react-hooks/set-state-in-effect -- reset step on trace change is intentional
            setStep(0);
        }
    }, [trace]);

    useFrame((state) => {
        if (!trace) return;

        const elapsed = (Date.now() - startTime.current) / 1000;
        const currentStep = elapsed * 2; // 2 steps per second

        // Only trigger React re-render when step crosses an integer boundary
        const flooredStep = Math.floor(currentStep);
        if (flooredStep !== lastFlooredStep.current) {
            lastFlooredStep.current = flooredStep;
            setStep(flooredStep);
            state.invalidate();
        }

        // Scene rotation (slow, only invalidate when rotation visibly changes)
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(elapsed * 0.1) * 0.1;
        }
    });

    if (!trace) {
        // Idle state: loading indicator while weights fetch
        return (
            <group>
                <ParticleFlow topHeight={20} />
                <Text
                    position={[0, 8, 0]}
                    fontSize={1.2}
                    color={SCENE_CONFIG.COLORS.accent}
                    anchorX="center"
                    anchorY="middle"
                >
                    Loading Neural Engine...
                </Text>
                <Text
                    position={[0, 6, 0]}
                    fontSize={0.5}
                    color="#666666"
                    anchorX="center"
                    anchorY="middle"
                >
                    Fetching pretrained weights
                </Text>
                {/* Ghost placeholder blocks to hint at structure */}
                {[0, 1, 2].map((i) => (
                    <mesh key={i} position={[0, (i + 1) * SCENE_CONFIG.LAYER_SPACING, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <boxGeometry args={[12, 6, 0.15]} />
                        <meshBasicMaterial color="#1a1a1a" transparent opacity={0.3} wireframe />
                    </mesh>
                ))}
            </group>
        );
    }

    return (
        <group ref={groupRef}>
            <EmbeddingLayer trace={trace} activeStep={step} onInspect={onInspect} />

            {trace.layers.map((layer, i) => (
                <TransformerBlock
                    key={i}
                    layerIndex={i}
                    trace={layer}
                    numTokens={trace.inputTokens.length}
                    activeStep={step}
                    onInspect={onInspect}
                />
            ))}

            <OutputLayer trace={trace} layerIndex={trace.layers.length} activeStep={step} onInspect={onInspect} />

            <ParticleFlow topHeight={(trace.layers.length + 2) * SCENE_CONFIG.LAYER_SPACING} />
        </group>
    );
}
