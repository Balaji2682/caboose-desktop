import { useProcessStore } from '../../stores/processStore'
import { useLogStore } from '../../stores/logStore'
import { useAppStore } from '../../stores/appStore'

export function StatusBar() {
  const { processes } = useProcessStore()
  const { logs } = useLogStore()
  const { framework, theme, setTheme } = useAppStore()

  const runningCount = processes.filter((p) => p.status === 'running').length
  const totalCount = processes.length
  const errorCount = logs.filter((l) => l.level === 'error' || l.level === 'fatal').length

  const themes = [
    { id: 'theme-tokyo-night', name: 'Tokyo Night' },
    { id: 'theme-dracula', name: 'Dracula' },
    { id: 'theme-nord', name: 'Nord' },
  ]

  return (
    <div className="h-6 bg-background border-t border-border flex items-center justify-between px-3 text-xs text-muted">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Framework */}
        {framework && (
          <span className="flex items-center gap-1">
            <span className="text-primary">◆</span>
            <span>{framework}</span>
          </span>
        )}

        {/* Process Status */}
        <span className="flex items-center gap-1">
          <span className={runningCount > 0 ? 'text-green-400' : 'text-muted'}>●</span>
          <span>
            {runningCount}/{totalCount} processes
          </span>
        </span>

        {/* Error Count */}
        {errorCount > 0 && (
          <span className="flex items-center gap-1 text-red-400">
            <span>⚠</span>
            <span>{errorCount} errors</span>
          </span>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Keyboard Shortcut Hint */}
        <span className="text-muted/70">
          <kbd className="px-1 py-0.5 rounded bg-border text-foreground text-[10px]">⌘K</kbd>
          {' '}Command Palette
        </span>

        {/* Theme Selector */}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          className="bg-transparent border-none text-xs text-muted focus:outline-none cursor-pointer"
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
