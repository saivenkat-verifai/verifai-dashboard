// src/environments/environment.staging.ts

import type { AppEnvironment } from './environment';

export const environment: AppEnvironment = {
  name: 'staging',
  production: false, // keep dev-mode on if you want more debugging
  apiBaseUrl: 'https://usstaging.ivisecurity.com:8001',
  authBaseUrl: 'https://usstaging.ivisecurity.com:8001',
  mqApiBaseUrl: 'https://stagingmq.ivisecurity.com', // 👈 your MQ host
  loggingEnabled: true,
};
