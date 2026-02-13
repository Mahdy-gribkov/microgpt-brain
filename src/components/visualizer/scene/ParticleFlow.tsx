import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

export default function ParticleFlow({ topHeight }: { topHeight: number }) {
    const count = 200;
    const mesh = useRef<THREE.InstancedMesh>(null);

    // Random starting positions
    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const t = Math.random() * 100;
            const factor = 10; // width
            const speed = 0.01 + Math.random() * 0.05;
            const x = (Math.random() - 0.5) * factor;
            const z = (Math.random() - 0.5) * 4;
            const y = Math.random() * topHeight;
            temp.push({ t, speed, x, z, y });
        }
        return temp;
    }, [count, topHeight]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        const currentMesh = mesh.current;
        if (!currentMesh) return;

        particles.forEach((particle, i) => {
            particle.y += particle.speed;
            if (particle.y > topHeight) {
                particle.y = 0;
            }

            dummy.position.set(particle.x, particle.y, particle.z);
            dummy.scale.setScalar(0.05); // Small dots
            dummy.updateMatrix();
            currentMesh.setMatrixAt(i, dummy.matrix);
        });
        currentMesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={SCENE_CONFIG.COLORS.accent} transparent opacity={0.6} />
        </instancedMesh>
    );
}
