import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const desktopDir = path.join(rootDir, 'packages', 'desktop');
const distPortableDir = path.join(rootDir, 'dist-portable');

// Cargo PATH 환경변수 주입
const cargoBin = path.join(process.env.USERPROFILE || 'C:\\Users\\zazu8', '.cargo', 'bin');
const env = {
  ...process.env,
  PATH: `${cargoBin};${process.env.PATH}`
};

console.log('🚀 [1/3] 웹 프론트엔드 번들 빌드 중...');
execSync('npm --workspace=@exif-frame/web run build', { cwd: rootDir, stdio: 'inherit', env });

console.log('🦀 [2/3] Tauri Windows 단일 포터블 실행 파일 컴파일 중...');
execSync('npx @tauri-apps/cli build --no-bundle', { cwd: desktopDir, stdio: 'inherit', env });

console.log('📦 [3/3] 포터블 배포 파일 패키징 중...');
if (!fs.existsSync(distPortableDir)) {
  fs.mkdirSync(distPortableDir, { recursive: true });
}

const sourceExe = path.join(desktopDir, 'src-tauri', 'target', 'release', 'lensframe-desktop.exe');
const targetExe = path.join(distPortableDir, 'LensFrame-Portable.exe');

if (fs.existsSync(sourceExe)) {
  fs.copyFileSync(sourceExe, targetExe);
  const stats = fs.statSync(targetExe);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log('✨ [완료] 포터블 실행 파일 생성 성공!');
  console.log(`📁 위치: ${targetExe}`);
  console.log(`📊 용량: ${sizeMB} MB`);
} else {
  console.error('❌ 실행 파일을 찾을 수 없습니다:', sourceExe);
  process.exit(1);
}
