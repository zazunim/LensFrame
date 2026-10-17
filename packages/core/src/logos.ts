/**
 * 제조사별 인라인 SVG 로고 데이터 (인터넷 연결 없이 로컬에서 즉시 렌더링 가능하도록 포함)
 */
export const BRAND_LOGOS: Record<string, string> = {
  Sony: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20" fill="currentColor"><text x="0" y="17" font-family="serif" font-weight="900" font-size="20" letter-spacing="4">SONY</text></svg>`,
  Canon: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" fill="currentColor"><text x="0" y="20" font-family="sans-serif" font-weight="900" font-size="22" letter-spacing="1">Canon</text></svg>`,
  Nikon: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" fill="currentColor"><text x="0" y="20" font-family="sans-serif" font-style="italic" font-weight="900" font-size="22" letter-spacing="2">Nikon</text></svg>`,
  Leica: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="%23e4002b"/><text x="16" y="22" font-family="cursive, serif" font-weight="bold" font-size="14" fill="white" text-anchor="middle">Leica</text></svg>`,
  Fujifilm: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 24" fill="currentColor"><text x="0" y="20" font-family="sans-serif" font-weight="800" font-size="20" letter-spacing="1">FUJIFILM</text></svg>`,
  Hasselblad: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 24" fill="currentColor"><text x="0" y="20" font-family="sans-serif" font-style="italic" font-weight="700" font-size="18" letter-spacing="3">HASSELBLAD</text></svg>`,
  Apple: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 170 170" fill="currentColor"><path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.43-5.59-8.58-10.15-18.9-13.68-30.95-3.53-12.06-5.3-23.47-5.3-34.25 0-14.6 3.65-26.68 10.95-36.24 7.3-9.56 16.5-14.42 27.6-14.58 4.35 0 9.38 1.14 15.09 3.42 5.71 2.29 9.68 3.48 11.91 3.58 1.96 0 6.13-1.32 12.51-3.96 6.38-2.64 12.04-3.75 16.98-3.32 12.63.76 22.84 5.3 30.63 13.63-10.99 6.64-16.37 15.78-16.15 27.42.22 9.14 3.73 16.82 10.53 23.03 6.8 6.22 14.88 9.77 24.23 10.64-2.5 7.4-5.36 14.88-8.58 22.46zM119.22 33.42c-.22-5.76 1.76-11.39 5.94-16.89 4.18-5.5 9.47-9.48 15.86-11.93.33 6.08-1.57 11.83-5.7 17.25-4.13 5.42-9.5 9.28-16.1 11.57z"/></svg>`,
  Samsung: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 24" fill="currentColor"><text x="0" y="20" font-family="sans-serif" font-weight="900" font-size="20" letter-spacing="1">SAMSUNG</text></svg>`
};

/**
 * 브랜드 SVG를 Canvas Image로 비동기 로드
 */
export function loadBrandLogoImage(brand: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const svgData = BRAND_LOGOS[brand];
    if (!svgData) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = svgData;
  });
}
