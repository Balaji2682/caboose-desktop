import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { sshAPI, eventsAPI, isWailsEnv } from '@/lib/wails';
import type { SSHServer, SSHSession, SSHTab, SSHPane, SSHTunnel } from '@/types/ssh';

interface SSHState {
  // Saved servers
  servers: SSHServer[];

  // Active sessions
  sessions: Map<string, SSHSession>;

  // Tab/pane management
  tabs: SSHTab[];
  activeTabId: string | null;

  // UI state
  serverListCollapsed: boolean;
  selectedServerId: string | null;

  // Actions
  loadServers: () => Promise<void>;
  addServer: (server: SSHServer) => Promise<void>;
  updateServer: (server: SSHServer) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  connectToServer: (serverId: string, paneId: string) => Promise<void>;
  disconnectSession: (sessionId: string) => Promise<void>;
  writeToSession: (sessionId: string, data: string) => void;
  resizeSession: (sessionId: string, rows: number, cols: number) => void;

  // Tab management
  createTab: (name: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;

  // Pane management
  splitPane: (paneId: string, orientation: 'horizontal' | 'vertical') => void;
  closePane: (paneId: string) => void;
  findAndUpdatePane: (tabId: string, paneId: string, updater: (pane: SSHPane) => void) => void;

  // Tunnel management
  createTunnel: (sessionId: string, tunnel: SSHTunnel) => Promise<void>;

  // Export
  exportSession: (sessionId: string, format: 'csv' | 'txt') => Promise<void>;

  // UI actions
  toggleServerList: () => void;
  setSelectedServer: (serverId: string | null) => void;
}

export const useSSHStore = create<SSHState>()(
  persist(
    immer((set, get) => ({
      servers: [],
      sessions: new Map(),
      tabs: [],
      activeTabId: null,
      serverListCollapsed: false,
      selectedServerId: null,

      // Load servers from backend
      loadServers: async () => {
        if (!isWailsEnv()) return;
        try {
          const servers = await sshAPI.getServers();
          set((state) => {
            state.servers = servers || [];
          });
        } catch (err) {
          console.error('Failed to load SSH servers:', err);
          set((state) => {
            state.servers = [];
          });
        }
      },

      // Add a new server
      addServer: async (server: SSHServer) => {
        if (!isWailsEnv()) return;
        try {
          await sshAPI.saveServer(server);
          set((state) => {
            state.servers.push(server);
          });
        } catch (err) {
          console.error('Failed to add SSH server:', err);
          throw err;
        }
      },

      // Update an existing server
      updateServer: async (server: SSHServer) => {
        if (!isWailsEnv()) return;
        try {
          await sshAPI.saveServer(server);
          set((state) => {
            const index = state.servers.findIndex((s) => s.id === server.id);
            if (index !== -1) {
              state.servers[index] = server;
            }
          });
        } catch (err) {
          console.error('Failed to update SSH server:', err);
          throw err;
        }
      },

      // Delete a server
      deleteServer: async (id: string) => {
        if (!isWailsEnv()) return;
        try {
          await sshAPI.deleteServer(id);
          set((state) => {
            state.servers = state.servers.filter((s) => s.id !== id);
          });
        } catch (err) {
          console.error('Failed to delete SSH server:', err);
          throw err;
        }
      },

      // Connect to a server
      connectToServer: async (serverId: string, paneId: string) => {
        if (!isWailsEnv()) {
          console.warn('Not in Wails environment - SSH not available');
          return;
        }

        const server = get().servers.find((s) => s.id === serverId);
        if (!server) {
          console.error('Server not found:', serverId);
          return;
        }

        try {
          // Call backend to establish SSH connection
          const sessionId = await sshAPI.connect(serverId);

          // Add session to state
          set((state) => {
            state.sessions.set(sessionId, {
              id: sessionId,
              serverId: server.id,
              serverName: server.name,
              status: 'connected',
              connectedAt: new Date().toISOString(),
              tunnels: [],
            });

            // Update pane with session ID
            const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
            if (activeTab) {
              get().findAndUpdatePane(activeTab.id, paneId, (pane) => {
                pane.sessionId = sessionId;
                pane.serverId = serverId;
              });
            }
          });
        } catch (err) {
          console.error('Failed to connect to SSH server:', err);
          throw err;
        }
      },

      // Disconnect a session
      disconnectSession: async (sessionId: string) => {
        if (!isWailsEnv()) return;
        try {
          await sshAPI.disconnect(sessionId);
          set((state) => {
            state.sessions.delete(sessionId);

            // Clear pane session IDs
            for (const tab of state.tabs) {
              get().findAndUpdatePane(tab.id, '', (pane) => {
                if (pane.sessionId === sessionId) {
                  pane.sessionId = null;
                }
              });
            }
          });
        } catch (err) {
          console.error('Failed to disconnect SSH session:', err);
        }
      },

      // Write to a session
      writeToSession: (sessionId: string, data: string) => {
        if (!isWailsEnv()) return;
        sshAPI.write(sessionId, data).catch(console.error);
      },

      // Resize a session
      resizeSession: (sessionId: string, rows: number, cols: number) => {
        if (!isWailsEnv()) return;
        sshAPI.resize(sessionId, rows, cols).catch(console.error);
      },

      // Create a new tab
      createTab: (name: string) => {
        set((state) => {
          const newTab: SSHTab = {
            id: `tab-${Date.now()}`,
            name,
            rootPane: {
              id: `pane-${Date.now()}`,
              sessionId: null,
              serverId: null,
            },
            activeSessionCount: 0,
          };
          state.tabs.push(newTab);
          state.activeTabId = newTab.id;
        });
      },

      // Close a tab
      closeTab: (tabId: string) => {
        set((state) => {
          const tabIndex = state.tabs.findIndex((t) => t.id === tabId);
          if (tabIndex === -1) return;

          // Disconnect all sessions in this tab
          const tab = state.tabs[tabIndex];
          const sessionsToDisconnect: string[] = [];
          const collectSessions = (pane: SSHPane) => {
            if (pane.sessionId) {
              sessionsToDisconnect.push(pane.sessionId);
            }
            if (pane.children) {
              collectSessions(pane.children[0]);
              collectSessions(pane.children[1]);
            }
          };
          collectSessions(tab.rootPane);

          // Disconnect sessions
          for (const sessionId of sessionsToDisconnect) {
            get().disconnectSession(sessionId);
          }

          // Remove tab
          state.tabs.splice(tabIndex, 1);

          // Update active tab
          if (state.activeTabId === tabId) {
            state.activeTabId = state.tabs.length > 0 ? state.tabs[0].id : null;
          }
        });
      },

      // Set active tab
      setActiveTab: (tabId: string) => {
        set((state) => {
          state.activeTabId = tabId;
        });
      },

      // Rename a tab
      renameTab: (tabId: string, name: string) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (tab) {
            tab.name = name;
          }
        });
      },

      // Split a pane
      splitPane: (paneId: string, orientation: 'horizontal' | 'vertical') => {
        set((state) => {
          const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!activeTab) return;

          get().findAndUpdatePane(activeTab.id, paneId, (pane) => {
            // Create two new panes
            const leftPane: SSHPane = {
              id: `pane-${Date.now()}-left`,
              sessionId: pane.sessionId,
              serverId: pane.serverId,
            };
            const rightPane: SSHPane = {
              id: `pane-${Date.now()}-right`,
              sessionId: null,
              serverId: null,
            };

            // Convert current pane to a split pane
            pane.orientation = orientation;
            pane.size = 50;
            pane.children = [leftPane, rightPane];
            pane.sessionId = null;
            pane.serverId = null;
          });
        });
      },

      // Close a pane
      closePane: (paneId: string) => {
        set((state) => {
          const activeTab = state.tabs.find((t) => t.id === state.activeTabId);
          if (!activeTab) return;

          // Find parent of the pane to close
          const findParent = (pane: SSHPane, targetId: string): SSHPane | null => {
            if (pane.children) {
              if (pane.children[0].id === targetId || pane.children[1].id === targetId) {
                return pane;
              }
              const leftResult = findParent(pane.children[0], targetId);
              if (leftResult) return leftResult;
              const rightResult = findParent(pane.children[1], targetId);
              if (rightResult) return rightResult;
            }
            return null;
          };

          const parent = findParent(activeTab.rootPane, paneId);
          if (parent && parent.children) {
            // Disconnect session if active
            const paneToClose = parent.children[0].id === paneId ? parent.children[0] : parent.children[1];
            if (paneToClose.sessionId) {
              get().disconnectSession(paneToClose.sessionId);
            }

            // Replace parent with sibling
            const sibling = parent.children[0].id === paneId ? parent.children[1] : parent.children[0];
            Object.assign(parent, sibling);
          }
        });
      },

      // Helper to find and update a pane
      findAndUpdatePane: (tabId: string, paneId: string, updater: (pane: SSHPane) => void) => {
        set((state) => {
          const tab = state.tabs.find((t) => t.id === tabId);
          if (!tab) return;

          const findAndUpdate = (pane: SSHPane): boolean => {
            if (pane.id === paneId) {
              updater(pane);
              return true;
            }
            if (pane.children) {
              if (findAndUpdate(pane.children[0])) return true;
              if (findAndUpdate(pane.children[1])) return true;
            }
            return false;
          };

          findAndUpdate(tab.rootPane);
        });
      },

      // Create a tunnel
      createTunnel: async (sessionId: string, tunnel: SSHTunnel) => {
        if (!isWailsEnv()) return;
        try {
          await sshAPI.createTunnel(sessionId, tunnel);
          set((state) => {
            const session = state.sessions.get(sessionId);
            if (session) {
              session.tunnels.push(tunnel);
            }
          });
        } catch (err) {
          console.error('Failed to create SSH tunnel:', err);
          throw err;
        }
      },

      // Export session logs
      exportSession: async (sessionId: string, format: 'csv' | 'txt') => {
        if (!isWailsEnv()) return;
        try {
          const content = await sshAPI.exportSession(sessionId, format);
          const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ssh-session-${sessionId}-${new Date().toISOString().split('T')[0]}.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Failed to export SSH session:', err);
        }
      },

      // Toggle server list
      toggleServerList: () => {
        set((state) => {
          state.serverListCollapsed = !state.serverListCollapsed;
        });
      },

      // Set selected server
      setSelectedServer: (serverId: string | null) => {
        set((state) => {
          state.selectedServerId = serverId;
        });
      },
    })),
    {
      name: 'caboose-ssh-storage',
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
        serverListCollapsed: state.serverListCollapsed,
      }),
    }
  )
);

// Initialize SSH event listeners
if (isWailsEnv()) {
  eventsAPI.on('ssh:output', (data: any) => {
    // Handle SSH output events - terminals will listen to this
    // No store update needed, terminals handle this directly
  });

  eventsAPI.on('ssh:disconnect', (data: any) => {
    const sessionId = data.sessionId;
    useSSHStore.getState().disconnectSession(sessionId);
  });

  eventsAPI.on('ssh:health', (health: any) => {
    const { sessions } = useSSHStore.getState();
    const session = sessions.get(health.sessionId);
    if (session) {
      useSSHStore.setState((state) => {
        const updatedSession = {
          ...session,
          health: {
            sessionId: health.sessionId,
            status: health.status,
            latency: health.latency,
            avgLatency: health.avgLatency,
            packetLoss: health.packetLoss,
            lastCheckAt: health.lastCheckAt,
          },
        };
        state.sessions.set(health.sessionId, updatedSession);
      });
    }
  });
}
