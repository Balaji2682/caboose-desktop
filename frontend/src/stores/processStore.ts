import { create } from 'zustand'

export type ProcessStatus = 'stopped' | 'starting' | 'running' | 'crashed' | 'stopping'

export interface Process {
  name: string
  command: string
  status: ProcessStatus
  pid?: number
  startedAt?: string
  exitCode?: number
  restartCount: number
  color: string
}

interface ProcessState {
  processes: Process[]
  selectedProcess: string | null
  loading: boolean

  // Actions
  setProcesses: (processes: Process[]) => void
  updateProcess: (name: string, updates: Partial<Process>) => void
  selectProcess: (name: string | null) => void
  startProcess: (name: string) => Promise<void>
  stopProcess: (name: string) => Promise<void>
  restartProcess: (name: string) => Promise<void>
  fetchProcesses: () => Promise<void>
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  processes: [],
  selectedProcess: null,
  loading: false,

  setProcesses: (processes) => set({ processes }),

  updateProcess: (name, updates) =>
    set((state) => ({
      processes: state.processes.map((p) =>
        p.name === name ? { ...p, ...updates } : p
      ),
    })),

  selectProcess: (name) => set({ selectedProcess: name }),

  startProcess: async (name) => {
    get().updateProcess(name, { status: 'starting' })
    try {
      // @ts-ignore - Wails binding
      await window.go.main.App.StartProcess(name)
    } catch (error) {
      console.error('Failed to start process:', error)
      get().updateProcess(name, { status: 'crashed' })
    }
  },

  stopProcess: async (name) => {
    get().updateProcess(name, { status: 'stopping' })
    try {
      // @ts-ignore - Wails binding
      await window.go.main.App.StopProcess(name)
    } catch (error) {
      console.error('Failed to stop process:', error)
    }
  },

  restartProcess: async (name) => {
    await get().stopProcess(name)
    await get().startProcess(name)
  },

  fetchProcesses: async () => {
    set({ loading: true })
    try {
      // @ts-ignore - Wails binding
      const processes = await window.go.main.App.GetProcesses()
      set({ processes: processes || [] })
    } catch (error) {
      console.error('Failed to fetch processes:', error)
    } finally {
      set({ loading: false })
    }
  },
}))
