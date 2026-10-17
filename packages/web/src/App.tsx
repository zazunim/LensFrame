import React, { useState, useEffect, useRef } from 'react';
import { 
  parseExif, 
  renderFrame, 
  exportCanvasToBlob, 
  ExifMetadata, 
  ThemeType, 
  RenderOptions 
} from '@exif-frame/core';
import { saveImageBlob } from './platform.js';
import JSZip from 'jszip';
import { 
  Upload, 
  Download, 
  Camera, 
  Sliders, 
  Palette, 
  Image as ImageIcon,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  FolderArchive,
  Layers,
  Globe,
  Settings2
} from 'lucide-react';
import { Language, LANGUAGES, translations, getDefaultLanguage } from './i18n.js';

export type ImageFormat = 'image/jpeg' | 'image/png' | 'image/webp';
export type ResizeMode = 'original' | 'scale_75' | 'scale_50' | 'fit_2048';

interface ExportSettings {
  format: ImageFormat;
  quality: number;
  resizeMode: ResizeMode;
}

interface ImageItem {
  id: string;
  file: File;
  bitmap: ImageBitmap;
  exif: ExifMetadata;
  name: string;
}

const THEME_IDS: ThemeType[] = [
  'ONE_LINE',
  'TWO_LINE',
  'SHOT_ON_LOGO',
  'POLAROID_STRAP',
  'MINIMAL_BORDER',
  'FILM_FRAME',
  'CINEMASCOPE',
  'JUST_FRAME'
];

