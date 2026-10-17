import { ExifMetadata, RenderOptions } from './types.js';
import { loadBrandLogoImage } from './logos.js';

export async function renderFrame(
  imageSource: HTMLImageElement | ImageBitmap,
  exif: ExifMetadata,
  options: RenderOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const imgWidth = imageSource.width;
  const imgHeight = imageSource.height;

  // 기본 해상도 비율 기준 폰트 크기 계산 (기준 가로 폭: 3000px)
  const baseScale = Math.max(imgWidth, imgHeight) / 3000;
  const scale = (options.targetScale || 1.0) * baseScale;

  const padTop = Math.round(options.padding.top * scale);
  const padBottom = Math.round(options.padding.bottom * scale);
  const padLeft = Math.round(options.padding.left * scale);
  const padRight = Math.round(options.padding.right * scale);

  const totalWidth = imgWidth + padLeft + padRight;
  const totalHeight = imgHeight + padTop + padBottom;

  canvas.width = totalWidth;
  canvas.height = totalHeight;

  // 1. 배경 프레임 채우기
  ctx.fillStyle = options.backgroundColor;
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  // 2. 원본 사진 묘화
  ctx.drawImage(imageSource, padLeft, padTop, imgWidth, imgHeight);

  // 3. EXIF 텍스트 준비
  const cameraTitle = [exif.make, exif.model].filter(Boolean).join(' ') || 'Digital Camera';
  const lensTitle = exif.lensModel || '';
  
  const specParts = [];
  if (exif.focalLength) specParts.push(exif.focalLength);
  if (exif.fNumber) specParts.push(exif.fNumber);
  if (exif.exposureTime) specParts.push(exif.exposureTime);
  if (exif.iso) specParts.push(`ISO${exif.iso}`);
  const specText = specParts.join('   ') || 'No EXIF Parameters';

  ctx.fillStyle = options.textColor;
  const font = options.fontFamily || 'system-ui, -apple-system, sans-serif';
  const fontScale = options.fontSizeScale || 1.0;

  // 4. 테마별 하단 레이아웃 묘화
  const bottomContentY = padTop + imgHeight + padBottom * 0.45;

  if (options.theme === 'JUST_FRAME') {
    // 순수 갤러리 액자: 텍스트 없이 프레임 여백만 깔끔하게 유지
    return canvas;
  } else if (options.theme === 'ONE_LINE') {
    const fullLine = [cameraTitle, lensTitle, specText].filter(Boolean).join('   |   ');
    ctx.font = `400 ${Math.round(36 * scale * fontScale)}px ${font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fullLine, totalWidth / 2, bottomContentY);
  } else if (options.theme === 'TWO_LINE') {
    const leftX = padLeft + Math.round(40 * scale);
    const rightX = totalWidth - padRight - Math.round(40 * scale);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `600 ${Math.round(42 * scale * fontScale)}px ${font}`;
    ctx.fillText(cameraTitle, leftX, bottomContentY - Math.round(24 * scale * fontScale));

    if (lensTitle) {
      ctx.fillStyle = options.subTextColor;
      ctx.font = `400 ${Math.round(32 * scale * fontScale)}px ${font}`;
      ctx.fillText(lensTitle, leftX, bottomContentY + Math.round(28 * scale * fontScale));
    }

    ctx.fillStyle = options.textColor;
    ctx.textAlign = 'right';
    ctx.font = `500 ${Math.round(38 * scale * fontScale)}px ${font}`;
    ctx.fillText(specText, rightX, bottomContentY);
  } else if (options.theme === 'SHOT_ON_LOGO') {
    const leftX = padLeft + Math.round(40 * scale);
    const rightX = totalWidth - padRight - Math.round(40 * scale);

    let logoDrawn = false;
    if (options.showLogo && exif.make) {
      const logoImg = await loadBrandLogoImage(exif.make);
      if (logoImg) {
        const logoHeight = Math.round(60 * scale * fontScale);
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        ctx.drawImage(logoImg, leftX, bottomContentY - logoHeight / 2, logoWidth, logoHeight);
        
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${Math.round(44 * scale * fontScale)}px ${font}`;
        ctx.fillText(exif.model || cameraTitle, leftX + logoWidth + Math.round(24 * scale * fontScale), bottomContentY);
        logoDrawn = true;
      }
    }

    if (!logoDrawn) {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${Math.round(44 * scale * fontScale)}px ${font}`;
      ctx.fillText(`SHOT ON ${cameraTitle.toUpperCase()}`, leftX, bottomContentY);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.font = `500 ${Math.round(36 * scale * fontScale)}px ${font}`;
    ctx.fillText(specText, rightX, bottomContentY - Math.round(18 * scale * fontScale));

    if (exif.dateTime) {
      ctx.fillStyle = options.subTextColor;
      ctx.font = `400 ${Math.round(28 * scale * fontScale)}px ${font}`;
      ctx.fillText(exif.dateTime, rightX, bottomContentY + Math.round(24 * scale * fontScale));
    }
  } else if (options.theme === 'POLAROID_STRAP') {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `300 ${Math.round(48 * scale * fontScale)}px cursive, ${font}`;
    const caption = options.customText || cameraTitle;
    ctx.fillText(caption, totalWidth / 2, bottomContentY - Math.round(25 * scale * fontScale));

    ctx.fillStyle = options.subTextColor;
    ctx.font = `400 ${Math.round(30 * scale * fontScale)}px ${font}`;
    ctx.fillText(specText, totalWidth / 2, bottomContentY + Math.round(35 * scale * fontScale));
  } else if (options.theme === 'CINEMASCOPE') {
    // 2.39:1 시네마틱 레터박스 & 자막 룩
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // 시네마 감성 자막 (연노랑/골드 톤)
    ctx.fillStyle = '#fce588';
    ctx.font = `500 ${Math.round(38 * scale * fontScale)}px ${font}`;
    ctx.fillText(`SCENE · ${cameraTitle.toUpperCase()}`, totalWidth / 2, bottomContentY - Math.round(20 * scale * fontScale));

    ctx.fillStyle = '#d1d5db';
    ctx.font = `400 ${Math.round(30 * scale * fontScale)}px ${font}`;
    ctx.fillText(specText, totalWidth / 2, bottomContentY + Math.round(26 * scale * fontScale));
  } else if (options.theme === 'FILM_FRAME') {
    // 35mm 필름 네거티브 퍼포레이션 룩
    const holeW = Math.round(28 * scale);
    const holeH = Math.round(40 * scale);
    const holeGap = Math.round(52 * scale);

    // 상/하단 퍼포레이션 구멍 그리기
    ctx.fillStyle = options.backgroundColor === '#ffffff' ? '#18181b' : '#27272a';
    for (let x = padLeft; x < totalWidth - padRight; x += holeGap) {
      // 상단 구멍
      if (padTop > holeH) {
        ctx.fillRect(x, Math.round(padTop * 0.25), holeW, holeH);
      }
      // 하단 구멍
      ctx.fillRect(x, totalHeight - Math.round(padBottom * 0.35), holeW, holeH);
    }

    // 필름 인덱스 텍스트 (오렌지/골드 톤)
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(34 * scale * fontScale)}px monospace, ${font}`;
    ctx.fillText(`▶ 24A  •  ${cameraTitle.toUpperCase()}`, padLeft + Math.round(20 * scale), bottomContentY - Math.round(22 * scale * fontScale));

    ctx.fillStyle = options.textColor;
    ctx.font = `500 ${Math.round(30 * scale * fontScale)}px monospace, ${font}`;
    ctx.fillText(specText, padLeft + Math.round(20 * scale), bottomContentY + Math.round(24 * scale * fontScale));
  } else {
    // MINIMAL_BORDER 기본
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `400 ${Math.round(32 * scale * fontScale)}px ${font}`;
    ctx.fillText(`${cameraTitle} · ${specText}`, totalWidth / 2, bottomContentY);
  }

  return canvas;
}

/**
 * 캔버스를 Blob (JPEG/WebP)로 내보내기
 */
export function exportCanvasToBlob(canvas: HTMLCanvasElement, format: 'image/jpeg' | 'image/webp' | 'image/png' = 'image/jpeg', quality = 0.95): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Canvas export failed'));
    }, format, quality);
  });
}
