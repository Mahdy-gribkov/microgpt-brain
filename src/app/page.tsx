'use client';

import { useRef } from 'react';
import { GrainOverlay } from '../components/GrainOverlay';
import { HeroSection } from '../components/HeroSection';
import { Playground } from '../components/Playground';
import { InspirationSection } from '../components/InspirationSection';
import { RichFooter } from '../components/RichFooter';

export default function Home() {
  const playgroundRef = useRef<HTMLDivElement>(null);

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <GrainOverlay />
      <HeroSection
        onScrollToPlayground={scrollToPlayground}
        gpuAvailable={null}
        gpuName=""
      />
      <div ref={playgroundRef}>
        <Playground />
      </div>
      <InspirationSection />
      <RichFooter />
    </>
  );
}
