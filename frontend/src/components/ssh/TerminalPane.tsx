import { memo, useRef, useEffect, useCallback, useState } from 'react';
import { Server } from 'lucide-react';
import { XTerminal, type XTerminalRef } from '@/components/terminal';
import { useSSHStore } from '@/stores/sshStore';
import { eventsAPI, isWailsEnv } from '@/lib/wails';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TerminalPaneProps {
  paneId: string;
  sessionId: string | null;
  serverId: string | null;
}

export const TerminalPane = memo<TerminalPaneProps>(({ paneId, sessionId, serverId }) => {
  const terminalRef = useRef<XTerminalRef>(null);
  const { servers, connectToServer, writeToSession, resizeSession, sessions } = useSSHStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const server = serverId ? servers.find((s) => s.id === serverId) : null;
  const session = sessionId ? sessions.get(sessionId) : null;

  // Handle terminal data (user input)
  const handleTerminalData = useCallback(
    (data: string) => {
      if (!sessionId) return;
      writeToSession(sessionId, data);
    },
    [sessionId, writeToSession]
  );

  // Handle terminal resize
  const handleTerminalResize = useCallback(
    (rows: number, cols: number) => {
      if (!sessionId) return;
      resizeSession(sessionId, rows, cols);
    },
    [sessionId, resizeSession]
  );

  // Listen for SSH output events
  useEffect(() => {
    if (!isWailsEnv() || !sessionId) return;

    const unsubscribe = eventsAPI.on('ssh:output', (data: any) => {
      if (data.sessionId === sessionId && data.content) {
        terminalRef.current?.write(data.content);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId]);

  // Handle connect button click
  const handleConnect = useCallback(async () => {
    if (!serverId) return;

    setIsConnecting(true);
    try {
      await connectToServer(serverId, paneId);
      // Focus terminal after connection
      setTimeout(() => {
        terminalRef.current?.focus();
      }, 100);
    } catch (err) {
      console.error('Failed to connect:', err);
      terminalRef.current?.writeln(`\x1b[31mFailed to connect: ${err}\x1b[0m`);
    } finally {
      setIsConnecting(false);
    }
  }, [serverId, paneId, connectToServer]);

  // Auto-connect if server is set but no session
  useEffect(() => {
    if (serverId && !sessionId && !isConnecting) {
      handleConnect();
    }
  }, [serverId, sessionId, isConnecting, handleConnect]);

  // Show server selection UI if no server selected
  if (!serverId && !sessionId) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-950 border border-gray-800">
        <div className="text-center text-gray-400">
          <Server className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <p className="text-sm">No server selected</p>
          <p className="text-xs text-gray-600 mt-1">Select a server from the sidebar to connect</p>
        </div>
      </div>
    );
  }

  // Show connecting state
  if (isConnecting) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-950 border border-gray-800">
        <div className="text-center text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-sm">Connecting to {server?.name || 'server'}...</p>
          <p className="text-xs text-gray-600 mt-1">
            {server?.username}@{server?.host}:{server?.port || 22}
          </p>
        </div>
      </div>
    );
  }

  // Show reconnect UI if connection failed
  if (serverId && !sessionId && !isConnecting) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-950 border border-gray-800">
        <div className="text-center text-gray-400">
          <Server className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <p className="text-sm text-red-400 mb-2">Connection failed</p>
          <p className="text-xs text-gray-600 mb-4">
            {server?.username}@{server?.host}:{server?.port || 22}
          </p>
          <Button onClick={handleConnect} variant="outline" size="sm">
            Reconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-gray-950 border border-gray-800">
      {/* Header with server info */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-2 text-xs">
          <div
            className={cn(
              'w-2 h-2 rounded-full',
              session?.status === 'connected' ? 'bg-green-500' : 'bg-gray-500'
            )}
          />
          <span className="text-gray-400">
            {server?.username}@{server?.host}
          </span>
          {server?.port && server.port !== 22 && (
            <span className="text-gray-600">:{server.port}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {/* Health Indicator */}
          {session?.health && (
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  session.health.status === 'healthy' && 'bg-green-500',
                  session.health.status === 'degraded' && 'bg-yellow-500',
                  session.health.status === 'unhealthy' && 'bg-red-500'
                )}
                title={`Connection ${session.health.status}`}
              />
              <span className="text-gray-500">{session.health.latency}ms</span>
              {session.health.avgLatency !== session.health.latency && (
                <span className="text-gray-600">
                  (avg: {session.health.avgLatency}ms)
                </span>
              )}
            </div>
          )}
          {/* Tunnels */}
          {session?.tunnels && session.tunnels.length > 0 && (
            <span className="text-cyan-500">{session.tunnels.length} tunnel(s)</span>
          )}
        </div>
      </div>

      {/* Terminal */}
      <div className="flex-1">
        <XTerminal
          ref={terminalRef}
          onData={handleTerminalData}
          onResize={handleTerminalResize}
          disabled={!sessionId}
          className="h-full"
        />
      </div>
    </div>
  );
});

TerminalPane.displayName = 'TerminalPane';
