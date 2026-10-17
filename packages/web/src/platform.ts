/**
 * 크로스 플랫폼 (Web / Capacitor Mobile / Tauri Windows) 감지 및 네이티브 파일 저장 브리지
 */

export type PlatformEnv = 'tauri' | 'capacitor' | 'web';

export function getPlatform(): PlatformEnv {
  if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
    return 'tauri';
  }
  if (typeof window !== 'undefined' && 'Capacitor' in window) {
    return 'capacitor';
  }
  return 'web';
}

/**
 * 생성된 이미지 Blob을 각 플랫폼에 맞게 저장합니다.
 * - Web: 브라우저 직접 다운로드
 * - Capacitor (iOS / Android): 갤러리 저장
 * - Tauri (Windows): 파일 저장 대화상자 및 로컬 디스크 쓰기
 */
export async function saveImageBlob(blob: Blob, defaultFilename = 'exif-framed.jpg'): Promise<void> {
  const platform = getPlatform();

  if (platform === 'web') {
    // Chrome, Edge 등 모던 브라우저의 파일 저장 위치 선택 팝업 API 지원
    if ('showSaveFilePicker' in window) {
      try {
        const isZip = defaultFilename.toLowerCase().endsWith('.zip');
        const ext = defaultFilename.split('.').pop()?.toLowerCase() || 'jpg';
        // @ts-ignore
        const handle = await window.showSaveFilePicker({
          suggestedName: defaultFilename,
          types: isZip
            ? [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
            : [{ description: 'Image', accept: { [`image/${ext === 'jpg' ? 'jpeg' : ext}`]: [`.${ext}`] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        alert('성공적으로 저장되었습니다!');
        return;
      } catch (err: any) {
        // 사용자가 파일 저장 창을 취소한 경우
        if (err.name === 'AbortError') return;
        console.warn('showSaveFilePicker fallback to a.download:', err);
      }
    }

    // 구형 브라우저 또는 권한 거부 시 기본 다운로드 폴더 저장
    fallbackDownload(blob, defaultFilename);
    return;
  }

  if (platform === 'tauri') {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      const isZip = defaultFilename.toLowerCase().endsWith('.zip');
      const ext = defaultFilename.split('.').pop()?.toLowerCase() || 'jpg';

      const filters = isZip
        ? [{ name: 'ZIP Archive', extensions: ['zip'] }]
        : [{ name: 'Image', extensions: [ext, 'jpg', 'png', 'webp'] }];

      const filePath = await save({
        defaultPath: defaultFilename,
        filters
      });

      if (filePath) {
        const buffer = await blob.arrayBuffer();
        await writeFile(filePath, new Uint8Array(buffer));
        alert('성공적으로 저장되었습니다!\n저장 경로: ' + filePath);
      }
    } catch (err) {
      console.error('Tauri save failed, falling back to download:', err);
      fallbackDownload(blob, defaultFilename);
    }
    return;
  }

  if (platform === 'capacitor') {
    try {
      const importModule = (name: string) => (new Function(`return import('${name}')`))();
      const mediaPlugin = await importModule('@capacitor-community/media');
      const Media = mediaPlugin.Media;
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        await Media.savePhoto({ path: base64Data });
        alert('갤러리에 사진이 저장되었습니다!');
      };
    } catch (err) {
      console.error('Capacitor save failed:', err);
      fallbackDownload(blob, defaultFilename);
    }
  }
}

function fallbackDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
