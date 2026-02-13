import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

export default function ParticleFlow({ topHeight }: { topHeight: number }) {
    const count = 800; // Increased density
    const mesh = useRef<THREE.InstancedMesh>(null);
    const lightMesh = useRef<THREE.InstancedMesh>(null);

    // Random starting positions
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const speed = 0.05 + Math.random() * 0.15; // Faster, varied speed
            const x = (Math.random() - 0.5) * 15; // Wider spread
            const z = (Math.random() - 0.5) * 8; // Depth spread
            const y = Math.random() * topHeight;
            const offset = Math.random() * Math.PI * 2;
            temp.push({ speed, x, z, y, offset });
        }
        return temp;
    }, [count, topHeight]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const currentMesh = mesh.current;
        if (!currentMesh) return;

        const time = state.clock.getElapsedTime();

        particles.forEach((particle, i) => {
            // Move up
            particle.y += particle.speed;

            // Loop functionality
            if (particle.y > topHeight) {
                particle.y = 0;
                particle.x = (Math.random() - 0.5) * 15; // Reset X to keep it dynamic
            }

            // Wiggle effect (Cyberpunk noise)
            const wiggleX = Math.sin(time * 2 + particle.offset) * 0.2;

            dummy.position.set(particle.x + wiggleX, particle.y, particle.z);

            // Scale based on speed (stretch effect)
            const stretch = 1 + particle.speed * 10;
            dummy.scale.set(0.05, stretch * 0.2, 0.05);

            dummy.updateMatrix();
            currentMesh.setMatrixAt(i, dummy.matrix);
        });
        currentMesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                    color={SCENE_CONFIG.COLORS.accent}
                    transparent
                    opacity={0.4}
                    blending={THREE.AdditiveBlending}
                />
            </instancedMesh>
        </group>
    );
}
