'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTrainingBridge } from '../contexts/TrainingContext';

export function SharedNav() {
  const pathname = usePathname();
  const { isTraining, currentStep, lossHistory } = useTrainingBridge();
  const totalSteps = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].step : 0;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-bg/80 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6">
      <Link href="/" className="text-amber font-bold text-lg tracking-tight mr-8 hover:opacity-80 transition-opacity">
        microGPT
      </Link>

      <div className="flex items-center gap-1">
        <NavLink href="/playground" active={pathname === '/playground'}>
          Playground
        </NavLink>
        <NavLink href="/visualizer" active={pathname === '/visualizer'}>
          Visualizer
        </NavLink>
      </div>

      {isTraining && (
        <div className="ml-auto flex items-center gap-2 text-xs font-mono text-amber/80">
          <span className="w-2 h-2 rounded-full bg-amber animate-pulse" />
          Training Step {currentStep}{totalSteps > 0 ? ` / ${totalSteps}` : ''}
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-amber/15 text-amber font-medium'
          : 'text-muted hover:text-text hover:bg-white/5'
      }`}
    >
      {children}
    </Link>
  );
}
