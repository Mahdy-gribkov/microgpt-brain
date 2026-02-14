'use client';

import { useRouter } from 'next/navigation';
import { HeroSection } from '../components/HeroSection';
import { InspirationSection } from '../components/InspirationSection';
import { RichFooter } from '../components/RichFooter';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { useGpuDetector } from '../hooks/useGpuDetector';

export default function Home() {
  const router = useRouter();
  const { available: gpuAvailable, gpuName } = useGpuDetector();

  const goToPlayground = () => router.push('/playground');
  const goToTour = () => router.push('/visualizer?tour=true');

  return (
    <main className="pt-14">
      <OnboardingOverlay onStartTraining={goToPlayground} onStartTour={goToTour} />
      <HeroSection
        onScrollToPlayground={goToPlayground}
        onStartTour={goToTour}
        gpuAvailable={gpuAvailable}
        gpuName={gpuName}
      />
      <InspirationSection />
      <RichFooter />
    </main>
  );
}
