import { useFrame } from "@react-three/fiber";
import { useRef, useState, useEffect } from "react";
import { InferenceTrace, InspectorData } from "@/lib/visualizer-types";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import EmbeddingLayer from "./EmbeddingLayer";
import TransformerBlock from "./TransformerBlock";
import OutputLayer from "./OutputLayer";
import ParticleFlow from "./ParticleFlow";
import * as THREE from "three";

interface TransformerSceneProps {
    trace: InferenceTrace | null;
    processing: boolean;
    onInspect?: (data: InspectorData) => void;
}

export default function TransformerScene({ trace, processing, onInspect }: TransformerSceneProps) {
    const groupRef = useRef<THREE.Group>(null);
    const [step, setStep] = useState(0);
    const startTime = useRef(0);

    useEffect(() => {
        if (trace) {
            startTime.current = Date.now();
            setStep(0);
        }
    }, [trace]);

    useFrame(() => {
        if (!trace) return;

        const elapsed = (Date.now() - startTime.current) / 1000;
        const currentStep = elapsed * 2; // 2 steps per second
        setStep(currentStep);

        // Camera rotation or scene rotation
        if (groupRef.current) {
            groupRef.current.rotation.y = Math.sin(elapsed * 0.1) * 0.1;
        }
    });

    if (!trace) {
        // Idle state
        return (
            <group>
                <ParticleFlow topHeight={20} />
                <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <gridHelper args={[50, 50, 0x444444, 0x222222]} />
                </mesh>
            </group>
        )
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
