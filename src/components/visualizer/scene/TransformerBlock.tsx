import { SCENE_CONFIG } from "@/lib/visualizer-constants";
import AttentionViz from "./AttentionViz";
import { Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { TraceLayer, InspectorData } from "@/lib/visualizer-types";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

interface TransformerBlockProps {
    layerIndex: number;
    trace: TraceLayer;
    numTokens: number;
    activeStep: number;
    onInspect?: (data: InspectorData) => void;
}

export default function TransformerBlock({ layerIndex, trace, numTokens, activeStep, onInspect }: TransformerBlockProps) {
    const isActive = activeStep >= layerIndex * 2 + 1;
    const isHovered = useRef(false);
    const meshRef = useRef<THREE.Mesh>(null);

    // Pulse effect
    useFrame((state) => {
        if (meshRef.current && isActive) {
            const time = state.clock.getElapsedTime();
            const pulse = (Math.sin(time * 4) + 1) * 0.5; // 0 to 1
            const material = meshRef.current.material as THREE.MeshPhysicalMaterial;
            material.emissiveIntensity = 0.5 + pulse * 1.5; // Pulse between 0.5 and 2.0
        }
    });

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
            {/* Vertical Connection Lines (Data Bus) */}
            <group position={[0, -SCENE_CONFIG.LAYER_SPACING / 2, 0]}>
                <Line
                    points={[
                        [0, -SCENE_CONFIG.LAYER_SPACING / 2, 0],
                        [0, SCENE_CONFIG.LAYER_SPACING / 2, 0]
                    ]}
                    color={isActive ? SCENE_CONFIG.COLORS.accent : "gray"}
                    lineWidth={1}
                    transparent
                    opacity={0.2}
                />
                <Line
                    points={[
                        [-5, -SCENE_CONFIG.LAYER_SPACING / 2, 2],
                        [-5, SCENE_CONFIG.LAYER_SPACING / 2, 2]
                    ]}
                    color={isActive ? SCENE_CONFIG.COLORS.accent : "gray"}
                    lineWidth={1}
                    transparent
                    opacity={0.1}
                />
                <Line
                    points={[
                        [5, -SCENE_CONFIG.LAYER_SPACING / 2, -2],
                        [5, SCENE_CONFIG.LAYER_SPACING / 2, -2]
                    ]}
                    color={isActive ? SCENE_CONFIG.COLORS.accent : "gray"}
                    lineWidth={1}
                    transparent
                    opacity={0.1}
                />
            </group>

            {/* Glass Platform with Neuron Grid */}
            <mesh
                ref={meshRef}
                rotation={[-Math.PI / 2, 0, 0]}
                onClick={handleInspect}
                onPointerOver={() => { document.body.style.cursor = 'pointer'; isHovered.current = true; }}
                onPointerOut={() => { document.body.style.cursor = 'auto'; isHovered.current = false; }}
            >
                <boxGeometry args={[totalWidth + 6, 6, 0.2]} />
                <meshPhysicalMaterial
                    color={isActive ? SCENE_CONFIG.COLORS.accent : "#2a2a2a"}
                    transmission={0.9}
                    thickness={1}
                    roughness={0.2}
                    metalness={0.8}
                    transparent
                    opacity={0.6}
                    emissive={isActive ? SCENE_CONFIG.COLORS.accent : "#000"}
                    emissiveIntensity={0.2}
                />
            </mesh>

            {/* Grid Pattern Overlay */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.11, 0]}>
                <planeGeometry args={[totalWidth + 6, 6]} />
                <meshBasicMaterial
                    color={isActive ? "white" : "gray"}
                    wireframe
                    transparent
                    opacity={0.1}
                />
            </mesh>

            {/* Label */}
            <Text
                position={[-totalWidth / 2 - 4, 0.5, 0]}
                fontSize={0.6}
                color={isActive ? SCENE_CONFIG.COLORS.accent : "gray"}
                font="/fonts/GeistMono-Regular.ttf"
                anchorX="right"
            >
                LAYER {layerIndex + 1}
            </Text>

            {/* Attention Arcs */}
            {isActive && (
                <AttentionViz attentionScores={trace.scores} numTokens={numTokens} />
            )}
        </group>
    );
}
