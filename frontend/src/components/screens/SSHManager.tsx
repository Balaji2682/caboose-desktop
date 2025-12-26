import { memo, useEffect, useState } from 'react';
import { ServerList } from '@/components/ssh/ServerList';
import { SessionTabs } from '@/components/ssh/SessionTabs';
import { SplitViewManager } from '@/components/ssh/SplitViewManager';
import { ServerFormDialog } from '@/components/ssh/ServerFormDialog';
import { useSSHStore } from '@/stores/sshStore';
import { useSSHKeyboardShortcuts } from '@/hooks/useSSHKeyboardShortcuts';
import { PanelLeftClose, PanelLeft, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export const SSHManager = memo(() => {
  const { serverListCollapsed, toggleServerList, tabs, createTab } = useSSHStore();
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [shortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  // Keyboard shortcuts
  useSSHKeyboardShortcuts({
    onNewServer: () => setServerDialogOpen(true),
    enabled: true,
  });

  // Create initial tab if none exist
  useEffect(() => {
    if (tabs.length === 0) {
      createTab('Session 1');
    }
  }, [tabs.length, createTab]);

  return (
    <div className="h-full flex bg-gray-950">
      {/* Server List Sidebar */}
      {!serverListCollapsed && (
        <div className="w-64 border-r border-gray-800 flex-shrink-0">
          <ServerList />
        </div>
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header with sidebar toggle */}
        <div className="flex items-center bg-gray-900 border-b border-gray-800 px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleServerList}
            className="text-gray-400 hover:text-white mr-2"
            title={serverListCollapsed ? 'Show server list' : 'Hide server list'}
          >
            {serverListCollapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </Button>
          <h1 className="text-lg font-semibold text-white flex-1">SSH Manager</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShortcutsHelpOpen(true)}
            className="text-gray-400 hover:text-white"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Bar */}
        <SessionTabs />

        {/* Split View Panes */}
        <div className="flex-1 overflow-hidden">
          <SplitViewManager />
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between px-4 py-1 bg-gray-900 border-t border-gray-800 text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>Sessions: {tabs.length}</span>
            <span>Tunnels: 0</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Ready</span>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ServerFormDialog
        open={serverDialogOpen}
        onOpenChange={setServerDialogOpen}
        server={null}
        mode="add"
      />

      {/* Keyboard Shortcuts Help */}
      <Dialog open={shortcutsHelpOpen} onOpenChange={setShortcutsHelpOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Quick keyboard shortcuts for SSH Manager</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Tab Management</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">New Tab</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+T</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Close Tab</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+W</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Switch Tab (1-9)</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+1-9</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Navigation</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Toggle Server List</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+B</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">New Server</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+N</kbd>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white">Terminal</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Clear Terminal</span>
                  <kbd className="px-2 py-0.5 bg-gray-800 rounded text-xs">Cmd/Ctrl+K</kbd>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

SSHManager.displayName = 'SSHManager';
