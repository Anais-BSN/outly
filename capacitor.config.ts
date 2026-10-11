import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.outlys.app',
  appName: 'Outlys',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'www.outlys.fr',
      'outlys.fr',
      '*.outlys.fr',
      '*.pusher.com',
      '*.pusherapp.com',
      'sockjs-*.pusher.com'
    ]
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_outlys',
      iconColor: '#6D2932',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    StatusBar: {
      overlaysWebView: false,
    }
  }
};

export default config;
