import { Text } from "@react-three/drei";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

interface TokenCubeProps {
    token: string;
    index: number;
    isActive: boolean;
    position: [number, number, number];
}

export default function TokenCube({ token, isActive, position }: TokenCubeProps) {
    return (
        <group position={[position[0], position[1] + (isActive ? 0.2 : 0), position[2]]}>
            <mesh>
                <boxGeometry args={[0.8, 0.8, 0.8]} />
                <meshBasicMaterial
                    color={isActive ? SCENE_CONFIG.COLORS.accent : SCENE_CONFIG.COLORS.token}
                    transparent
                    opacity={isActive ? 0.9 : 0.6}
                />
            </mesh>
            <Text
                position={[0, 0, 0.51]}
                fontSize={0.4}
                color={isActive ? "white" : "gray"}
                anchorX="center"
                anchorY="middle"
            >
                {token}
            </Text>
        </group>
    );
}
