'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VisualizerSection from '../../components/VisualizerSection';

function VisualizerContent() {
  const searchParams = useSearchParams();
  const startTour = searchParams.get('tour') === 'true';

  return <VisualizerSection startTour={startTour} forceMount />;
}

export default function VisualizerPage() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-white/20 font-mono text-xs">Loading Visualizer...</div>}>
      <VisualizerContent />
    </Suspense>
  );
}
