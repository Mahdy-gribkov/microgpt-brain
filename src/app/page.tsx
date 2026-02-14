'use client';

import { useRef, useState } from 'react';
import { GrainOverlay } from '../components/GrainOverlay';
import { HeroSection } from '../components/HeroSection';
import { useGpuDetector } from '../hooks/useGpuDetector';
import { Playground } from '../components/Playground';
import { InspirationSection } from '../components/InspirationSection';
import { RichFooter } from '../components/RichFooter';
import VisualizerSection from '../components/VisualizerSection';
import { TrainingBridgeProvider } from '../contexts/TrainingContext';
import { OnboardingOverlay } from '../components/OnboardingOverlay';

export default function Home() {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const visualizerRef = useRef<HTMLDivElement>(null);
  const { available: gpuAvailable, gpuName } = useGpuDetector();
  const [startTour, setStartTour] = useState(false);

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartTour = () => {
    setStartTour(true);
    visualizerRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Reset after a delay so it can be triggered again if needed, 
    // though the tour component handles its own internal state once started.
    setTimeout(() => setStartTour(false), 1000);
  };

  return (
    <TrainingBridgeProvider>
      <OnboardingOverlay onStartTraining={scrollToPlayground} onStartTour={handleStartTour} />
      <GrainOverlay />
      <HeroSection
        onScrollToPlayground={scrollToPlayground}
        onStartTour={handleStartTour}
        gpuAvailable={gpuAvailable}
        gpuName={gpuName}
      />
      <div ref={playgroundRef}>
        <Playground />
      </div>
      <div ref={visualizerRef}>
        <VisualizerSection startTour={startTour} />
      </div>
      <InspirationSection />
      <RichFooter />
    </TrainingBridgeProvider>
  );
}
