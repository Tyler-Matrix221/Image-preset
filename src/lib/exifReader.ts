export interface PhotoExif {
  iso?: number;
  fNumber?: number;
  exposureTime?: string;
  focalLength?: number;
  cameraModel?: string;
}

function readAscii(view: DataView, start: number, length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    if (start + i >= view.byteLength) break;
    const code = view.getUint8(start + i);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out.trim();
}

function formatShutter(val: number): string {
  if (val <= 0) return '';
  if (val >= 1) return `${Number(val.toFixed(1))}s`;
  const denom = Math.round(1 / val);
  return `1/${denom}s`;
}

/**
 * Đọc nhanh thông số EXIF cơ bản (ISO, Khẩu độ, Tốc độ, Tiêu cự, Tên máy)
 * trực tiếp từ 128KB đầu của file ảnh JPEG, không cần thư viện ngoài.
 */
export async function readBasicExif(file: File): Promise<PhotoExif | null> {
  try {
    if (!file.type.includes('jpeg') && !file.name.toLowerCase().match(/\.jpe?g$/)) {
      return null;
    }

    const slice = file.slice(0, 131072);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (view.byteLength < 12 || view.getUint16(0, false) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    let tiffStart = -1;

    while (offset + 4 < view.byteLength) {
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        // APP1 - EXIF
        if (offset + 8 < view.byteLength && readAscii(view, offset + 2, 4) === 'Exif') {
          tiffStart = offset + 8;
          break;
        }
      }

      if (marker === 0xffda || marker === 0xffd9) break;
      if (offset + 2 > view.byteLength) break;
      const segLen = view.getUint16(offset, false);
      if (segLen < 2) break;
      offset += segLen;
    }

    if (tiffStart < 0 || tiffStart + 8 >= view.byteLength) return null;

    const endianTag = view.getUint16(tiffStart, false);
    const little = endianTag === 0x4949;
    if (!little && endianTag !== 0x4d4d) return null;

    const firstIfdOffset = view.getUint32(tiffStart + 4, little);
    const ifd0Start = tiffStart + firstIfdOffset;
    if (ifd0Start + 2 > view.byteLength) return null;

    const result: PhotoExif = {};
    let exifIfdPointer = -1;

    const parseIfd = (ifdOffset: number, isExifSub: boolean) => {
      if (ifdOffset < 0 || ifdOffset + 2 > view.byteLength) return;
      const count = view.getUint16(ifdOffset, little);
      for (let i = 0; i < count; i++) {
        const entry = ifdOffset + 2 + i * 12;
        if (entry + 12 > view.byteLength) break;
        const tag = view.getUint16(entry, little);
        const type = view.getUint16(entry + 2, little);
        const numValues = view.getUint32(entry + 4, little);
        const valueOffset = entry + 8;

        const readRational = (): number | undefined => {
          const ptr = tiffStart + view.getUint32(valueOffset, little);
          if (ptr + 8 > view.byteLength) return undefined;
          const num = view.getUint32(ptr, little);
          const den = view.getUint32(ptr + 4, little);
          return den ? num / den : undefined;
        };

        if (!isExifSub) {
          if (tag === 0x0110 && type === 2) {
            // Model
            if (numValues <= 4) {
              result.cameraModel = readAscii(view, valueOffset, numValues);
            } else {
              const ptr = tiffStart + view.getUint32(valueOffset, little);
              result.cameraModel = readAscii(view, ptr, Math.min(numValues, 40));
            }
          } else if (tag === 0x8769) {
            exifIfdPointer = tiffStart + view.getUint32(valueOffset, little);
          }
        } else {
          if (tag === 0x829a && type === 5) {
            const val = readRational();
            if (val) result.exposureTime = formatShutter(val);
          } else if (tag === 0x829d && type === 5) {
            const val = readRational();
            if (val) result.fNumber = Number(val.toFixed(1));
          } else if (tag === 0x8827 && type === 3) {
            result.iso = view.getUint16(valueOffset, little);
          } else if (tag === 0x920a && type === 5) {
            const val = readRational();
            if (val) result.focalLength = Math.round(val);
          }
        }
      }
    };

    parseIfd(ifd0Start, false);
    if (exifIfdPointer > 0) {
      parseIfd(exifIfdPointer, true);
    }

    if (
      !result.iso &&
      !result.fNumber &&
      !result.exposureTime &&
      !result.focalLength &&
      !result.cameraModel
    ) {
      return null;
    }

    return result;
  } catch {
    return null;
  }
}
