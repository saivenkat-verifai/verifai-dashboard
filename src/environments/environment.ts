// src/environments/environment.ts

export interface AppEnvironment {
  name: 'dev' | 'staging' | 'prod';
  production: boolean;
  apiBaseUrl: string;
  authBaseUrl?: string;
  mqApiBaseUrl?: string;          // 👈 ADD THIS
  loggingEnabled: boolean;
  [key: string]: any;
}

export const environment: AppEnvironment = {
  name: 'dev',
  production: false,
  apiBaseUrl: 'http://localhost:8001', // your local backend
  authBaseUrl: 'http://localhost:8001',
  mqApiBaseUrl: 'http://localhost:8002', // 👈 TODO: your local MQ host/port
  loggingEnabled: true,
};
