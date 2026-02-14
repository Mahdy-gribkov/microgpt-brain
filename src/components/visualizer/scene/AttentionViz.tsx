import * as THREE from "three";
import React, { useMemo } from "react";
import { Line } from "@react-three/drei";
import { SCENE_CONFIG } from "@/lib/visualizer-constants";

interface AttentionVizProps {
    attentionScores: number[][][]; // [head][seq][seq]
    numTokens: number;
}

export default function AttentionViz({ attentionScores }: AttentionVizProps) {
    const lines = useMemo(() => {
        const segments: React.ReactNode[] = [];
        const seqLen = attentionScores[0].length;
        const startX = -((seqLen - 1) * SCENE_CONFIG.TOKEN_SPACING) / 2;

        for (let head = 0; head < attentionScores.length; head++) {
            for (let i = 0; i < seqLen; i++) {
                for (let j = 0; j <= i; j++) { // Causal
                    const weight = attentionScores[head][i][j];
                    if (weight > 0.2) {
                        const x1 = startX + i * SCENE_CONFIG.TOKEN_SPACING;
                        const x2 = startX + j * SCENE_CONFIG.TOKEN_SPACING;

                        // Arc
                        const dist = Math.abs(x1 - x2);
                        const height = dist * 0.5 + 0.5;
                        const curve = new THREE.QuadraticBezierCurve3( // Cubic for smoother?
                            new THREE.Vector3(x1, 0, 0),
                            new THREE.Vector3((x1 + x2) / 2, height, 0),
                            new THREE.Vector3(x2, 0, 0)
                        );
                        const points = curve.getPoints(20);

                        segments.push(
                            <Line
                                key={`${head}-${i}-${j}`}
                                points={points}
                                color={SCENE_CONFIG.COLORS.accent}
                                transparent
                                opacity={weight}
                                lineWidth={weight * 2} // Thicker for stronger weights
                            />
                        );
                    }
                }
            }
        }
        return segments;
    }, [attentionScores]);

    return <group>{lines}</group>;
}
