'use client';

import { useRef } from 'react';
import { GrainOverlay } from '../components/GrainOverlay';
import { HeroSection } from '../components/HeroSection';
import { useGpuDetector } from '../hooks/useGpuDetector';
import { Playground } from '../components/Playground';
import { InspirationSection } from '../components/InspirationSection';
import { RichFooter } from '../components/RichFooter';
import VisualizerSection from '../components/VisualizerSection';

export default function Home() {
  const playgroundRef = useRef<HTMLDivElement>(null);
  const { available: gpuAvailable, gpuName } = useGpuDetector();

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <GrainOverlay />
      <HeroSection
        onScrollToPlayground={scrollToPlayground}
        gpuAvailable={gpuAvailable}
        gpuName={gpuName}
      />
      <div ref={playgroundRef}>
        <Playground />
      </div>
      <VisualizerSection />
      <InspirationSection />
      <RichFooter />
    </>
  );
}
