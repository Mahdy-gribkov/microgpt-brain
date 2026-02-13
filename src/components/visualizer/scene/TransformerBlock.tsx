import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import AttentionViz from "./AttentionViz";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import { TraceLayer, InspectorData } from "@/lib/visualizer-types";

interface TransformerBlockProps {
    layerIndex: number;
    trace: TraceLayer;
    numTokens: number;
    activeStep: number;
    onInspect?: (data: InspectorData) => void;
}

export default function TransformerBlock({ layerIndex, trace, numTokens, activeStep, onInspect }: TransformerBlockProps) {
    const isActive = activeStep >= layerIndex * 2 + 1; // Animation logic TBD

    const totalWidth = (numTokens - 1) * SCENE_CONFIG.TOKEN_SPACING;

    const handleInspect = (e: any) => {
        e.stopPropagation();
        onInspect?.({
            title: `Transformer Block ${layerIndex + 1}`,
            description: "A single block of the GPT architecture. It consists of Multi-Head Self-Attention (mixing information between tokens) followed by a Feed-Forward Network (processing individual token representations), with Residual Connections and Layer Normalization.",
            formula: "x = x + Attention(LN(x))\nx = x + FFN(LN(x))",
            values: trace?.blockOutput?.[0] || []
        });
    };

    return (
        <group position={[0, (layerIndex + 1) * SCENE_CONFIG.LAYER_SPACING, 0]}>
            {/* Glass Platform */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={handleInspect}
                onPointerOver={() => document.body.style.cursor = 'pointer'}
                onPointerOut={() => document.body.style.cursor = 'auto'}
            >
                <planeGeometry args={[totalWidth + 4, 4]} />
                <meshPhysicalMaterial
                    color={isActive ? SCENE_CONFIG.COLORS.accent : SCENE_CONFIG.COLORS.glass}
                    transmission={0.5}
                    roughness={0.1}
                    metalness={0.1}
                    transparent
                    opacity={0.3}
                    emissive={isActive ? SCENE_CONFIG.COLORS.accent : "black"}
                    emissiveIntensity={isActive ? 0.2 : 0}
                />
            </mesh>

            {/* Label */}
            <Text
                position={[-totalWidth / 2 - 3, 0.5, 0]}
                fontSize={0.5}
                color="white"
                anchorX="right"
            >
                Layer {layerIndex + 1}
            </Text>

            {/* Attention Arcs */}
            {isActive && (
                <AttentionViz attentionScores={trace.scores} numTokens={numTokens} />
            )}
        </group>
    );
}
