// src/environments/environment.prod.ts

import type { AppEnvironment } from './environment';

export const environment: AppEnvironment = {
  name: 'prod',
  production: true,
  apiBaseUrl: 'https://prod.ivisecurity.com:8001',
  authBaseUrl: 'https://prod.ivisecurity.com:8001',
  loggingEnabled: false,
};
