package plugin

import (
	"sync"
)

// Registry manages framework plugin registration and lookup
type Registry struct {
	mu      sync.RWMutex
	plugins map[string]FrameworkPlugin
}

// NewRegistry creates a new plugin registry
func NewRegistry() *Registry {
	return &Registry{
		plugins: make(map[string]FrameworkPlugin),
	}
}

// Register adds a plugin to the registry
func (r *Registry) Register(plugin FrameworkPlugin) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.plugins[plugin.Name()] = plugin
}

// Get retrieves a plugin by name
func (r *Registry) Get(name string) (FrameworkPlugin, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	plugin, ok := r.plugins[name]
	return plugin, ok
}

// List returns all registered plugins
func (r *Registry) List() []FrameworkPlugin {
	r.mu.RLock()
	defer r.mu.RUnlock()

	plugins := make([]FrameworkPlugin, 0, len(r.plugins))
	for _, p := range r.plugins {
		plugins = append(plugins, p)
	}
	return plugins
}

// DefaultRegistry is the global plugin registry
var DefaultRegistry = NewRegistry()

// Register adds a plugin to the default registry
func Register(plugin FrameworkPlugin) {
	DefaultRegistry.Register(plugin)
}

// Get retrieves a plugin from the default registry
func Get(name string) (FrameworkPlugin, bool) {
	return DefaultRegistry.Get(name)
}
