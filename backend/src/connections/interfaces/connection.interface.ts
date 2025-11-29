export interface Connection {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string; // Encrypted when stored
  sslMode: 'disable' | 'allow' | 'prefer' | 'require' | 'verify-ca' | 'verify-full';
  status: 'connected' | 'disconnected' | 'error';
  lastConnected?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectionStorage {
  connections: Connection[];
}

export interface ConnectionConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'error';

