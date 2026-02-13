import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import TokenCube from "./TokenCube";
import { InferenceTrace, InspectorData } from "@/lib/visualizer-types";
import * as THREE from "three";

interface EmbeddingLayerProps {
    trace: InferenceTrace | null;
    activeStep: number;
    onInspect?: (data: InspectorData) => void;
}

export default function EmbeddingLayer({ trace, activeStep, onInspect }: EmbeddingLayerProps) {
    if (!trace) return null;

    const tokens = trace.inputTokens;
    // Center the tokens
    const totalWidth = (tokens.length - 1) * SCENE_CONFIG.TOKEN_SPACING;
    const startX = -totalWidth / 2;

    // Layer is active if we are at step 0 or higher
    const isLayerActive = activeStep >= 0;

    const handleInspect = (e: any) => {
        e.stopPropagation();
        onInspect?.({
            title: "Embedding Layer",
            description: "The first step of the transformer. Each input token (character) is looked up in a learnable table to retrieve a high-dimensional vector (Length 64). This vector captures the initial semantic meaning of the token.",
            formula: "x = W_e[token_id] + W_p[position]",
            values: trace?.layers[0]?.preNorm1[0]
        });
    };

    return (
        <group position={[0, 0, 0]}>
            {tokens.map((token, i) => {
                // Stagger activation
                const isTokenActive = isLayerActive;

                return (
                    <TokenCube
                        key={i}
                        token={token}
                        index={i}
                        isActive={isTokenActive}
                        position={[startX + i * SCENE_CONFIG.TOKEN_SPACING, 0, 0]}
                    />
                );
            })}

            {/* Visual Platform */}
            <mesh
                position={[0, -0.6, 0]}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={handleInspect}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <planeGeometry args={[totalWidth + 4, 4]} />
                <meshStandardMaterial color={SCENE_CONFIG.COLORS.background} transparent opacity={0.5} />
                <lineSegments>
                    <edgesGeometry args={[new THREE.PlaneGeometry(totalWidth + 4, 4)] as any} />
                    <lineBasicMaterial color={SCENE_CONFIG.COLORS.glass} transparent opacity={0.1} />
                </lineSegments>
            </mesh>
        </group>
    );
}
