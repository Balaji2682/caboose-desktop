export interface SSHServer {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'agent' | 'key' | 'password';
  privateKeyPath?: string;
  useAgent: boolean;
  tags?: string[];
  environment?: Record<string, string>;
  color?: string;
  createdAt: string;
  lastConnected?: string;
}

export interface SSHSession {
  id: string;
  serverId: string;
  serverName: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  connectedAt?: string;
  disconnectedAt?: string;
  tunnels: SSHTunnel[];
  errorMessage?: string;
  health?: SSHHealth;
}

export interface SSHHealth {
  sessionId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number; // milliseconds
  avgLatency: number; // milliseconds
  packetLoss: number; // percentage
  lastCheckAt: string;
}

export interface SSHTunnel {
  id: string;
  type: 'local' | 'remote' | 'dynamic';
  localHost?: string;
  localPort?: number;
  remoteHost?: string;
  remotePort?: number;
  status: 'active' | 'stopped' | 'error';
}

export interface SSHPane {
  id: string;
  sessionId: string | null;
  serverId: string | null;
  orientation?: 'horizontal' | 'vertical';
  size?: number; // Percentage 0-100
  children?: [SSHPane, SSHPane]; // For split panes
}

export interface SSHTab {
  id: string;
  name: string;
  rootPane: SSHPane;
  activeSessionCount: number;
}
