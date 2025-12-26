import { memo, useEffect, useState } from 'react';
import { Plus, Server, Trash2, Edit, ChevronRight } from 'lucide-react';
import { useSSHStore } from '@/stores/sshStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ServerFormDialog } from './ServerFormDialog';
import type { SSHServer } from '@/types/ssh';

export const ServerList = memo(() => {
  const { servers, loadServers, setSelectedServer, selectedServerId, deleteServer } = useSSHStore();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['all']));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [editingServer, setEditingServer] = useState<SSHServer | null>(null);

  // Load servers on mount
  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Group servers by tags
  const safeServers = servers || [];
  const groupedServers: Record<string, SSHServer[]> = {
    all: safeServers,
  };

  safeServers.forEach((server) => {
    if (server.tags && server.tags.length > 0) {
      server.tags.forEach((tag) => {
        if (!groupedServers[tag]) {
          groupedServers[tag] = [];
        }
        groupedServers[tag].push(server);
      });
    }
  });

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) {
        next.delete(group);
      } else {
        next.add(group);
      }
      return next;
    });
  };

  const handleSelectServer = (serverId: string) => {
    setSelectedServer(serverId);
  };

  const handleDeleteServer = async (serverId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this server?')) {
      await deleteServer(serverId);
    }
  };

  const handleAddServer = () => {
    setDialogMode('add');
    setEditingServer(null);
    setDialogOpen(true);
  };

  const handleEditServer = (server: SSHServer, e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogMode('edit');
    setEditingServer(server);
    setDialogOpen(true);
  };

  const formatLastConnected = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">SSH Servers</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleAddServer}
          className="text-gray-400 hover:text-white"
          title="Add new server"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Server list */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(groupedServers).map(([groupName, groupServers]) => {
          if (groupServers.length === 0) return null;
          const isExpanded = expandedGroups.has(groupName);

          return (
            <div key={groupName} className="mb-2">
              {/* Group header */}
              <button
                onClick={() => toggleGroup(groupName)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-850 transition-colors"
              >
                <span className="uppercase">{groupName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{groupServers.length}</span>
                  <ChevronRight
                    className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')}
                  />
                </div>
              </button>

              {/* Server items */}
              {isExpanded &&
                groupServers.map((server) => {
                  const isSelected = selectedServerId === server.id;

                  return (
                    <div
                      key={server.id}
                      onClick={() => handleSelectServer(server.id)}
                      className={cn(
                        'px-4 py-2 cursor-pointer transition-colors group',
                        isSelected
                          ? 'bg-cyan-500/10 border-l-2 border-l-cyan-500'
                          : 'hover:bg-gray-850'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Server className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {server.name}
                              </p>
                              {server.color && (
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: server.color }}
                                />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {server.username}@{server.host}
                              {server.port && server.port !== 22 && `:${server.port}`}
                            </p>
                            <p className="text-xs text-gray-600 mt-0.5">
                              {formatLastConnected(server.lastConnected)}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleEditServer(server, e)}
                            className="p-1 text-gray-500 hover:text-white rounded"
                            title="Edit server"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteServer(server.id, e)}
                            className="p-1 text-gray-500 hover:text-red-400 rounded"
                            title="Delete server"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      {server.tags && server.tags.length > 0 && groupName === 'all' && (
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          {server.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-xs px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })}

        {/* Empty state */}
        {servers.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500">
            <Server className="w-12 h-12 mx-auto mb-3 text-gray-700" />
            <p className="text-sm mb-2">No servers configured</p>
            <p className="text-xs text-gray-600 mb-4">Add a server to get started</p>
            <Button variant="outline" size="sm" onClick={handleAddServer}>
              <Plus className="w-4 h-4 mr-2" />
              Add Server
            </Button>
          </div>
        )}
      </div>

      {/* Server Form Dialog */}
      <ServerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        server={editingServer}
        mode={dialogMode}
      />
    </div>
  );
});

ServerList.displayName = 'ServerList';
