import { useEffect } from 'react'
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels'
import { ProcessSidebar } from './components/processes/ProcessSidebar'
import { LogViewer } from './components/logs/LogViewer'
import { StatusBar } from './components/layout/StatusBar'
import { CommandPalette } from './components/common/CommandPalette'
import { useAppStore } from './stores/appStore'

function App() {
  const { theme, initializeApp } = useAppStore()

  useEffect(() => {
    initializeApp()
  }, [initializeApp])

  return (
    <div className={`h-screen flex flex-col ${theme}`}>
      {/* Command Palette */}
      <CommandPalette />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full">
          {/* Process Sidebar */}
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <ProcessSidebar />
          </Panel>

          <PanelResizeHandle className="w-1 bg-border hover:bg-primary transition-colors cursor-col-resize" />

          {/* Main Content Area */}
          <Panel defaultSize={80}>
            <LogViewer />
          </Panel>
        </PanelGroup>
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  )
}

export default App
