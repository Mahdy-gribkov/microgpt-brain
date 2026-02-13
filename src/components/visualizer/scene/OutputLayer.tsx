import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import { InferenceTrace, InspectorData } from "@/lib/visualizer-types";
import { Text } from "@react-three/drei";
import { useMemo } from "react";
import * as THREE from "three";

interface OutputLayerProps {
    trace: InferenceTrace | null;
    layerIndex: number;
    activeStep: number;
    onInspect?: (data: InspectorData) => void;
}

export default function OutputLayer({ trace, layerIndex, activeStep, onInspect }: OutputLayerProps) {
    if (!trace) return null;

    const isActive = activeStep > layerIndex * 2 + 1;

    // Simple fade in scale effect
    const scale = isActive ? 1 : 0;

    const probs = trace.probabilities;
    const topK = 10;

    // Get top K predictions
    const sortedIndices = probs
        .map((p, i) => ({ p, i }))
        .sort((a, b) => b.p - a.p)
        .slice(0, topK);

    const handleInspect = (e: any) => {
        e.stopPropagation();
        onInspect?.({
            title: "Output Layer (Logits -> Softmax)",
            description: "The final step converts the model's internal state into probabilities for the next token. The raw scores (logits) are passed through a Softmax function to ensure they sum to 1.0.",
            formula: "P(token_i) = exp(x_i) / Σ exp(x_j)",
            values: probs.slice(0, 50) // Show first 50 probs visually
        });
    };

    return (
        <group position={[0, (layerIndex + 1) * SCENE_CONFIG.LAYER_SPACING, 0]} scale={[scale, scale, scale]}>
            {/* Platform */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={handleInspect}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <planeGeometry args={[10, 4]} />
                <meshStandardMaterial color={SCENE_CONFIG.COLORS.glass} transparent opacity={0.2} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[-6, 0.5, 0]} fontSize={0.5} color="white" anchorX="right">
                Output Probabilities
            </Text>

            {sortedIndices.map((item, idx) => {
                const x = (idx - topK / 2) * 0.8;
                const height = item.p * 5; // Scale height
                const isWinner = idx === 0;

                return (
                    <group key={item.i} position={[x, 0, 0]}>
                        <mesh position={[0, height / 2, 0]}>
                            <boxGeometry args={[0.6, height, 0.6]} />
                            <meshStandardMaterial
                                color={isWinner ? SCENE_CONFIG.COLORS.accent : SCENE_CONFIG.COLORS.accentDim}
                                emissive={isWinner ? SCENE_CONFIG.COLORS.accent : "black"}
                                emissiveIntensity={isWinner ? 0.5 : 0}
                            />
                        </mesh>
                        <Text
                            position={[0, -0.5, 0]}
                            fontSize={0.3}
                            color="white"
                            rotation={[-Math.PI / 4, 0, 0]}
                        >
                            {isWinner ? `"${trace.predictedToken.replace("\n", "\\n")}"` : `ID:${item.i}`}
                        </Text>
                        {isWinner && (
                            <Text position={[0, height + 0.5, 0]} fontSize={0.4} color={SCENE_CONFIG.COLORS.accent}>
                                {(item.p * 100).toFixed(1)}%
                            </Text>
                        )}
                    </group>
                );
            })}
        </group>
    );
}
