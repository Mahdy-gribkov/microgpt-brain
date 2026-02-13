import { useFrame, useThree } from "@react-three/fiber";
import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { Html } from "@react-three/drei";
import { motion, AnimatePresence } from "framer-motion";

interface TourStep {
    target: THREE.Vector3;
    cameraPos: THREE.Vector3;
    title: string;
    description: string;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: new THREE.Vector3(0, 0, 0),
        cameraPos: new THREE.Vector3(0, 5, 20),
        title: "Input Embedding",
        description: "Text is converted into numerical vectors. Each token becomes a high-dimensional vector representing its semantic meaning."
    },
    {
        target: new THREE.Vector3(0, 15, 0),
        cameraPos: new THREE.Vector3(15, 20, 15),
        title: "Self-Attention",
        description: "The model looks at all other tokens to gather context. 'Heads' focus on different relationships (e.g., matching subject to verb)."
    },
    {
        target: new THREE.Vector3(0, 30, 0),
        cameraPos: new THREE.Vector3(-15, 35, 15),
        title: "Feed-Forward Network",
        description: "The 'brain' of the layer. It processes the information gathered by attention, applying non-linear transformations."
    },
    {
        target: new THREE.Vector3(0, 45, 0),
        cameraPos: new THREE.Vector3(0, 50, 20),
        title: "Output Probabilities",
        description: "The final layer predicts the next token. A 'Softmax' function converts scores into probabilities."
    }
];

export default function GuidedTour({ isActive, onEnd }: { isActive: boolean; onEnd: () => void }) {
    const { camera, controls } = useThree();
    const [stepIndex, setStepIndex] = useState(0);
    const progress = useRef(0);

    // Reset when activated
    useEffect(() => {
        if (isActive) {
            setStepIndex(0);
            progress.current = 0;
        }
    }, [isActive]);

    useFrame((state, delta) => {
        if (!isActive) return;

        const targetStep = TOUR_STEPS[stepIndex];
        const nextStep = TOUR_STEPS[Math.min(stepIndex + 1, TOUR_STEPS.length - 1)];

        // Smoothly interpolate camera position and lookAt
        // We use a simple lerp for now
        camera.position.lerp(targetStep.cameraPos, delta * 2);

        // Move controls target (if orbit controls are used)
        // @ts-ignore
        if (controls) {
            // @ts-ignore
            controls.target.lerp(targetStep.target, delta * 2);
            // @ts-ignore
            controls.update();
        }
    });

    const handleNext = () => {
        if (stepIndex < TOUR_STEPS.length - 1) {
            setStepIndex(prev => prev + 1);
        } else {
            onEnd();
        }
    };

    if (!isActive) return null;

    return (
        <Html position={[0, 0, 0]} fullscreen style={{ pointerEvents: 'none' }}>
            <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4 pointer-events-auto">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-black/80 backdrop-blur-md border border-white/20 p-6 rounded-xl text-white shadow-2xl"
                    >
                        <h3 className="text-2xl font-bold mb-2 text-purple-400">{TOUR_STEPS[stepIndex].title}</h3>
                        <p className="text-gray-300 mb-4 text-lg leading-relaxed">{TOUR_STEPS[stepIndex].description}</p>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-500">Step {stepIndex + 1} / {TOUR_STEPS.length}</span>
                            <button
                                onClick={handleNext}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-semibold transition-colors"
                            >
                                {stepIndex === TOUR_STEPS.length - 1 ? "Finish Tour" : "Next Step →"}
                            </button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </Html>
    );
}