export function App() {
  const [lang, setLang] = useState<Language>(getDefaultLanguage);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  // 내보내기 설정 상태
  const [exportSettings, setExportSettings] = useState<ExportSettings>({
    format: 'image/jpeg',
    quality: 0.95,
    resizeMode: 'original'
  });

  // 번역 헬퍼 함수
  const t = (key: string, params?: Record<string, string | number>): string => {
    let text = translations[lang]?.[key] || translations['ko']?.[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return text;
  };

  // 프레임 렌더 옵션
  const [options, setOptions] = useState<RenderOptions>({
    theme: 'SHOT_ON_LOGO',
    padding: { top: 80, bottom: 260, left: 80, right: 80 },
    backgroundColor: '#ffffff',
    textColor: '#111111',
    subTextColor: '#777777',
    fontFamily: 'Barlow, sans-serif',
    showLogo: true,
    fontSizeScale: 1.0,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 기본 초기 샘플 생성 (언어 변경 시에도 가이드 텍스트 업데이트)
  useEffect(() => {
    // 사용자가 직접 사진을 올린 적이 없다면 샘플 이미지를 언어에 맞춰 갱신
    if (images.length > 0 && images[0].id !== 'sample-1') return;

    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1067;
    const ctx = canvas.getContext('2d')!;
    
    const grad = ctx.createLinearGradient(0, 0, 1600, 1067);
    grad.addColorStop(0, '#2b5876');
    grad.addColorStop(1, '#4e4376');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1600, 1067);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '600 50px Barlow, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('sampleTitle'), 800, 500);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '400 30px Barlow, sans-serif';
    ctx.fillText(t('sampleSub'), 800, 570);

    createImageBitmap(canvas).then((bmp) => {
      setImages([
        {
          id: 'sample-1',
          file: new File([], 'sample.jpg'),
          bitmap: bmp,
          name: 'sample.jpg',
          exif: {
            make: 'Sony',
            model: 'ILCE-7M4',
            lensModel: 'FE 35mm F1.4 GM',
            focalLength: '35mm',
            fNumber: 'f/1.4',
            exposureTime: '1/500s',
            iso: '100',
            dateTime: '2024:10:17 14:30:00'
          }
        }
      ]);
    });
  }, [lang]);

  // 여러 파일 일괄 파싱 및 목록에 추가
  const processFiles = async (files: FileList | File[]) => {
    const newItems: ImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;
      try {
        const bitmap = await createImageBitmap(file);
        const parsed = await parseExif(file);
        newItems.push({
          id: `${file.name}-${Date.now()}-${i}`,
          file,
          bitmap,
          name: file.name,
          exif: {
            make: parsed.make || 'Sony',
            model: parsed.model || 'Alpha Camera',
            lensModel: parsed.lensModel || '',
            focalLength: parsed.focalLength || '35mm',
            fNumber: parsed.fNumber || 'f/2.8',
            exposureTime: parsed.exposureTime || '1/250s',
            iso: parsed.iso || '100',
            dateTime: parsed.dateTime || ''
          }
        });
      } catch (err) {
        console.error('Failed to load image:', file.name, err);
      }
    }

    if (newItems.length > 0) {
      setImages((prev) => {
        const filtered = prev.filter((p) => p.id !== 'sample-1');
        const nextList = [...filtered, ...newItems];
        // 방금 새로 추가된 이미지로 자동 포커스 및 선택 이동!
        setSelectedIndex(nextList.length - 1);
        return nextList;
      });
    }
  };

  // 드래그 카운터 (자식 요소 hover 시 깜빡임/취소 방지)
  const dragCounterRef = useRef(0);

  // Tauri v2 네이티브 파일 드롭 및 전역 윈도우 드래그 방지 리스너
  useEffect(() => {
    // 1. 브라우저가 파일을 새 탭으로 여는 기본 동작 차단
    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('dragover', preventDefault, false);
    window.addEventListener('drop', preventDefault, false);

    // 2. Tauri 데스크톱 앱 네이티브 파일 드롭 리스너 등록
    let unlistenTauri: (() => void) | undefined;
    if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
      import('@tauri-apps/api/webview').then(async ({ getCurrentWebview }) => {
        const { readFile } = await import('@tauri-apps/plugin-fs');
        unlistenTauri = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === 'over') {
            setIsDragging(true);
          } else if (event.payload.type === 'drop') {
            setIsDragging(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              const files: File[] = [];
              for (const filePath of paths) {
                try {
                  const bytes = await readFile(filePath);
                  const filename = filePath.replace(/^.*[\\/]/, '') || 'photo.jpg';
                  const ext = filename.split('.').pop()?.toLowerCase();
                  let mime = 'image/jpeg';
                  if (ext === 'png') mime = 'image/png';
                  if (ext === 'webp') mime = 'image/webp';
                  const file = new File([bytes], filename, { type: mime });
                  files.push(file);
                } catch (readErr) {
                  console.error('Failed to read file from path:', filePath, readErr);
                }
              }
              if (files.length > 0) {
                await processFiles(files);
              }
            }
          } else if (event.payload.type === 'leave') {
            setIsDragging(false);
          }
        });
      }).catch((err) => {
        console.warn('Tauri webview drag-drop listener not active in web mode:', err);
      });
    }

    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
      if (unlistenTauri) unlistenTauri();
    };
  }, []);

  // HTML5 표준 드래그 앤 드롭 핸들러 (웹 브라우저 및 일반 dropzone)
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const currentImage = images[selectedIndex] || null;

  // 실시간 캔버스 렌더링
  useEffect(() => {
    if (!currentImage || !canvasRef.current) return;

    let isMounted = true;
    renderFrame(currentImage.bitmap, currentImage.exif, options).then((rendered) => {
      if (!isMounted || !canvasRef.current) return;
      const displayCanvas = canvasRef.current;
      displayCanvas.width = rendered.width;
      displayCanvas.height = rendered.height;
      const ctx = displayCanvas.getContext('2d')!;
      ctx.drawImage(rendered, 0, 0);
    });

    return () => {
      isMounted = false;
    };
  }, [currentImage, options]);

  // 출력 해상도 배율 계산
  const getScaleFactor = (bitmap: ImageBitmap): number => {
    if (exportSettings.resizeMode === 'scale_75') return 0.75;
    if (exportSettings.resizeMode === 'scale_50') return 0.50;
    if (exportSettings.resizeMode === 'fit_2048') {
      const maxSide = Math.max(bitmap.width, bitmap.height);
      return maxSide > 2048 ? 2048 / maxSide : 1.0;
    }
    return 1.0;
  };

  const getExt = (): string => {
    if (exportSettings.format === 'image/png') return '.png';
    if (exportSettings.format === 'image/webp') return '.webp';
    return '.jpg';
  };

  // 단일 이미지 저장
  const handleExportCurrent = async () => {
    if (!currentImage) return;
    setIsExporting(true);
    try {
      const scale = getScaleFactor(currentImage.bitmap);
      const fullCanvas = await renderFrame(currentImage.bitmap, currentImage.exif, {
        ...options,
        targetScale: scale
      });
      const blob = await exportCanvasToBlob(fullCanvas, exportSettings.format, exportSettings.quality);
      const filename = `${currentImage.name.replace(/\.[^/.]+$/, '')}_lensframe${getExt()}`;
      await saveImageBlob(blob, filename);
    } catch (err) {
      alert(t('saveError'));
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  // 전체 다중 이미지 일괄 저장 (ZIP)
  const handleExportAllZip = async () => {
    if (images.length === 0) return;
    setIsExporting(true);
    setExportProgress(t('zipRendering', { current: 0, total: images.length }));

    try {
      const zip = new JSZip();

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setExportProgress(t('zipRendering', { current: i + 1, total: images.length }));
        const scale = getScaleFactor(item.bitmap);
        const fullCanvas = await renderFrame(item.bitmap, item.exif, {
          ...options,
          targetScale: scale
        });
        const blob = await exportCanvasToBlob(fullCanvas, exportSettings.format, exportSettings.quality);
        const filename = `${item.name.replace(/\.[^/.]+$/, '')}_lensframe${getExt()}`;
        zip.file(filename, blob);
      }

      setExportProgress(t('zipCompressing'));
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      await saveImageBlob(zipBlob, `lensframe-batch-${Date.now()}.zip`);
    } catch (err) {
      alert(t('saveError'));
      console.error(err);
    } finally {
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  // 특정 사진 삭제
  const handleRemoveImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setImages((prev) => prev.filter((_, idx) => idx !== index));
    if (selectedIndex >= index && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  // 현재 선택된 이미지의 EXIF 속성 업데이트
  const updateCurrentExif = (patch: Partial<ExifMetadata>) => {
    if (!currentImage) return;
    setImages((prev) =>
      prev.map((item, idx) =>
        idx === selectedIndex ? { ...item, exif: { ...item.exif, ...patch } } : item
      )
    );
  };

  return (
    <div 
      className="flex flex-col h-screen bg-neutral-950 text-neutral-100 font-['Barlow',sans-serif] relative select-none"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 드래그 앤 드롭 오버레이 안내 */}
      {isDragging && (
        <div className="absolute inset-0 bg-indigo-950/85 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-4 border-dashed border-indigo-400 m-4 rounded-2xl pointer-events-none transition-all">
          <Upload className="w-20 h-20 text-indigo-300 animate-bounce mb-4" />
          <p className="text-3xl font-bold text-white tracking-wide">{t('dropTitle')}</p>
          <p className="text-neutral-300 mt-2 text-base">{t('dropDesc')}</p>
        </div>
      )}

      {/* 상단 헤더 */}
      <header className="h-14 border-b border-neutral-800 flex items-center justify-between px-6 bg-neutral-900/80 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <Camera className="w-5 h-5 text-indigo-400" />
          <h1 className="font-bold text-lg tracking-wider">
            LENSFRAME <span className="text-xs font-normal text-neutral-400 ml-1">{t('appTitle')}</span>
          </h1>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 text-indigo-300 border border-neutral-700 font-medium">
            WINDOWS
          </span>
          <span className="text-xs text-neutral-400 flex items-center gap-1 ml-2">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            {t('loadedPhotos', { count: images.length })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* 다국어 선택 드롭다운 */}
          <div className="flex items-center gap-1.5 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1 text-xs">
            <Globe className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Language)}
              className="bg-transparent text-neutral-200 outline-none cursor-pointer"
            >
              {LANGUAGES.map((item) => (
                <option key={item.code} value={item.code} className="bg-neutral-800 text-neutral-100">
                  {item.flag} {item.label}
                </option>
              ))}
            </select>
          </div>

          <input 
            ref={fileInputRef}
            type="file" 
            accept="image/*" 
            multiple 
            className="hidden" 
            onChange={handleFileChange} 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-sm font-medium transition"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>{t('addPhotos')}</span>
          </button>

          <button 
            onClick={handleExportCurrent}
            disabled={isExporting || !currentImage}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-sm font-medium transition border border-neutral-700"
          >
            <Download className="w-4 h-4" />
            <span>{t('saveCurrent')}</span>
          </button>

          {images.length > 1 && (
            <button 
              onClick={handleExportAllZip}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm font-medium transition shadow-lg shadow-indigo-600/20"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
              <span>{exportProgress || t('saveAllZip', { count: images.length })}</span>
            </button>
          )}
        </div>
      </header>

      {/* 메인 작업 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 실시간 캔버스 프리뷰 및 하단 필름 스트립 */}
        <div className="flex-1 flex flex-col bg-neutral-950 overflow-hidden relative">
          {/* 중앙 캔버스 */}
          <div className="flex-1 p-6 flex items-center justify-center overflow-auto">
            <div className="max-w-full max-h-full flex items-center justify-center shadow-2xl rounded-sm overflow-hidden">
              <canvas 
                ref={canvasRef} 
                className="max-h-[calc(100vh-14rem)] max-w-full object-contain cursor-grab"
              />
            </div>
          </div>

          {/* 하단: 다중 이미지 필름 스트립 (Film Strip) */}
          <div className="h-24 border-t border-neutral-800/80 bg-neutral-900/80 backdrop-blur px-4 py-2 flex items-center gap-3 overflow-x-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-700 hover:border-indigo-500 flex flex-col items-center justify-center text-neutral-400 hover:text-indigo-400 transition flex-shrink-0"
              title={t('addPhotos')}
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] mt-1">{t('addMore')}</span>
            </button>

            {images.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setSelectedIndex(idx)}
                className={`relative group w-16 h-16 rounded-lg overflow-hidden border-2 cursor-pointer flex-shrink-0 transition ${
                  selectedIndex === idx
                    ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                    : 'border-neutral-800 opacity-60 hover:opacity-100 hover:border-neutral-600'
                }`}
              >
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${item.file.size > 0 ? URL.createObjectURL(item.file) : ''})`,
                    backgroundColor: '#1f2937'
                  }}
                />
                
                {images.length > 1 && (
                  <button
                    onClick={(e) => handleRemoveImage(idx, e)}
                    className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-red-600 rounded text-neutral-300 hover:text-white opacity-0 group-hover:opacity-100 transition"
                    title={t('removePhoto')}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}

                <div className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-center truncate px-1 py-0.5 text-neutral-300">
                  {idx + 1}. {item.exif.model || item.name}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 우측: 사이드바 조절 패널 */}
        <div className="w-96 border-l border-neutral-800 bg-neutral-900 overflow-y-auto p-5 flex flex-col gap-6">
          {/* 테마 선택 */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <span>{t('themeLayout')}</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {THEME_IDS.map((id) => (
                <button
                  key={id}
                  onClick={() => setOptions({ ...options, theme: id })}
                  className={`text-left p-2.5 rounded-lg border transition flex flex-col ${
                    options.theme === id
                      ? 'border-indigo-500 bg-indigo-500/10 text-white'
                      : 'border-neutral-800 bg-neutral-800/40 text-neutral-400 hover:border-neutral-700'
                  }`}
                >
                  <span className="text-sm font-medium flex items-center justify-between">
                    {t(`theme_${id}_title`)}
                    {options.theme === id && <Check className="w-4 h-4 text-indigo-400" />}
                  </span>
                  <span className="text-xs text-neutral-500 mt-0.5">{t(`theme_${id}_desc`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 색상 및 프레임 스타일 */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>{t('frameStyle')}</span>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('bgColor')}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOptions({ ...options, backgroundColor: '#ffffff', textColor: '#111111', subTextColor: '#777777' })}
                    className={`w-6 h-6 rounded-full bg-white border ${options.backgroundColor === '#ffffff' ? 'ring-2 ring-indigo-500' : 'border-neutral-600'}`}
                  />
                  <button
                    onClick={() => setOptions({ ...options, backgroundColor: '#0d0d0d', textColor: '#ffffff', subTextColor: '#888888' })}
                    className={`w-6 h-6 rounded-full bg-neutral-900 border ${options.backgroundColor === '#0d0d0d' ? 'ring-2 ring-indigo-500' : 'border-neutral-700'}`}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-400">{t('showLogo')}</span>
                <input
                  type="checkbox"
                  checked={options.showLogo}
                  onChange={(e) => setOptions({ ...options, showLogo: e.target.checked })}
                  className="rounded bg-neutral-800 border-neutral-700 text-indigo-500 focus:ring-indigo-500"
                />
              </div>

              {/* 폰트 크기 4단계 조절 */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t('fontSize')}</label>
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { scale: 0.8, label: t('fontS') },
                    { scale: 1.0, label: t('fontM') },
                    { scale: 1.2, label: t('fontL') },
                    { scale: 1.4, label: t('fontXL') },
                  ].map((step) => (
                    <button
                      key={step.scale}
                      onClick={() => setOptions({ ...options, fontSizeScale: step.scale })}
                      className={`py-1.5 px-1 rounded text-xs border transition text-center truncate ${
                        (options.fontSizeScale || 1.0) === step.scale
                          ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                          : 'border-neutral-700 bg-neutral-800/80 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>{t('bottomPadding')}</span>
                  <span>{options.padding.bottom}px</span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="450"
                  value={options.padding.bottom}
                  onChange={(e) => setOptions({
                    ...options,
                    padding: { ...options.padding, bottom: Number(e.target.value) }
                  })}
                  className="w-full accent-indigo-500 bg-neutral-800"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>{t('outerPadding')}</span>
                  <span>{options.padding.left}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={options.padding.left}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setOptions({
                      ...options,
                      padding: { ...options.padding, left: val, right: val, top: val }
                    });
                  }}
                  className="w-full accent-indigo-500 bg-neutral-800"
                />
              </div>
            </div>
          </div>

          {/* 내보내기 설정 (Format, Quality, Resolution) */}
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-neutral-300 mb-3">
              <Settings2 className="w-4 h-4 text-indigo-400" />
              <span>{t('exportSettings')}</span>
            </div>
            <div className="flex flex-col gap-3.5 bg-neutral-800/40 p-3 rounded-lg border border-neutral-800">
              {/* 파일 형식 선택 */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t('fileFormat')}</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['image/jpeg', 'image/png', 'image/webp'] as ImageFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportSettings({ ...exportSettings, format: fmt })}
                      className={`py-1.5 px-2 rounded text-xs font-medium border transition text-center ${
                        exportSettings.format === fmt
                          ? 'border-indigo-500 bg-indigo-500/20 text-white'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {fmt === 'image/jpeg' ? 'JPEG' : fmt === 'image/png' ? 'PNG' : 'WebP'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 화질 압축률 슬라이더 (PNG 제외) */}
              <div>
                <div className="flex justify-between text-xs text-neutral-400 mb-1">
                  <span>{t('imageQuality')}</span>
                  <span>
                    {exportSettings.format === 'image/png' 
                      ? '무손실 (Lossless)' 
                      : `${Math.round(exportSettings.quality * 100)}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.0"
                  step="0.01"
                  disabled={exportSettings.format === 'image/png'}
                  value={exportSettings.quality}
                  onChange={(e) => setExportSettings({
                    ...exportSettings,
                    quality: Number(e.target.value)
                  })}
                  className="w-full accent-indigo-500 bg-neutral-800 disabled:opacity-30"
                />
              </div>

              {/* 해상도 스케일 선택 */}
              <div>
                <label className="text-xs text-neutral-400 mb-1.5 block">{t('exportResolution')}</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'original', label: t('resOriginal') },
                    { id: 'scale_75', label: t('res75') },
                    { id: 'scale_50', label: t('res50') },
                    { id: 'fit_2048', label: t('res2048') },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setExportSettings({ ...exportSettings, resizeMode: item.id as ResizeMode })}
                      className={`py-1.5 px-2 rounded text-xs border transition text-center truncate ${
                        exportSettings.resizeMode === item.id
                          ? 'border-indigo-500 bg-indigo-500/20 text-white font-medium'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-400 hover:border-neutral-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* EXIF 수동 편집 (현재 선택된 사진) */}
          {currentImage && (
            <div>
              <div className="flex items-center justify-between text-sm font-semibold text-neutral-300 mb-3">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-indigo-400" />
                  <span>{t('metadataEdit')}</span>
                </div>
                <span className="text-[11px] text-neutral-500 font-normal truncate max-w-[120px]">
                  {currentImage.name}
                </span>
              </div>
              <div className="flex flex-col gap-2.5">
                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">{t('cameraMake')}</label>
                  <input
                    type="text"
                    value={currentImage.exif.make || ''}
                    onChange={(e) => updateCurrentExif({ make: e.target.value })}
                    className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    placeholder="예: Sony, Leica, Canon"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">{t('cameraModel')}</label>
                  <input
                    type="text"
                    value={currentImage.exif.model || ''}
                    onChange={(e) => updateCurrentExif({ model: e.target.value })}
                    className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    placeholder="예: ILCE-7M4"
                  />
                </div>

                <div>
                  <label className="text-xs text-neutral-500 mb-1 block">{t('lensModel')}</label>
                  <input
                    type="text"
                    value={currentImage.exif.lensModel || ''}
                    onChange={(e) => updateCurrentExif({ lensModel: e.target.value })}
                    className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    placeholder="예: FE 35mm F1.4 GM"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">{t('focalLength')}</label>
                    <input
                      type="text"
                      value={currentImage.exif.focalLength || ''}
                      onChange={(e) => updateCurrentExif({ focalLength: e.target.value })}
                      className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">{t('aperture')}</label>
                    <input
                      type="text"
                      value={currentImage.exif.fNumber || ''}
                      onChange={(e) => updateCurrentExif({ fNumber: e.target.value })}
                      className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">{t('shutterSpeed')}</label>
                    <input
                      type="text"
                      value={currentImage.exif.exposureTime || ''}
                      onChange={(e) => updateCurrentExif({ exposureTime: e.target.value })}
                      className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500 mb-1 block">{t('iso')}</label>
                    <input
                      type="text"
                      value={currentImage.exif.iso || ''}
                      onChange={(e) => updateCurrentExif({ iso: e.target.value })}
                      className="w-full bg-neutral-800/80 border border-neutral-700 rounded px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default App;
