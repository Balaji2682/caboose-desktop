import { Suspense, lazy, useEffect, useMemo, memo, useCallback } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import { Sidebar, StatusBar } from '@/components/layout';
import { CommandPalette } from '@/components/common/CommandPalette';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore, type Screen } from '@/stores/appStore';
import { cn } from '@/lib/utils';

// Lazy load screen components for code splitting
const Dashboard = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.Dashboard }))
);
const ProcessManagement = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.ProcessManagement }))
);
const RailsConsole = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.RailsConsole }))
);
const QueryConsole = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.QueryConsole }))
);
const QueryAnalysis = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.QueryAnalysis }))
);
const DatabaseHealth = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.DatabaseHealth }))
);
const TestIntegration = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.TestIntegration }))
);
const ExceptionTracking = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.ExceptionTracking }))
);
const MetricsDashboard = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.MetricsDashboard }))
);
const SSHManager = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.SSHManager }))
);
const GitManager = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.GitManager }))
);
const Settings = lazy(() =>
  import('@/components/screens').then((mod) => ({ default: mod.Settings }))
);

// Loading fallback component
const LoadingFallback = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
  </div>
));
LoadingFallback.displayName = 'LoadingFallback';

// Error Fallback Component
const ErrorFallback = memo<{ error: Error; resetErrorBoundary: () => void }>(
  ({ error, resetErrorBoundary }) => (
    <div className="flex flex-col items-center justify-center h-full bg-background text-foreground p-8">
      <div className="glass rounded-2xl p-8 max-w-md text-center">
        <h2 className="text-xl font-bold text-red-400 mb-4">Something went wrong</h2>
        <p className="text-gray-400 mb-4 text-sm">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
);
ErrorFallback.displayName = 'ErrorFallback';

// Screen Router Component with lazy loading
const ScreenRouter = memo(() => {
  const activeScreen = useAppStore((s) => s.activeScreen);

  const screens: Record<Screen, React.ReactNode> = useMemo(
    () => ({
      dashboard: <Dashboard />,
      processes: <ProcessManagement />,
      console: <RailsConsole />,
      'query-console': <QueryConsole />,
      queries: <QueryAnalysis />,
      'query-analysis': <QueryAnalysis />,
      database: <DatabaseHealth />,
      'db-health': <DatabaseHealth />,
      tests: <TestIntegration />,
      exceptions: <ExceptionTracking />,
      metrics: <MetricsDashboard />,
      ssh: <SSHManager />,
      git: <GitManager />,
      settings: <Settings />,
    }),
    []
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <ErrorBoundary FallbackComponent={ErrorFallback} resetKeys={[activeScreen]}>
        {screens[activeScreen]}
      </ErrorBoundary>
    </Suspense>
  );
});
ScreenRouter.displayName = 'ScreenRouter';

// Main App Component
function AppOptimized() {
  const activeScreen = useAppStore((s) => s.activeScreen);
  const theme = useAppStore((s) => s.theme);

  // Apply theme on mount and when theme changes
  useEffect(() => {
    // Remove all theme classes
    document.documentElement.classList.remove(
      'theme-tokyo-night',
      'theme-dracula',
      'theme-nord',
      'theme-solarized-dark',
      'theme-catppuccin'
    );
    // Add the new theme class if not default
    if (theme !== 'default') {
      document.documentElement.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  // Preload next likely screens
  useEffect(() => {
    const preloadMap: Partial<Record<Screen, Screen[]>> = {
      dashboard: ['processes', 'metrics'],
      processes: ['console', 'dashboard'],
      'query-console': ['query-analysis'],
    };

    const toPreload = preloadMap[activeScreen];
    if (toPreload) {
      toPreload.forEach((screen) => {
        // Trigger lazy loading for likely next screens
        setTimeout(() => {
          switch (screen) {
            case 'processes':
              import('@/components/screens');
              break;
            case 'metrics':
              import('@/components/screens');
              break;
            // Add more cases as needed
          }
        }, 1000);
      });
    }
  }, [activeScreen]);

  return (
    <TooltipProvider delayDuration={300}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className={cn('flex h-screen w-screen bg-background overflow-hidden')}>
          {/* Sidebar */}
          <Sidebar />

          {/* Main Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Screen Content */}
            <main className="flex-1 overflow-hidden">
              <ScreenRouter />
            </main>

            {/* Status Bar */}
            <StatusBar />
          </div>

          {/* Command Palette */}
          <CommandPalette />

          {/* Toast Notifications */}
          <Toaster position="bottom-right" richColors closeButton />
        </div>
      </ErrorBoundary>
    </TooltipProvider>
  );
}

export default memo(AppOptimized);
