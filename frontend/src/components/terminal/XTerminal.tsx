import { memo, useRef, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';

export interface XTerminalRef {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  getTerminalSize: () => { rows: number; cols: number };
  fit: () => void;
}

interface XTerminalProps {
  onData?: (data: string) => void;
  onResize?: (rows: number, cols: number) => void;
  disabled?: boolean;
  className?: string;
  fontSize?: number;
  fontFamily?: string;
  theme?: 'dark' | 'light';
}

const DARK_THEME = {
  background: '#0a0a0a',
  foreground: '#f9fafb',
  cursor: '#06b6d4',
  cursorAccent: '#0a0a0a',
  selectionBackground: 'rgba(6, 182, 212, 0.3)',
  black: '#1f2937',
  red: '#ef4444',
  green: '#10b981',
  yellow: '#f59e0b',
  blue: '#3b82f6',
  magenta: '#8b5cf6',
  cyan: '#06b6d4',
  white: '#f9fafb',
  brightBlack: '#4b5563',
  brightRed: '#f87171',
  brightGreen: '#34d399',
  brightYellow: '#fbbf24',
  brightBlue: '#60a5fa',
  brightMagenta: '#a78bfa',
  brightCyan: '#22d3ee',
  brightWhite: '#ffffff',
};

export const XTerminal = memo(forwardRef<XTerminalRef, XTerminalProps>(({
  onData,
  onResize,
  disabled = false,
  className = '',
  fontSize = 14,
  fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    write: (data: string) => {
      terminalRef.current?.write(data);
    },
    writeln: (data: string) => {
      terminalRef.current?.writeln(data);
    },
    clear: () => {
      terminalRef.current?.clear();
    },
    focus: () => {
      terminalRef.current?.focus();
    },
    getTerminalSize: () => {
      const term = terminalRef.current;
      return { rows: term?.rows ?? 24, cols: term?.cols ?? 80 };
    },
    fit: () => {
      fitAddonRef.current?.fit();
    },
  }), []);

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      fontSize,
      fontFamily,
      theme: DARK_THEME,
      allowTransparency: true,
      scrollback: 10000,
      tabStopWidth: 2,
      convertEol: true,
      disableStdin: disabled,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);

    terminal.open(containerRef.current);

    // Initial fit after a small delay to ensure container is sized
    setTimeout(() => {
      fitAddon.fit();
      onResize?.(terminal.rows, terminal.cols);
    }, 50);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Handle data input from user
    const dataDisposable = terminal.onData((data) => {
      if (!disabled) {
        onData?.(data);
      }
    });

    // Handle terminal resize
    const resizeDisposable = terminal.onResize(({ rows, cols }) => {
      onResize?.(rows, cols);
    });

    // Setup resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        fitAddon.fit();
      }, 100);
    });

    resizeObserver.observe(containerRef.current);
    resizeObserverRef.current = resizeObserver;

    return () => {
      dataDisposable.dispose();
      resizeDisposable.dispose();
      resizeObserver.disconnect();
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    };
  }, [fontSize, fontFamily, disabled, onData, onResize]);

  // Handle disabled state changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.options.disableStdin = disabled;
    }
  }, [disabled]);

  const handleClick = useCallback(() => {
    terminalRef.current?.focus();
  }, []);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      onClick={handleClick}
      style={{
        backgroundColor: DARK_THEME.background,
        padding: '8px',
      }}
    />
  );
}));

XTerminal.displayName = 'XTerminal';
