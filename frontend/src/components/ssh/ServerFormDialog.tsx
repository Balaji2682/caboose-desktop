import { memo, useState, useEffect } from 'react';
import { Server, Key, Hash } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useSSHStore } from '@/stores/sshStore';
import type { SSHServer } from '@/types/ssh';

interface ServerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server?: SSHServer | null;
  mode: 'add' | 'edit';
}

export const ServerFormDialog = memo<ServerFormDialogProps>(
  ({ open, onOpenChange, server, mode }) => {
    const { addServer, updateServer } = useSSHStore();

    // Form state
    const [formData, setFormData] = useState<Partial<SSHServer>>({
      name: '',
      host: '',
      port: 22,
      username: '',
      authMethod: 'agent',
      privateKeyPath: '',
      useAgent: true,
      tags: [],
      color: '#06b6d4',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState('');

    // Initialize form data when server changes or dialog opens
    useEffect(() => {
      if (open) {
        if (server && mode === 'edit') {
          setFormData({
            ...server,
            tags: server.tags || [],
          });
        } else {
          // Reset for add mode
          setFormData({
            name: '',
            host: '',
            port: 22,
            username: '',
            authMethod: 'agent',
            privateKeyPath: '',
            useAgent: true,
            tags: [],
            color: '#06b6d4',
          });
        }
        setErrors({});
        setTagInput('');
      }
    }, [open, server, mode]);

    // Validation
    const validate = (): boolean => {
      const newErrors: Record<string, string> = {};

      if (!formData.name?.trim()) {
        newErrors.name = 'Server name is required';
      }

      if (!formData.host?.trim()) {
        newErrors.host = 'Host is required';
      }

      if (!formData.username?.trim()) {
        newErrors.username = 'Username is required';
      }

      if (!formData.port || formData.port < 1 || formData.port > 65535) {
        newErrors.port = 'Port must be between 1 and 65535';
      }

      if (!formData.useAgent && !formData.privateKeyPath?.trim()) {
        newErrors.privateKeyPath = 'Private key path is required when not using SSH agent';
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const serverData: SSHServer = {
          id: mode === 'edit' && server?.id ? server.id : `ssh-${Date.now()}`,
          name: formData.name!,
          host: formData.host!,
          port: formData.port || 22,
          username: formData.username!,
          authMethod: formData.useAgent ? 'agent' : 'key',
          privateKeyPath: formData.privateKeyPath || '',
          useAgent: formData.useAgent!,
          tags: formData.tags || [],
          color: formData.color || '#06b6d4',
          createdAt: mode === 'edit' && server?.createdAt ? server.createdAt : new Date().toISOString(),
          lastConnected: server?.lastConnected,
        };

        if (mode === 'edit') {
          await updateServer(serverData);
        } else {
          await addServer(serverData);
        }

        onOpenChange(false);
      } catch (error) {
        console.error('Failed to save server:', error);
        setErrors({ submit: 'Failed to save server. Please try again.' });
      } finally {
        setIsSubmitting(false);
      }
    };

    // Handle adding tags
    const handleAddTag = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const tag = tagInput.trim();
        if (tag && !formData.tags?.includes(tag)) {
          setFormData((prev) => ({
            ...prev,
            tags: [...(prev.tags || []), tag],
          }));
          setTagInput('');
        }
      }
    };

    // Handle removing tags
    const handleRemoveTag = (tagToRemove: string) => {
      setFormData((prev) => ({
        ...prev,
        tags: (prev.tags || []).filter((tag) => tag !== tagToRemove),
      }));
    };

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {mode === 'edit' ? 'Edit SSH Server' : 'Add SSH Server'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'edit'
                ? 'Update server connection details'
                : 'Configure a new SSH server connection'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Server Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Server Name *
              </label>
              <Input
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Production Server"
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
            </div>

            {/* Host and Port */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Host *
                </label>
                <Input
                  value={formData.host || ''}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="example.com or 192.168.1.1"
                  className={errors.host ? 'border-red-500' : ''}
                />
                {errors.host && <p className="text-red-400 text-xs mt-1">{errors.host}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Port *</label>
                <Input
                  type="number"
                  value={formData.port || 22}
                  onChange={(e) =>
                    setFormData({ ...formData, port: parseInt(e.target.value) || 22 })
                  }
                  min={1}
                  max={65535}
                  className={errors.port ? 'border-red-500' : ''}
                />
                {errors.port && <p className="text-red-400 text-xs mt-1">{errors.port}</p>}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Username *
              </label>
              <Input
                value={formData.username || ''}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="ubuntu"
                className={errors.username ? 'border-red-500' : ''}
              />
              {errors.username && (
                <p className="text-red-400 text-xs mt-1">{errors.username}</p>
              )}
            </div>

            {/* Authentication */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">Authentication</label>

              {/* Use SSH Agent */}
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-cyan-500" />
                  <div>
                    <p className="text-sm font-medium text-white">Use SSH Agent</p>
                    <p className="text-xs text-gray-400">
                      Use keys from your system SSH agent (recommended)
                    </p>
                  </div>
                </div>
                <Switch
                  checked={formData.useAgent || false}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, useAgent: checked })
                  }
                />
              </div>

              {/* Private Key Path */}
              {!formData.useAgent && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Private Key Path *
                  </label>
                  <Input
                    value={formData.privateKeyPath || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, privateKeyPath: e.target.value })
                    }
                    placeholder="~/.ssh/id_rsa"
                    className={errors.privateKeyPath ? 'border-red-500' : ''}
                  />
                  {errors.privateKeyPath && (
                    <p className="text-red-400 text-xs mt-1">{errors.privateKeyPath}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Path to your private SSH key file
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Tags <span className="text-gray-500">(optional)</span>
              </label>
              <div className="space-y-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder="production, database, etc. (press Enter to add)"
                />
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-300 rounded text-xs"
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Color <span className="text-gray-500">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color || '#06b6d4'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 rounded border border-gray-700 bg-gray-800 cursor-pointer"
                />
                <Input
                  value={formData.color || '#06b6d4'}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#06b6d4"
                  className="flex-1"
                  maxLength={7}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Visual indicator color for this server
              </p>
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="p-3 bg-red-500/10 border border-red-500 rounded text-red-400 text-sm">
                {errors.submit}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Server' : 'Add Server'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
);

ServerFormDialog.displayName = 'ServerFormDialog';
