import { useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

// Seeded PRNG for deterministic particle positions (pure during render)
function seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
        s = (s * 16807 + 0) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

function createParticles(count: number, topHeight: number) {
    const rng = seededRandom(42);
    const temp = [];
    for (let i = 0; i < count; i++) {
        const speed = 0.05 + rng() * 0.15;
        const x = (rng() - 0.5) * 15;
        const z = (rng() - 0.5) * 8;
        const y = rng() * topHeight;
        const offset = rng() * Math.PI * 2;
        temp.push({ speed, x, z, y, offset });
    }
    return temp;
}

export default function ParticleFlow({ topHeight }: { topHeight: number }) {
    const count = 100;
    const mesh = useRef<THREE.InstancedMesh>(null);
    const frameCount = useRef(0);

    const [particles] = useState(() => createParticles(count, topHeight));

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        // Only update every 3rd frame (~20fps instead of 60fps)
        frameCount.current += 1;
        if (frameCount.current % 3 !== 0) return;

        const currentMesh = mesh.current;
        if (!currentMesh) return;

        const time = state.clock.getElapsedTime();
        state.invalidate(); // Request next frame for demand mode

        for (const [i, particle] of particles.entries()) {
            // Move up (3x speed to compensate for skipped frames)
            particle.y += particle.speed * 3;

            // Loop functionality
            if (particle.y > topHeight) {
                particle.y = 0;
                particle.x = (particle.offset / Math.PI - 1) * 7.5;
            }

            const wiggleX = Math.sin(time * 2 + particle.offset) * 0.2;
            dummy.position.set(particle.x + wiggleX, particle.y, particle.z);

            const stretch = 1 + particle.speed * 10;
            dummy.scale.set(0.05, stretch * 0.2, 0.05);

            dummy.updateMatrix();
            currentMesh.setMatrixAt(i, dummy.matrix);
        }
        currentMesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            <instancedMesh ref={mesh} args={[undefined, undefined, 100]}>
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
