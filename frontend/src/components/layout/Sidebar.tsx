import { memo, useCallback } from 'react';
import {
  LayoutDashboard,
  Boxes,
  Database,
  Activity,
  FlaskConical,
  AlertTriangle,
  BarChart3,
  Settings as SettingsIcon,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Code2,
  Zap,
  GitBranch,
  Server,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAppStore, type Screen } from '@/stores/appStore';

interface NavItem {
  id: Screen;
  label: string;
  icon: LucideIcon;
  shortcut: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { id: 'processes', label: 'Processes', icon: Boxes, shortcut: '2' },
  { id: 'console', label: 'Rails Console', icon: Terminal, badge: 'New', shortcut: '3' },
  { id: 'query-console', label: 'Query Console', icon: Code2, badge: 'New', shortcut: '4' },
  { id: 'queries', label: 'Query Analysis', icon: Database, shortcut: '5' },
  { id: 'database', label: 'DB Health', icon: Activity, shortcut: '6' },
  { id: 'tests', label: 'Tests', icon: FlaskConical, shortcut: '7' },
  { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle, shortcut: '8' },
  { id: 'metrics', label: 'Metrics', icon: BarChart3, shortcut: '9' },
  { id: 'ssh', label: 'SSH', icon: Server, badge: 'New', shortcut: 'S' },
  { id: 'git', label: 'Git', icon: GitBranch, badge: 'New', shortcut: 'G' },
];

interface NavButtonProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
}

const NavButton = memo<NavButtonProps>(({ item, isActive, isCollapsed, onClick }) => {
  const Icon = item.icon;

  const button = (
    <button
      onClick={onClick}
      className={cn(
        'relative w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all group overflow-hidden',
        isActive ? 'text-foreground' : 'text-muted hover:text-foreground'
      )}
    >
      {isActive && (
        <>
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-purple-500/20" />
          <div className="absolute inset-0 border border-cyan-500/30 rounded-xl" />
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-xl" />
        </>
      )}

      {!isActive && (
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
      )}

      <div className={cn('relative z-10 transition-transform', isActive && 'scale-110')}>
        <Icon className="w-5 h-5 flex-shrink-0" />
      </div>

      {!isCollapsed && (
        <div className="relative z-10 flex items-center justify-between flex-1 min-w-0">
          <span className="text-sm font-medium truncate">{item.label}</span>
          <div className="flex items-center gap-2">
            {item.badge && <Badge variant="gradient">{item.badge}</Badge>}
            {!item.badge && (
              <kbd className="px-1.5 py-0.5 bg-black/30 border border-border rounded text-[10px] text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                ⌘{item.shortcut}
              </kbd>
            )}
          </div>
        </div>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-3">
          <span>{item.label}</span>
          {item.badge && <Badge variant="gradient">{item.badge}</Badge>}
          <kbd className="px-1.5 py-0.5 bg-black/30 border border-white/10 rounded text-[10px] text-gray-500">
            ⌘{item.shortcut}
          </kbd>
        </TooltipContent>
      </Tooltip>
    );
  }

  return button;
});

NavButton.displayName = 'NavButton';

const Logo = memo<{ isCollapsed: boolean }>(({ isCollapsed }) => (
  <div className="relative p-5 border-b border-white/5 flex items-center justify-between min-h-[84px]">
    {!isCollapsed ? (
      <div className="flex items-center gap-3 animate-fade-in">
        <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse-glow" />
          <div className="absolute inset-[2px] bg-black rounded-[14px]" />
          <Zap className="relative w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            Caboose
          </h1>
          <p className="text-xs text-gray-500">Rails Dev Suite</p>
        </div>
      </div>
    ) : (
      <div className="relative w-11 h-11 rounded-2xl flex items-center justify-center mx-auto overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 animate-pulse-glow" />
        <div className="absolute inset-[2px] bg-black rounded-[14px]" />
        <Zap className="relative w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
      </div>
    )}
  </div>
));

Logo.displayName = 'Logo';

const ConnectionStatus = memo<{ isCollapsed: boolean }>(({ isCollapsed }) => {
  const connectionInfo = useAppStore((s) => s.connectionInfo);

  if (isCollapsed || !connectionInfo) return null;

  return (
    <div className="relative p-4 border-t border-white/5 bg-gradient-to-b from-transparent to-black/20">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-75" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-300 font-medium">Connected</p>
          <p className="text-xs text-gray-500">
            {connectionInfo.host}:{connectionInfo.port}
          </p>
        </div>
        <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-xs text-green-400 font-medium">Rails {connectionInfo.railsVersion}</p>
        </div>
      </div>
    </div>
  );
});

ConnectionStatus.displayName = 'ConnectionStatus';

export const Sidebar = memo(() => {
  const activeScreen = useAppStore((s) => s.activeScreen);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setActiveScreen = useAppStore((s) => s.setActiveScreen);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const handleNavClick = useCallback(
    (screen: Screen) => {
      setActiveScreen(screen);
    },
    [setActiveScreen]
  );

  const handleCommandPaletteClick = useCallback(() => {
    setCommandPaletteOpen(true);
  }, [setCommandPaletteOpen]);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'relative bg-background/40 backdrop-blur-xl border-r border-border flex flex-col transition-all duration-300 ease-in-out',
          sidebarCollapsed ? 'w-20' : 'w-72'
        )}
      >
        {/* Animated gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        <Logo isCollapsed={sidebarCollapsed} />

        {/* Quick Command Bar */}
        {!sidebarCollapsed && (
          <div className="relative p-3">
            <button
              onClick={handleCommandPaletteClick}
              className="w-full px-3 py-2.5 rounded-xl bg-foreground/5 border border-border hover:border-cyan-500/50 transition-all group text-left"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted group-hover:text-foreground">Quick command...</span>
                <kbd className="px-2 py-0.5 bg-black/50 border border-border rounded text-xs text-muted">
                  ⌘K
                </kbd>
              </div>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="relative flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeScreen === item.id}
              isCollapsed={sidebarCollapsed}
              onClick={() => handleNavClick(item.id)}
            />
          ))}

          {/* Divider */}
          <div className="py-2">
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          {/* Settings */}
          <NavButton
            item={{
              id: 'settings',
              label: 'Settings',
              icon: SettingsIcon,
              shortcut: ',',
            }}
            isActive={activeScreen === 'settings'}
            isCollapsed={sidebarCollapsed}
            onClick={() => handleNavClick('settings')}
          />
        </nav>

        {/* Collapse Toggle */}
        <div className="relative p-3 border-t border-border">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-muted hover:text-foreground bg-white/0 hover:bg-foreground/5 transition-all group border border-transparent hover:border-border"
          >
            {sidebarCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>

        <ConnectionStatus isCollapsed={sidebarCollapsed} />
      </aside>
    </TooltipProvider>
  );
});

Sidebar.displayName = 'Sidebar';
