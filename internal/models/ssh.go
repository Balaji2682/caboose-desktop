package models

import "time"

// SSHServer represents a saved SSH server connection
type SSHServer struct {
	ID             string            `json:"id" toml:"id"`
	Name           string            `json:"name" toml:"name"`
	Host           string            `json:"host" toml:"host"`
	Port           int               `json:"port" toml:"port"`
	Username       string            `json:"username" toml:"username"`
	AuthMethod     string            `json:"authMethod" toml:"auth_method"` // "agent", "key", "password"
	PrivateKeyPath string            `json:"privateKeyPath,omitempty" toml:"private_key_path,omitempty"`
	UseAgent       bool              `json:"useAgent" toml:"use_agent"`
	Tags           []string          `json:"tags,omitempty" toml:"tags,omitempty"`
	Environment    map[string]string `json:"environment,omitempty" toml:"environment,omitempty"`
	Color          string            `json:"color,omitempty" toml:"color,omitempty"`
	CreatedAt      time.Time         `json:"createdAt" toml:"created_at"`
	LastConnected  *time.Time        `json:"lastConnected,omitempty" toml:"last_connected,omitempty"`
}

// SSHSession represents an active SSH connection
type SSHSession struct {
	ID             string      `json:"id"`
	ServerID       string      `json:"serverId"`
	ServerName     string      `json:"serverName"`
	Status         string      `json:"status"` // "connecting", "connected", "disconnected", "error"
	ConnectedAt    *time.Time  `json:"connectedAt,omitempty"`
	DisconnectedAt *time.Time  `json:"disconnectedAt,omitempty"`
	Tunnels        []SSHTunnel `json:"tunnels"`
	ErrorMessage   string      `json:"errorMessage,omitempty"`
}

// SSHTunnel represents an SSH port forward or SOCKS proxy
type SSHTunnel struct {
	ID         string `json:"id"`
	Type       string `json:"type"`       // "local", "remote", "dynamic"
	LocalHost  string `json:"localHost"`  // For local/dynamic
	LocalPort  int    `json:"localPort"`  // For local/dynamic
	RemoteHost string `json:"remoteHost"` // For local/remote
	RemotePort int    `json:"remotePort"` // For local/remote
	Status     string `json:"status"`     // "active", "stopped", "error"
}

// SSHSessionLog represents a log entry for export
type SSHSessionLog struct {
	SessionID string    `json:"sessionId" csv:"session_id"`
	Timestamp time.Time `json:"timestamp" csv:"timestamp"`
	Server    string    `json:"server" csv:"server"`
	Type      string    `json:"type" csv:"type"` // "input", "output"
	Content   string    `json:"content" csv:"content"`
}

// SSHHealth represents connection health metrics
type SSHHealth struct {
	SessionID    string  `json:"sessionId"`
	Status       string  `json:"status"` // "healthy", "degraded", "unhealthy"
	Latency      int64   `json:"latency"` // in milliseconds
	AvgLatency   int64   `json:"avgLatency"`
	PacketLoss   float64 `json:"packetLoss"` // percentage
	LastCheckAt  string  `json:"lastCheckAt"`
}
