import { useEffect, useMemo, memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Toaster } from 'sonner';
import { Sidebar, StatusBar } from '@/components/layout';
import { CommandPalette } from '@/components/common/CommandPalette';
import {
  Dashboard,
  ProcessManagement,
  RailsConsole,
  QueryConsole,
  QueryAnalysis,
  DatabaseHealth,
  TestIntegration,
  ExceptionTracking,
  MetricsDashboard,
  Settings,
} from '@/components/screens';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore, type Screen } from '@/stores/appStore';
import { cn } from '@/lib/utils';

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

// Screen Router Component
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
      ssh: <div>SSH Manager</div>,
      settings: <Settings />,
    }),
    []
  );

  return (
    <div className="flex-1 overflow-hidden bg-background">
      {screens[activeScreen] || <Dashboard />}
    </div>
  );
});

ScreenRouter.displayName = 'ScreenRouter';

// Main App Component
function App() {
  const theme = useAppStore((s) => s.theme);
  const initializeApp = useAppStore((s) => s.initializeApp);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <TooltipProvider>
        <div className={cn('h-screen flex flex-col')}>
          {/* Command Palette */}
          <CommandPalette />

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(17, 24, 39, 0.9)', // Keep slightly opaque for toast or use var(--color-background)
                border: '1px solid var(--color-border)',
                color: 'var(--color-foreground)',
              },
            }}
          />

          {/* Main Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <ScreenRouter />
          </div>

          {/* Status Bar */}
          <StatusBar />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
