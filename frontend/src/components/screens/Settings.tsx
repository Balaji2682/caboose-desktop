import { memo, useCallback } from 'react';
import { Bell, Palette, Keyboard, Database, Code, Save, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAppStore, type Theme } from '@/stores/appStore';

const accentColors = [
  { name: 'Cyan', color: 'bg-cyan-500' },
  { name: 'Blue', color: 'bg-blue-500' },
  { name: 'Purple', color: 'bg-purple-500' },
  { name: 'Green', color: 'bg-green-500' },
  { name: 'Orange', color: 'bg-orange-500' },
];

const SectionCard = memo<{
  icon: React.ElementType;
  title: string;
  iconColor: string;
  children: React.ReactNode;
}>(({ icon: Icon, title, iconColor, children }) => (
  <Card className="bg-gray-900 border-gray-800 overflow-hidden">
    <div className="p-4 border-b border-gray-800 flex items-center gap-3">
      <div className={cn('p-2 rounded-lg', iconColor)}>
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
    </div>
    <div className="p-6 space-y-4">{children}</div>
  </Card>
));

SectionCard.displayName = 'SectionCard';

const SettingRow = memo<{
  label: string;
  description?: string;
  children: React.ReactNode;
}>(({ label, description, children }) => (
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-white mb-1">{label}</p>
      {description && <p className="text-xs text-gray-500">{description}</p>}
    </div>
    {children}
  </div>
));

SettingRow.displayName = 'SettingRow';

