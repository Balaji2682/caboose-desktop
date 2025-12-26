import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Trash2, Download, Power, PowerOff, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { XTerminal, type XTerminalRef } from '@/components/terminal';
import { railsConsoleAPI, eventsAPI, isWailsEnv, type ConsoleOutputEvent } from '@/lib/wails';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface HistoryEntry {
  timestamp: Date;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
}

const snippets = [
  { label: 'Count Users', code: 'User.count' },
  { label: 'Last User', code: 'User.last' },
  { label: 'Published Posts', code: 'Post.where(published: true)' },
  { label: 'Clear Cache', code: 'Rails.cache.clear' },
  { label: 'Reload!', code: 'reload!' },
];

const multiLineSnippets = [
  {
    label: 'Each Block',
    code: `User.all.each do |user|
  puts user.email
end`,
  },
  {
    label: 'Transaction',
    code: `ActiveRecord::Base.transaction do
  # Your code here
end`,
  },
];

export const RailsConsole = memo(() => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [terminalSize, setTerminalSize] = useState({ rows: 24, cols: 80 });
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const terminalRef = useRef<XTerminalRef>(null);

  // Add to export history
  const addHistoryEntry = useCallback((type: HistoryEntry['type'], content: string) => {
    setHistory(prev => [...prev, { timestamp: new Date(), type, content }]);
  }, []);

  // Handle data from terminal (user input)
  const handleTerminalData = useCallback(async (data: string) => {
    if (status !== 'connected' || !isWailsEnv()) return;

    try {
      await railsConsoleAPI.write(data);
    } catch (err) {
      console.error('Failed to send data:', err);
    }
  }, [status]);

  // Handle terminal resize
  const handleTerminalResize = useCallback(async (rows: number, cols: number) => {
    setTerminalSize({ rows, cols });

    if (status === 'connected' && isWailsEnv()) {
      try {
        await railsConsoleAPI.resize(rows, cols);
      } catch (err) {
        console.error('Failed to resize terminal:', err);
      }
    }
  }, [status]);

  // Connect to Rails console
  const connect = useCallback(async () => {
    if (!isWailsEnv()) {
      terminalRef.current?.writeln('\x1b[33m[Demo Mode] Rails console not available outside Wails environment\x1b[0m');
      return;
    }

    setStatus('connecting');
    terminalRef.current?.writeln('\x1b[33mStarting Rails console...\x1b[0m');
    addHistoryEntry('system', 'Starting Rails console...');

    try {
      await railsConsoleAPI.start();
      setStatus('connected');

      // Send initial resize
      const size = terminalRef.current?.getTerminalSize();
      if (size) {
        await railsConsoleAPI.resize(size.rows, size.cols);
      }

      terminalRef.current?.focus();
    } catch (err) {
      setStatus('error');
      terminalRef.current?.writeln(`\x1b[31mFailed to start Rails console: ${err}\x1b[0m`);
      addHistoryEntry('error', `Failed to start Rails console: ${err}`);
    }
  }, [addHistoryEntry]);

  // Disconnect from Rails console
  const disconnect = useCallback(async () => {
    if (!isWailsEnv()) return;

    try {
      await railsConsoleAPI.stop();
      setStatus('disconnected');
      terminalRef.current?.writeln('\x1b[33mRails console disconnected.\x1b[0m');
      addHistoryEntry('system', 'Rails console disconnected.');
    } catch (err) {
      terminalRef.current?.writeln(`\x1b[31mFailed to stop Rails console: ${err}\x1b[0m`);
      addHistoryEntry('error', `Failed to stop Rails console: ${err}`);
    }
  }, [addHistoryEntry]);

  // Handle console output events from backend
  useEffect(() => {
    if (!isWailsEnv()) return;

    const unsubscribe = eventsAPI.on('console:output', (data: unknown) => {
      const event = data as ConsoleOutputEvent;
      if (event.process === 'rails-console' && event.content) {
        // Write output directly to terminal (already has ANSI codes)
        terminalRef.current?.write(event.content);

        // Check if this looks like an error for history
        const isError = event.content.includes('Error') ||
                       event.content.includes('Exception') ||
                       event.content.includes('NameError') ||
                       event.content.includes('SyntaxError') ||
                       event.content.includes('NoMethodError');
        addHistoryEntry(isError ? 'error' : 'output', event.content);
      }
    });

    // Check initial status
    railsConsoleAPI.isRunning().then((running) => {
      if (running) {
        setStatus('connected');
        terminalRef.current?.writeln('\x1b[33mReconnected to existing Rails console session.\x1b[0m');
        addHistoryEntry('system', 'Reconnected to existing Rails console session.');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [addHistoryEntry]);

  // Handle snippet click
  const handleSnippetClick = useCallback((code: string) => {
    if (status !== 'connected' || !isWailsEnv()) return;

    // Write snippet and execute
    railsConsoleAPI.write(code + '\n').catch(console.error);
    addHistoryEntry('input', code);
  }, [status, addHistoryEntry]);

  // Clear terminal
  const clearTerminal = useCallback(() => {
    terminalRef.current?.clear();
    setHistory([]);
  }, []);

  // Export history
  const exportHistory = useCallback(() => {
    const content = history
      .map((e) => `[${e.timestamp.toISOString()}] ${e.type.toUpperCase()}: ${e.content}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rails-console-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge variant="success">Connected</Badge>;
      case 'connecting':
        return <Badge variant="warning">Connecting...</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Disconnected</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Rails Console</h1>
          {getStatusBadge()}
          <span className="text-xs text-gray-500">
            {terminalSize.cols}x{terminalSize.rows}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'connected' ? (
            <Button variant="outline" size="sm" onClick={disconnect}>
              <PowerOff className="w-4 h-4" />
              Disconnect
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={connect}
              disabled={status === 'connecting'}
            >
              {status === 'connecting' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Power className="w-4 h-4" />
              )}
              Connect
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={clearTerminal}>
            <Trash2 className="w-4 h-4" />
            Clear
          </Button>
          <Button variant="outline" size="sm" onClick={exportHistory}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Quick Snippets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-sm text-gray-400 flex-shrink-0">Quick:</span>
        {snippets.map((snippet) => (
          <Button
            key={snippet.label}
            variant="ghost"
            size="sm"
            onClick={() => handleSnippetClick(snippet.code)}
            className="flex-shrink-0"
            disabled={status !== 'connected'}
          >
            {snippet.label}
          </Button>
        ))}
        <span className="text-gray-600 mx-2">|</span>
        <span className="text-sm text-gray-400 flex-shrink-0">Blocks:</span>
        {multiLineSnippets.map((snippet) => (
          <Button
            key={snippet.label}
            variant="ghost"
            size="sm"
            onClick={() => handleSnippetClick(snippet.code)}
            className="flex-shrink-0"
            disabled={status !== 'connected'}
          >
            {snippet.label}
          </Button>
        ))}
      </div>

      {/* Terminal */}
      <Card className="flex-1 bg-black border-gray-800 overflow-hidden">
        <XTerminal
          ref={terminalRef}
          onData={handleTerminalData}
          onResize={handleTerminalResize}
          disabled={status !== 'connected'}
          className="h-full"
        />
      </Card>

      {/* Tips */}
      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span>Type commands directly in terminal</span>
        <span>Ctrl+C to interrupt</span>
        <span>Ctrl+D for EOF</span>
        <span>Ctrl+L to clear screen</span>
      </div>
    </div>
  );
});

RailsConsole.displayName = 'RailsConsole';
