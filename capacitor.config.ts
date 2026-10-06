/// <reference types="@capacitor-firebase/messaging" />

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bliteca.app',
  appName: 'BliTeca',
  webDir: 'dist/bio-tek/browser',
  android: {
    allowMixedContent: true
  },
  server: {
    cleartext: true
  },
  plugins: {
    SocialLogin: {
      google: {
        webClientId: '672632714788-spt5ovft059gmdqvbng9b27j3pbupodu.apps.googleusercontent.com'
      }
    },
    FirebaseMessaging: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: "#F5EFE6",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