export const Settings = memo(() => {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const handleThemeChange = useCallback(
    (newTheme: Theme) => {
      setTheme(newTheme);
    },
    [setTheme]
  );

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Settings</h1>
          <p className="text-sm text-gray-400">Customize your Caboose experience</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary">
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <Button>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Appearance */}
      <SectionCard icon={Palette} title="Appearance" iconColor="bg-purple-500/10 text-purple-400">
        <div>
          <label className="text-sm text-gray-400 block mb-3">Theme</label>
          <div className="grid grid-cols-3 gap-4">
            {/* Default Theme */}
            <button
              onClick={() => handleThemeChange('default')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'default'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-gray-950 via-gray-900 to-cyan-900" />
              </div>
              <p className="text-sm text-white font-medium">Default</p>
              <p className="text-xs text-gray-500 mt-1">Cyber Dark</p>
            </button>

            {/* Tokyo Night */}
            <button
              onClick={() => handleThemeChange('tokyo-night')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'tokyo-night'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-[#1a1b26] via-[#7aa2f7] to-[#bb9af7]" />
              </div>
              <p className="text-sm text-white font-medium">Tokyo Night</p>
              <p className="text-xs text-gray-500 mt-1">Modern Blue</p>
            </button>

            {/* Dracula */}
            <button
              onClick={() => handleThemeChange('dracula')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'dracula'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-[#282a36] via-[#bd93f9] to-[#ff79c6]" />
              </div>
              <p className="text-sm text-white font-medium">Dracula</p>
              <p className="text-xs text-gray-500 mt-1">Purple Pink</p>
            </button>

            {/* Nord */}
            <button
              onClick={() => handleThemeChange('nord')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'nord'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-[#2e3440] via-[#88c0d0] to-[#a3be8c]" />
              </div>
              <p className="text-sm text-white font-medium">Nord</p>
              <p className="text-xs text-gray-500 mt-1">Arctic Blue</p>
            </button>

            {/* Solarized Dark */}
            <button
              onClick={() => handleThemeChange('solarized-dark')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'solarized-dark'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-[#002b36] via-[#268bd2] to-[#2aa198]" />
              </div>
              <p className="text-sm text-white font-medium">Solarized</p>
              <p className="text-xs text-gray-500 mt-1">Classic Blue</p>
            </button>

            {/* Catppuccin */}
            <button
              onClick={() => handleThemeChange('catppuccin')}
              className={cn(
                'p-4 rounded-xl border-2 transition-all group',
                theme === 'catppuccin'
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              )}
            >
              <div className="w-full h-20 rounded-lg mb-3 overflow-hidden border border-gray-700">
                <div className="h-full bg-gradient-to-br from-[#1e1e2e] via-[#89b4fa] to-[#cba6f7]" />
              </div>
              <p className="text-sm text-white font-medium">Catppuccin</p>
              <p className="text-xs text-gray-500 mt-1">Mocha Latte</p>
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 block mb-3">Accent Color</label>
          <div className="flex items-center gap-3">
            {accentColors.map((color) => (
              <button
                key={color.name}
                className={cn(
                  'w-12 h-12 rounded-lg hover:scale-110 transition-transform',
                  color.color,
                  color.name === 'Cyan' && 'ring-2 ring-cyan-500 ring-offset-2 ring-offset-gray-900'
                )}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard icon={Bell} title="Notifications" iconColor="bg-cyan-500/10 text-cyan-400">
        <SettingRow label="Exception Alerts" description="Get notified when new exceptions occur">
          <Switch
            checked={settings.notifications.exceptions}
            onCheckedChange={(checked) => updateSettings('notifications', { exceptions: checked })}
          />
        </SettingRow>
        <SettingRow label="Slow Query Alerts" description="Alert when queries exceed threshold">
          <Switch
            checked={settings.notifications.slowQueries}
            onCheckedChange={(checked) => updateSettings('notifications', { slowQueries: checked })}
          />
        </SettingRow>
        <SettingRow label="Health Alerts" description="Database health score warnings">
          <Switch
            checked={settings.notifications.healthAlerts}
            onCheckedChange={(checked) => updateSettings('notifications', { healthAlerts: checked })}
          />
        </SettingRow>
        <SettingRow label="Test Failure Alerts" description="Test suite failure notifications">
          <Switch
            checked={settings.notifications.testFailures}
            onCheckedChange={(checked) => updateSettings('notifications', { testFailures: checked })}
          />
        </SettingRow>
      </SectionCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Monitoring */}
        <SectionCard icon={Database} title="Monitoring" iconColor="bg-green-500/10 text-green-400">
          <SettingRow label="Auto Refresh" description="Automatically update metrics">
            <Switch
              checked={settings.monitoring.autoRefresh}
              onCheckedChange={(checked) => updateSettings('monitoring', { autoRefresh: checked })}
            />
          </SettingRow>

          <div>
            <label className="text-sm text-white mb-2 block">Refresh Interval (seconds)</label>
            <Input
              type="number"
              value={settings.monitoring.refreshInterval}
              onChange={(e) =>
                updateSettings('monitoring', { refreshInterval: parseInt(e.target.value) || 5 })
              }
              min="1"
              max="60"
            />
          </div>

          <div>
            <label className="text-sm text-white mb-2 block">Slow Query Threshold (ms)</label>
            <Input
              type="number"
              value={settings.database.slowQueryThreshold}
              onChange={(e) =>
                updateSettings('database', { slowQueryThreshold: parseInt(e.target.value) || 100 })
              }
              min="10"
              max="5000"
            />
          </div>
        </SectionCard>

        {/* Keyboard Shortcuts */}
        <SectionCard icon={Keyboard} title="Keyboard Shortcuts" iconColor="bg-blue-500/10 text-blue-400">
          <SettingRow label="Vim Mode" description="Enable j/k navigation">
            <Switch
              checked={settings.keyboard.enableVimMode}
              onCheckedChange={(checked) => updateSettings('keyboard', { enableVimMode: checked })}
            />
          </SettingRow>

          <div className="space-y-3">
            {[
              { label: 'Command Palette', shortcut: '⌘ K' },
              { label: 'Quick Search', shortcut: '⌘ F' },
              { label: 'Toggle Sidebar', shortcut: '⌘ B' },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <span className="text-sm text-gray-400">{item.label}</span>
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">{item.shortcut}</kbd>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Editor Integration */}
      <SectionCard icon={Code} title="Editor Integration" iconColor="bg-yellow-500/10 text-yellow-400">
        <div>
          <label className="text-sm text-white mb-2 block">Editor</label>
          <select className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white outline-none focus:border-cyan-500 transition-colors">
            <option>VS Code</option>
            <option>Sublime Text</option>
            <option>Vim</option>
            <option>Emacs</option>
            <option>IntelliJ IDEA</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-white mb-2 block">Editor Path</label>
          <Input type="text" defaultValue="/usr/local/bin/code" placeholder="/usr/local/bin/code" className="font-mono" />
        </div>
      </SectionCard>

      {/* About */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Caboose</h2>
            <p className="text-sm text-gray-400 mb-2">Version 1.0.0</p>
            <p className="text-xs text-gray-500">Rails development companion built with Go and React</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary">Check for Updates</Button>
            <Button variant="secondary">Documentation</Button>
          </div>
        </div>
      </Card>
    </div>
  );
});

Settings.displayName = 'Settings';
