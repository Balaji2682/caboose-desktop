import { useEffect } from 'react';
import { useSSHStore } from '@/stores/sshStore';

interface UseSSHKeyboardShortcutsOptions {
  onNewServer?: () => void;
  enabled?: boolean;
}

export const useSSHKeyboardShortcuts = (options: UseSSHKeyboardShortcutsOptions = {}) => {
  const { enabled = true, onNewServer } = options;
  const {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    setActiveTab,
    toggleServerList,
  } = useSSHStore();

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Cmd/Ctrl+T: New Tab
      if (modKey && e.key === 't') {
        e.preventDefault();
        const newTabNumber = tabs.length + 1;
        createTab(`Session ${newTabNumber}`);
        return;
      }

      // Cmd/Ctrl+W: Close Active Tab
      if (modKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabId && tabs.length > 1) {
          closeTab(activeTabId);
        }
        return;
      }

      // Cmd/Ctrl+1-9: Switch to Tab
      if (modKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabIndex < tabs.length) {
          setActiveTab(tabs[tabIndex].id);
        }
        return;
      }

      // Cmd/Ctrl+N: New Server
      if (modKey && e.key === 'n') {
        e.preventDefault();
        if (onNewServer) {
          onNewServer();
        }
        return;
      }

      // Cmd/Ctrl+B: Toggle Server List
      if (modKey && e.key === 'b') {
        e.preventDefault();
        toggleServerList();
        return;
      }

      // Cmd/Ctrl+Shift+F: Focus Search (future feature)
      if (modKey && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        // TODO: Implement server search
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    enabled,
    tabs,
    activeTabId,
    createTab,
    closeTab,
    setActiveTab,
    toggleServerList,
    onNewServer,
  ]);
};
