import { memo, useState } from 'react';
import { Plus, X, Edit2, Check } from 'lucide-react';
import { useSSHStore } from '@/stores/sshStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const SessionTabs = memo(() => {
  const { tabs, activeTabId, createTab, closeTab, setActiveTab, renameTab } = useSSHStore();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleNewTab = () => {
    createTab(`Session ${tabs.length + 1}`);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleStartEdit = (tabId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tabId);
    setEditingName(currentName);
  };

  const handleSaveEdit = (tabId: string) => {
    if (editingName.trim()) {
      renameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === 'Enter') {
      handleSaveEdit(tabId);
    } else if (e.key === 'Escape') {
      setEditingTabId(null);
    }
  };

  // Create initial tab if none exist
  if (tabs.length === 0) {
    createTab('Session 1');
    return null;
  }

  return (
    <div className="flex items-center bg-gray-900 border-b border-gray-800 overflow-x-auto">
      {/* Tabs */}
      <div className="flex items-center flex-1 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isEditing = editingTabId === tab.id;

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 border-r border-gray-800 cursor-pointer transition-colors group relative',
                isActive
                  ? 'bg-gray-950 text-white border-t-2 border-t-cyan-500'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-850 hover:text-gray-300'
              )}
            >
              {/* Tab name or edit input */}
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, tab.id)}
                    onBlur={() => handleSaveEdit(tab.id)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-sm w-32 focus:outline-none focus:border-cyan-500"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveEdit(tab.id)}
                    className="text-green-500 hover:text-green-400"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate max-w-32">{tab.name}</span>
                  {tab.activeSessionCount > 0 && (
                    <span className="text-xs bg-cyan-500 text-white px-1.5 rounded">
                      {tab.activeSessionCount}
                    </span>
                  )}
                  {isActive && !isEditing && (
                    <button
                      onClick={(e) => handleStartEdit(tab.id, tab.name, e)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-gray-300 transition-opacity"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Close button */}
              {!isEditing && (
                <button
                  onClick={(e) => handleCloseTab(tab.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* New tab button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleNewTab}
        className="flex-shrink-0 mx-2 text-gray-400 hover:text-white"
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
});

SessionTabs.displayName = 'SessionTabs';
