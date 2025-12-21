import { useEffect } from 'react'
import { useProcessStore, ProcessStatus } from '../../stores/processStore'
import { useLogStore } from '../../stores/logStore'

const statusColors: Record<ProcessStatus, string> = {
  stopped: 'bg-gray-500',
  starting: 'bg-yellow-500 animate-pulse',
  running: 'bg-green-500',
  crashed: 'bg-red-500',
  stopping: 'bg-yellow-500',
}

const statusLabels: Record<ProcessStatus, string> = {
  stopped: 'Stopped',
  starting: 'Starting...',
  running: 'Running',
  crashed: 'Crashed',
  stopping: 'Stopping...',
}

export function ProcessSidebar() {
  const { processes, selectedProcess, selectProcess, startProcess, stopProcess, restartProcess, fetchProcesses } = useProcessStore()
  const { setFilter } = useLogStore()

  useEffect(() => {
    fetchProcesses()
  }, [fetchProcesses])

  const handleProcessClick = (name: string) => {
    if (selectedProcess === name) {
      selectProcess(null)
      setFilter({ processName: undefined })
    } else {
      selectProcess(name)
      setFilter({ processName: name })
    }
  }

  const handleStart = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    startProcess(name)
  }

  const handleStop = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    stopProcess(name)
  }

  const handleRestart = (e: React.MouseEvent, name: string) => {
    e.stopPropagation()
    restartProcess(name)
  }

  return (
    <div className="h-full bg-background border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">Processes</h2>
      </div>

      {/* Process List */}
      <div className="flex-1 overflow-y-auto">
        {processes.length === 0 ? (
          <div className="p-4 text-sm text-muted">
            No processes configured.
            <br />
            Add processes to .caboose.toml
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {processes.map((process) => (
              <li
                key={process.name}
                onClick={() => handleProcessClick(process.name)}
                className={`p-3 cursor-pointer transition-colors hover:bg-border/50 ${
                  selectedProcess === process.name ? 'bg-border/70' : ''
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {/* Status Indicator */}
                  <div
                    className={`w-2 h-2 rounded-full ${statusColors[process.status]}`}
                    title={statusLabels[process.status]}
                  />
                  {/* Process Name */}
                  <span className="text-sm font-medium text-foreground truncate">
                    {process.name}
                  </span>
                </div>

                {/* Status & Controls */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted">
                    {statusLabels[process.status]}
                  </span>
                  <div className="flex gap-1">
                    {process.status === 'running' ? (
                      <>
                        <button
                          onClick={(e) => handleStop(e, process.name)}
                          className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        >
                          Stop
                        </button>
                        <button
                          onClick={(e) => handleRestart(e, process.name)}
                          className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                        >
                          Restart
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={(e) => handleStart(e, process.name)}
                        className="px-2 py-1 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                        disabled={process.status === 'starting'}
                      >
                        Start
                      </button>
                    )}
                  </div>
                </div>

                {/* Restart Count */}
                {process.restartCount > 0 && (
                  <div className="mt-1 text-xs text-muted">
                    Restarts: {process.restartCount}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-border">
        <button
          onClick={() => {
            processes.forEach((p) => {
              if (p.status === 'stopped') startProcess(p.name)
            })
          }}
          className="w-full px-3 py-2 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30"
        >
          Start All
        </button>
      </div>
    </div>
  )
}
