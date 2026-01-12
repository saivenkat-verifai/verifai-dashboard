// src/environments/environment.staging.ts

export const environment = {
  name: "staging",
  production: false, // keep dev-mode on if you want more debugging
  apiBaseUrl: "https://usstaging.ivisecurity.com",
  authBaseUrl: "https://usstaging.ivisecurity.com",
  mqApiBaseUrl: "https://stagingmq.ivisecurity.com", // 👈 your MQ host
  loggingEnabled: true,
};
