import { Text, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import * as THREE from "three";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

interface TokenCubeProps {
    token: string;
    index: number;
    isActive: boolean;
    position: [number, number, number];
}

export default function TokenCube({ token, index, isActive, position }: TokenCubeProps) {
    const meshRef = useRef<THREE.Mesh>(null);

    const targetColor = useMemo(() => new THREE.Color(isActive ? SCENE_CONFIG.COLORS.accent : SCENE_CONFIG.COLORS.token), [isActive]);
    const materialRef = useRef<THREE.MeshStandardMaterial>(null);

    useFrame((state, delta) => {
        if (materialRef.current) {
            materialRef.current.color.lerp(targetColor, delta * 5);

            // Slight bobbing animation
            if (meshRef.current) {
                meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.05;
            }
        }
    });

    return (
        <group position={[position[0], position[1] + (isActive ? 0.2 : 0), position[2]]}>
            <RoundedBox args={[0.8, 0.8, 0.8]} radius={0.1} smoothness={4} ref={meshRef}>
                <meshPhysicalMaterial
                    ref={materialRef}
                    color={SCENE_CONFIG.COLORS.token}
                    transmission={0.2} // Reduced transmission to see the object more
                    roughness={0.3}
                    metalness={0.4}
                    transparent
                    opacity={1}
                    emissive={isActive ? SCENE_CONFIG.COLORS.accent : "black"}
                    emissiveIntensity={isActive ? 2.0 : 0} // Stronger glow
                />
            </RoundedBox>
            <Text
                position={[0, 0, 0.51]} // Slightly in front
                fontSize={0.4}
                color={isActive ? "white" : "gray"}
                anchorX="center"
                anchorY="middle"
                font="/fonts/GeistMono-Regular.ttf" // Optional if we had custom font, but default is fine
            >
                {token}
            </Text>
        </group>
    );
}
