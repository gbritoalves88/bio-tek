import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bliteca.app',
  appName: 'Bliteca',
  webDir: 'dist/bio-tek/browser',
  // ❌ REMOVER esta linha:
  // server: {
  //   url: 'https://biotek.vercel.app',
  //   cleartext: true
  // }
};

export default config;
