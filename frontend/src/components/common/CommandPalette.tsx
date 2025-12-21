import { Command } from 'cmdk'
import { useAppStore } from '../../stores/appStore'
import { useProcessStore } from '../../stores/processStore'
import { useLogStore } from '../../stores/logStore'

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, setSelectedView, setTheme } = useAppStore()
  const { processes, startProcess, stopProcess, restartProcess } = useProcessStore()
  const { clearLogs } = useLogStore()

  if (!commandPaletteOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => setCommandPaletteOpen(false)}
      />

      {/* Command Dialog */}
      <Command
        className="relative w-full max-w-lg bg-background border border-border rounded-lg shadow-2xl overflow-hidden"
        loop
      >
        <Command.Input
          placeholder="Type a command or search..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b border-border outline-none placeholder:text-muted"
        />

        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center text-sm text-muted">
            No results found.
          </Command.Empty>

          {/* Views */}
          <Command.Group heading="Views" className="px-2 py-1.5 text-xs text-muted">
            <Command.Item
              onSelect={() => {
                setSelectedView('logs')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              📋 Logs
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setSelectedView('queries')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              🔍 Query Analysis
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setSelectedView('debug')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              🐛 Debug Panel
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setSelectedView('health')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              💚 Database Health
            </Command.Item>
          </Command.Group>

          {/* Process Actions */}
          {processes.length > 0 && (
            <Command.Group heading="Processes" className="px-2 py-1.5 text-xs text-muted">
              {processes.map((process) => (
                <Command.Item
                  key={process.name}
                  onSelect={() => {
                    if (process.status === 'running') {
                      restartProcess(process.name)
                    } else {
                      startProcess(process.name)
                    }
                    setCommandPaletteOpen(false)
                  }}
                  className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
                >
                  {process.status === 'running' ? '🔄' : '▶️'} {process.name}
                  <span className="text-muted ml-2">
                    ({process.status === 'running' ? 'restart' : 'start'})
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Actions */}
          <Command.Group heading="Actions" className="px-2 py-1.5 text-xs text-muted">
            <Command.Item
              onSelect={() => {
                clearLogs()
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              🗑️ Clear Logs
            </Command.Item>
            <Command.Item
              onSelect={() => {
                processes.forEach((p) => {
                  if (p.status !== 'running') startProcess(p.name)
                })
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              ▶️ Start All Processes
            </Command.Item>
            <Command.Item
              onSelect={() => {
                processes.forEach((p) => {
                  if (p.status === 'running') stopProcess(p.name)
                })
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              ⏹️ Stop All Processes
            </Command.Item>
          </Command.Group>

          {/* Themes */}
          <Command.Group heading="Themes" className="px-2 py-1.5 text-xs text-muted">
            <Command.Item
              onSelect={() => {
                setTheme('theme-tokyo-night')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              🌃 Tokyo Night
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setTheme('theme-dracula')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              🧛 Dracula
            </Command.Item>
            <Command.Item
              onSelect={() => {
                setTheme('theme-nord')
                setCommandPaletteOpen(false)
              }}
              className="px-2 py-1.5 text-sm rounded cursor-pointer hover:bg-border/50 aria-selected:bg-border"
            >
              ❄️ Nord
            </Command.Item>
          </Command.Group>
        </Command.List>

        {/* Footer */}
        <div className="px-3 py-2 text-xs text-muted border-t border-border flex justify-between">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </Command>
    </div>
  )
}
