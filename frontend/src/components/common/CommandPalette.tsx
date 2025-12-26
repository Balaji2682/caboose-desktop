import { memo, useCallback, useMemo } from 'react';
import { Command } from 'cmdk';
import {
  LayoutDashboard,
  Boxes,
  Database,
  Activity,
  FlaskConical,
  AlertTriangle,
  BarChart3,
  Settings,
  Terminal,
  Code2,
  Search,
  Command as CommandIcon,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore, type Screen } from '@/stores/appStore';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  keywords: string;
  action: () => void;
}

const CommandPaletteContent = memo(() => {
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const handleNavigate = useCallback(
    (screen: Screen) => {
      setActiveScreen(screen);
      setCommandPaletteOpen(false);
    },
    [setActiveScreen, setCommandPaletteOpen]
  );

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        keywords: 'home overview main',
        action: () => handleNavigate('dashboard'),
      },
      {
        id: 'processes',
        label: 'Process Management',
        icon: Boxes,
        keywords: 'server rails react processes start stop',
        action: () => handleNavigate('processes'),
      },
      {
        id: 'console',
        label: 'Rails Console',
        icon: Terminal,
        keywords: 'irb ruby console repl interactive',
        action: () => handleNavigate('console'),
      },
      {
        id: 'query-console',
        label: 'Query Console',
        icon: Code2,
        keywords: 'sql database query editor',
        action: () => handleNavigate('query-console'),
      },
      {
        id: 'queries',
        label: 'Query Analysis',
        icon: Database,
        keywords: 'sql queries n+1 performance database',
        action: () => handleNavigate('queries'),
      },
      {
        id: 'database',
        label: 'Database Health',
        icon: Activity,
        keywords: 'db health score indexes slow',
        action: () => handleNavigate('database'),
      },
      {
        id: 'tests',
        label: 'Test Integration',
        icon: FlaskConical,
        keywords: 'rspec minitest testing coverage',
        action: () => handleNavigate('tests'),
      },
      {
        id: 'exceptions',
        label: 'Exception Tracking',
        icon: AlertTriangle,
        keywords: 'errors exceptions bugs crashes',
        action: () => handleNavigate('exceptions'),
      },
      {
        id: 'metrics',
        label: 'Metrics Dashboard',
        icon: BarChart3,
        keywords: 'stats charts graphs analytics',
        action: () => handleNavigate('metrics'),
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        keywords: 'preferences config configuration theme',
        action: () => handleNavigate('settings'),
      },
    ],
    [handleNavigate]
  );

  return (
    <Command.List className="max-h-96 overflow-y-auto p-2">
      <Command.Empty className="p-8 text-center text-gray-500">
        <p>No results found</p>
      </Command.Empty>

      <div className="space-y-1">
        {commands.map((cmd) => {
          const Icon = cmd.icon;

          return (
            <Command.Item
              key={cmd.id}
              value={`${cmd.label} ${cmd.keywords}`}
              onSelect={cmd.action}
              className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left cursor-pointer data-[selected=true]:bg-gradient-to-r data-[selected=true]:from-cyan-500/20 data-[selected=true]:to-blue-500/20 data-[selected=true]:border data-[selected=true]:border-cyan-500/30 hover:bg-white/5"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 data-[selected=true]:bg-cyan-500/20">
                <Icon className="w-5 h-5 text-gray-400 data-[selected=true]:text-cyan-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-300">{cmd.label}</p>
                <p className="text-xs text-gray-500">{cmd.keywords.split(' ')[0]}</p>
              </div>
            </Command.Item>
          );
        })}
      </div>
    </Command.List>
  );
});

CommandPaletteContent.displayName = 'CommandPaletteContent';

export const CommandPalette = memo(() => {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const handleClose = useCallback(() => {
    setCommandPaletteOpen(false);
  }, [setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-start justify-center pt-32 animate-fade-in"
      onClick={handleClose}
    >
      <Command
        className="w-full max-w-2xl glass rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-white/20"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 p-5 border-b border-white/10">
          <Search className="w-5 h-5 text-cyan-400" />
          <Command.Input
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent outline-none text-gray-100 placeholder-gray-500 text-lg"
            autoFocus
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/10 border border-white/20 rounded-lg">
            <CommandIcon className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">K</span>
          </div>
        </div>

        <CommandPaletteContent />

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-white/5">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded">
                  ↑
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded">
                  ↓
                </kbd>
                <span className="ml-1">Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded">
                  ↵
                </kbd>
                <span className="ml-1">Select</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white/10 border border-white/20 rounded">
                ESC
              </kbd>
              <span className="ml-1">Close</span>
            </span>
          </div>
        </div>
      </Command>
    </div>
  );
});

CommandPalette.displayName = 'CommandPalette';
