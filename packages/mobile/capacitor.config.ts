import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lensframe.app',
  appName: '렌즈프레임',
  webDir: '../web/dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Media: {
      // 사진 갤러리 권한 설정
    }
  }
};

export default config;
