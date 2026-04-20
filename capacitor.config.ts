import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.kizuna.family',
  appName: 'Kizuna',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
  },
};

export default config;
