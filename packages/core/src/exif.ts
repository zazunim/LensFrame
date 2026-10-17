import ExifReader from 'exifreader';
import { ExifMetadata } from './types.js';

/**
 * ArrayBuffer 또는 File로부터 EXIF 메타데이터를 정규화하여 추출합니다.
 */
export async function parseExif(input: ArrayBuffer | File | Blob): Promise<ExifMetadata> {
  try {
    let buffer: ArrayBuffer;
    if (input instanceof Blob) {
      buffer = await input.arrayBuffer();
    } else {
      buffer = input;
    }

    const tags = ExifReader.load(buffer, { expanded: true }) as any;
    const exif = (tags.exif || {}) as any;
    const file = (tags.file || {}) as any;

    const makeRaw = tags.Make?.description || exif.Make?.description || '';
    const modelRaw = tags.Model?.description || exif.Model?.description || '';
    let lensModel = tags.LensModel?.description || exif.LensModel?.description || '';

    // 조리개 값 정규화
    let fNumber = tags.FNumber?.description || exif.FNumber?.description || '';
    if (fNumber && !fNumber.startsWith('f/')) {
      fNumber = `f/${fNumber}`;
    }

    // 셔터 스피드 정규화
    let exposureTime = tags.ExposureTime?.description || exif.ExposureTime?.description || '';
    if (exposureTime && !exposureTime.endsWith('s') && !exposureTime.includes('/')) {
      exposureTime = `${exposureTime}s`;
    }

    // 초점거리 정규화
    let focalLength = tags.FocalLength?.description || exif.FocalLength?.description || '';
    if (focalLength && !focalLength.toLowerCase().endsWith('mm')) {
      focalLength = `${focalLength}mm`;
    }

    const focalLength35mm = tags.FocalLengthIn35mmFilm?.description || exif.FocalLengthIn35mmFilm?.description || '';
    const iso = tags.ISOSpeedRatings?.description || exif.ISOSpeedRatings?.description || exif.PhotographicSensitivity?.description || '';
    const dateTime = tags.DateTimeOriginal?.description || exif.DateTimeOriginal?.description || '';
    const artist = tags.Artist?.description || exif.Artist?.description || '';
    const copyright = tags.Copyright?.description || exif.Copyright?.description || '';

    // 제조사 이름 보정 (예: SONY -> Sony, NIKON CORPORATION -> Nikon)
    const make = normalizeMake(makeRaw);
    const model = normalizeModel(modelRaw, make);

    return {
      make,
      model,
      lensModel,
      fNumber,
      exposureTime,
      focalLength: focalLength35mm ? `${focalLength35mm}mm` : focalLength,
      focalLength35mm: focalLength35mm ? `${focalLength35mm}mm` : undefined,
      iso,
      dateTime,
      artist,
      copyright
    };
  } catch (error) {
    console.warn('Failed to parse EXIF metadata:', error);
    return {};
  }
}

function normalizeMake(make: string): string {
  const m = make.trim().toLowerCase();
  if (m.includes('sony')) return 'Sony';
  if (m.includes('nikon')) return 'Nikon';
  if (m.includes('canon')) return 'Canon';
  if (m.includes('fujifilm') || m.includes('fuji')) return 'Fujifilm';
  if (m.includes('leica')) return 'Leica';
  if (m.includes('hasselblad')) return 'Hasselblad';
  if (m.includes('apple')) return 'Apple';
  if (m.includes('samsung')) return 'Samsung';
  if (m.includes('panasonic') || m.includes('lumix')) return 'Lumix';
  if (m.includes('olympus') || m.includes('om digital')) return 'Olympus';
  if (m.includes('ricoh')) return 'Ricoh';
  return make.trim();
}

function normalizeModel(model: string, make: string): string {
  let m = model.trim();
  // 모델명 앞에 제조사가 중복되어 붙어있는 경우 제거
  if (m.toLowerCase().startsWith(make.toLowerCase())) {
    m = m.substring(make.length).trim();
  }
  return m;
}
