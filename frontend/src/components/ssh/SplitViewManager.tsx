import { memo } from 'react';
import { TerminalPane } from './TerminalPane';
import { useSSHStore } from '@/stores/sshStore';
import type { SSHPane } from '@/types/ssh';
import { cn } from '@/lib/utils';

export const SplitViewManager = memo(() => {
  const { tabs, activeTabId } = useSSHStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 bg-gray-950">
        <div className="text-center">
          <p className="text-lg mb-2">No active tab</p>
          <p className="text-sm text-gray-500">Create a new tab to get started</p>
        </div>
      </div>
    );
  }

  return <PaneRenderer pane={activeTab.rootPane} />;
});

const PaneRenderer = memo<{ pane: SSHPane }>(({ pane }) => {
  const { splitPane, closePane } = useSSHStore();

  // Leaf pane - render terminal
  if (!pane.children) {
    return (
      <div className="h-full w-full relative group">
        <TerminalPane paneId={pane.id} sessionId={pane.sessionId} serverId={pane.serverId} />

        {/* Split controls - shown on hover */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
          <button
            onClick={() => splitPane(pane.id, 'horizontal')}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 border border-gray-700"
            title="Split Horizontally (Cmd+Shift+D)"
          >
            <span className="inline-block transform rotate-90">⬌</span>
          </button>
          <button
            onClick={() => splitPane(pane.id, 'vertical')}
            className="px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 border border-gray-700"
            title="Split Vertically (Cmd+D)"
          >
            ⬍
          </button>
          <button
            onClick={() => closePane(pane.id)}
            className="px-2 py-1 bg-red-800 hover:bg-red-700 rounded text-xs text-gray-300 border border-red-700"
            title="Close Pane (Cmd+W)"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  // Split pane - render children
  const [left, right] = pane.children;
  const isHorizontal = pane.orientation === 'horizontal';
  const splitPercentage = pane.size || 50;

  return (
    <div className={cn('h-full w-full flex', isHorizontal ? 'flex-row' : 'flex-col')}>
      {/* First pane */}
      <div style={{ [isHorizontal ? 'width' : 'height']: `${splitPercentage}%` }} className="overflow-hidden">
        <PaneRenderer pane={left} />
      </div>

      {/* Resizable divider */}
      <div
        className={cn(
          'bg-gray-800 hover:bg-cyan-600 transition-colors cursor-col-resize',
          isHorizontal ? 'w-1 h-full' : 'h-1 w-full',
          isHorizontal ? 'cursor-ew-resize' : 'cursor-ns-resize'
        )}
      />

      {/* Second pane */}
      <div style={{ [isHorizontal ? 'width' : 'height']: `${100 - splitPercentage}%` }} className="overflow-hidden">
        <PaneRenderer pane={right} />
      </div>
    </div>
  );
});

SplitViewManager.displayName = 'SplitViewManager';
PaneRenderer.displayName = 'PaneRenderer';
