import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  theme: string
  commandPaletteOpen: boolean
  selectedView: 'logs' | 'queries' | 'debug' | 'tests' | 'health'
  framework: string | null

  // Actions
  setTheme: (theme: string) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setSelectedView: (view: AppState['selectedView']) => void
  setFramework: (framework: string) => void
  initializeApp: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'theme-tokyo-night',
      commandPaletteOpen: false,
      selectedView: 'logs',
      framework: null,

      setTheme: (theme) => set({ theme }),

      toggleCommandPalette: () =>
        set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),

      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

      setSelectedView: (view) => set({ selectedView: view }),

      setFramework: (framework) => set({ framework }),

      initializeApp: () => {
        // Set up keyboard shortcuts
        const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault()
            set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }))
          }
        }
        window.addEventListener('keydown', handleKeyDown)

        // TODO: Initialize Wails bindings and event listeners
      },
    }),
    {
      name: 'caboose-app-storage',
      partialize: (state) => ({
        theme: state.theme,
        selectedView: state.selectedView,
      }),
    }
  )
)
