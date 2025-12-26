import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

export type Screen =
  | 'dashboard'
  | 'processes'
  | 'console'
  | 'query-console'
  | 'queries'
  | 'query-analysis'
  | 'database'
  | 'db-health'
  | 'tests'
  | 'exceptions'
  | 'metrics'
  | 'ssh'
  | 'settings';

export type Theme = 'default' | 'tokyo-night' | 'dracula' | 'nord' | 'solarized-dark' | 'catppuccin';

interface AppSettings {
  notifications: {
    exceptions: boolean;
    slowQueries: boolean;
    healthAlerts: boolean;
    testFailures: boolean;
  };
  monitoring: {
    autoRefresh: boolean;
    refreshInterval: number;
    enableMetrics: boolean;
  };
  database: {
    slowQueryThreshold: number;
    enableQueryLogging: boolean;
  };
  keyboard: {
    enableVimMode: boolean;
  };
}

interface AppState {
  // UI State
  theme: Theme;
  activeScreen: Screen;
  commandPaletteOpen: boolean;
  sidebarCollapsed: boolean;

  // Connection State
  isConnected: boolean;
  connectionInfo: {
    host: string;
    port: number;
    railsVersion: string;
    environment: string;
  } | null;

  // Settings
  settings: AppSettings;

  // Actions
  setTheme: (theme: Theme) => void;
  setActiveScreen: (screen: Screen) => void;
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setConnectionInfo: (info: AppState['connectionInfo']) => void;
  updateSettings: <K extends keyof AppSettings>(
    category: K,
    updates: Partial<AppSettings[K]>
  ) => void;
  initializeApp: () => void;
}

const defaultSettings: AppSettings = {
  notifications: {
    exceptions: true,
    slowQueries: true,
    healthAlerts: true,
    testFailures: true,
  },
  monitoring: {
    autoRefresh: true,
    refreshInterval: 5,
    enableMetrics: true,
  },
  database: {
    slowQueryThreshold: 100,
    enableQueryLogging: true,
  },
  keyboard: {
    enableVimMode: false,
  },
};

export const useAppStore = create<AppState>()(
  persist(
    immer((set) => ({
      // Initial State
      theme: 'default',
      activeScreen: 'dashboard',
      commandPaletteOpen: false,
      sidebarCollapsed: false,
      isConnected: true,
      connectionInfo: {
        host: 'localhost',
        port: 3000,
        railsVersion: '7.1.3',
        environment: 'development',
      },
      settings: defaultSettings,

      // Actions
      setTheme: (theme) =>
        set((state) => {
          state.theme = theme;
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
        }),

      setActiveScreen: (screen) =>
        set((state) => {
          state.activeScreen = screen;
        }),

      toggleCommandPalette: () =>
        set((state) => {
          state.commandPaletteOpen = !state.commandPaletteOpen;
        }),

      setCommandPaletteOpen: (open) =>
        set((state) => {
          state.commandPaletteOpen = open;
        }),

      toggleSidebar: () =>
        set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed;
        }),

      setSidebarCollapsed: (collapsed) =>
        set((state) => {
          state.sidebarCollapsed = collapsed;
        }),

      setConnectionInfo: (info) =>
        set((state) => {
          state.connectionInfo = info;
          state.isConnected = info !== null;
        }),

      updateSettings: (category, updates) =>
        set((state) => {
          state.settings[category] = { ...state.settings[category], ...updates };
        }),

      initializeApp: () => {
        // Apply theme on initialization
        const theme = useAppStore.getState().theme;
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

        // Set up keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
          // Command Palette: Cmd/Ctrl+K
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            set((state) => {
              state.commandPaletteOpen = !state.commandPaletteOpen;
            });
          }

          // Toggle Sidebar: Cmd/Ctrl+B
          if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
            e.preventDefault();
            set((state) => {
              state.sidebarCollapsed = !state.sidebarCollapsed;
            });
          }

          // Quick navigation shortcuts
          if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
            e.preventDefault();
            const screens: Screen[] = [
              'dashboard',
              'processes',
              'console',
              'query-console',
              'queries',
              'database',
              'tests',
              'exceptions',
              'metrics',
            ];
            const index = parseInt(e.key) - 1;
            if (screens[index]) {
              set((state) => {
                state.activeScreen = screens[index];
              });
            }
          }
        };

        window.addEventListener('keydown', handleKeyDown);
      },
    })),
    {
      name: 'caboose-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        settings: state.settings,
      }),
    }
  )
);
