import { clampParams, DEFAULT_PARAMS } from './params';
import type { Preset } from './presets';

export interface CubeLutData {
  size: number;
  title?: string;
  data: Float32Array; // mảng float RGB đã chuẩn hóa [0..1]
  rgbaData: Uint8Array; // texture atlas 2D kích thước (size * size) x size x 4
  domainMin: [number, number, number];
  domainMax: [number, number, number];
}

export interface CubeParseResult {
  preset: Preset;
  lut: CubeLutData;
  pointCount: number;
}

/**
 * Phân tích nội dung file .cube (3D LUT).
 * Hỗ trợ LUT_3D_SIZE (2–64), TITLE, DOMAIN_MIN, DOMAIN_MAX.
 * Bỏ qua dòng chú thích (#) và dòng trống.
 *
 * @param content Chuỗi text nội dung file .cube
 * @param fileName Tên file gốc tải lên
 * @throws Error nếu file là LUT_1D, thiếu dữ liệu, sai kích thước hoặc không đúng định dạng .cube
 */
export function parseCubeLut(content: string, fileName: string): CubeParseResult {
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('Nội dung file .cube trống hoặc không đọc được.');
  }

  const lines = content.split(/\r?\n/);

  let title: string | undefined = undefined;
  let lut3dSize: number | null = null;
  let is1dLut = false;
  let domainMin: [number, number, number] = [0.0, 0.0, 0.0];
  let domainMax: [number, number, number] = [1.0, 1.0, 1.0];

  const rawRgbList: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    // Bỏ qua dòng trống và dòng chú thích bắt đầu bằng #
    if (!rawLine || rawLine.startsWith('#')) {
      continue;
    }

    const upper = rawLine.toUpperCase();

    // 1. Kiểm tra TITLE
    if (upper.startsWith('TITLE')) {
      const match = rawLine.match(/^TITLE\s+(.+)$/i);
      if (match && match[1]) {
        title = match[1].trim().replace(/^["']|["']$/g, '').trim();
      }
      continue;
    }

    // 2. Kiểm tra nếu là LUT 1D
    if (upper.startsWith('LUT_1D_SIZE') || upper.startsWith('LUT_1D')) {
      is1dLut = true;
      continue;
    }

    // 3. Đọc LUT_3D_SIZE
    if (upper.startsWith('LUT_3D_SIZE')) {
      const parts = rawLine.split(/\s+/);
      const sizeNum = parseInt(parts[1], 10);
      if (Number.isNaN(sizeNum)) {
        throw new Error('Không đọc được kích thước LUT_3D_SIZE trong file .cube.');
      }
      if (sizeNum < 2 || sizeNum > 64) {
        throw new Error(
          `Kích thước LUT_3D_SIZE (${sizeNum}) không hợp lệ. Ứng dụng chỉ chấp nhận kích thước từ 2 đến 64.`,
        );
      }
      lut3dSize = sizeNum;
      continue;
    }

    // 4. Đọc DOMAIN_MIN
    if (upper.startsWith('DOMAIN_MIN')) {
      const parts = rawLine.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3 && !parts.some(Number.isNaN)) {
        domainMin = [parts[0], parts[1], parts[2]];
      }
      continue;
    }

    // 5. Đọc DOMAIN_MAX
    if (upper.startsWith('DOMAIN_MAX')) {
      const parts = rawLine.split(/\s+/).slice(1).map(Number);
      if (parts.length >= 3 && !parts.some(Number.isNaN)) {
        domainMax = [parts[0], parts[1], parts[2]];
      }
      continue;
    }

    // 6. Dữ liệu màu RGB: 3 số thực phân cách bằng dấu cách / tab
    const tokens = rawLine.split(/\s+/);
    if (tokens.length >= 3) {
      const r = parseFloat(tokens[0]);
      const g = parseFloat(tokens[1]);
      const b = parseFloat(tokens[2]);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        rawRgbList.push(r, g, b);
      }
    }
  }

  // Báo lỗi thân thiện nếu file chỉ chứa LUT 1D
  if (is1dLut && lut3dSize === null) {
    throw new Error(
      'File .cube này chỉ chứa LUT 1D. Ứng dụng hiện chỉ hỗ trợ 3D LUT (LUT_3D_SIZE).',
    );
  }

  // Kiểm tra nếu không tìm thấy LUT_3D_SIZE
  if (lut3dSize === null) {
    throw new Error(
      'File không đúng định dạng .cube hoặc thiếu thông số LUT_3D_SIZE.',
    );
  }

  const expectedPoints = lut3dSize * lut3dSize * lut3dSize;
  const actualPoints = rawRgbList.length / 3;

  // Kiểm tra thiếu dữ liệu
  if (actualPoints < expectedPoints) {
    throw new Error(
      `File .cube bị thiếu dữ liệu (cần ${expectedPoints} điểm màu RGB nhưng chỉ đọc được ${actualPoints} điểm).`,
    );
  }

  // Tên preset: lấy từ dòng TITLE nếu có, không có thì lấy tên file (bỏ đuôi .cube)
  let presetName = title;
  if (!presetName || presetName.length === 0) {
    presetName = fileName.replace(/\.[^/.]+$/, '').trim();
  }
  if (!presetName) {
    presetName = 'Preset LUT';
  }

  // Chuẩn hóa dữ liệu theo DOMAIN_MIN / DOMAIN_MAX về [0..1]
  const dMinR = domainMin[0];
  const dMinG = domainMin[1];
  const dMinB = domainMin[2];
  const dRangeR = domainMax[0] - dMinR || 1.0;
  const dRangeG = domainMax[1] - dMinG || 1.0;
  const dRangeB = domainMax[2] - dMinB || 1.0;

  const normalizedFloats = new Float32Array(expectedPoints * 3);
  // Atlas 2D: Rộng = size * size, Cao = size
  const atlasWidth = lut3dSize * lut3dSize;
  const atlasHeight = lut3dSize;
  const rgbaData = new Uint8Array(atlasWidth * atlasHeight * 4);

  for (let p = 0; p < expectedPoints; p++) {
    const rawR = rawRgbList[p * 3 + 0];
    const rawG = rawRgbList[p * 3 + 1];
    const rawB = rawRgbList[p * 3 + 2];

    const normR = Math.min(1.0, Math.max(0.0, (rawR - dMinR) / dRangeR));
    const normG = Math.min(1.0, Math.max(0.0, (rawG - dMinG) / dRangeG));
    const normB = Math.min(1.0, Math.max(0.0, (rawB - dMinB) / dRangeB));

    normalizedFloats[p * 3 + 0] = normR;
    normalizedFloats[p * 3 + 1] = normG;
    normalizedFloats[p * 3 + 2] = normB;

    // Trong chuẩn .cube:
    // r chạy nhanh nhất (inner), sau đó g, sau đó b (outer).
    const rIdx = p % lut3dSize;
    const gIdx = Math.floor(p / lut3dSize) % lut3dSize;
    const bIdx = Math.floor(p / (lut3dSize * lut3dSize));

    // Vị trí trong atlas 2D:
    // x = bIdx * size + rIdx
    // y = gIdx
    const x = bIdx * lut3dSize + rIdx;
    const y = gIdx;
    const pixelOffset = (y * atlasWidth + x) * 4;

    rgbaData[pixelOffset + 0] = Math.round(normR * 255);
    rgbaData[pixelOffset + 1] = Math.round(normG * 255);
    rgbaData[pixelOffset + 2] = Math.round(normB * 255);
    rgbaData[pixelOffset + 3] = 255;
  }

  const lutData: CubeLutData = {
    size: lut3dSize,
    title,
    data: normalizedFloats,
    rgbaData,
    domainMin,
    domainMax,
  };

  const preset: Preset = {
    id: `lut-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: presetName,
    params: clampParams(DEFAULT_PARAMS),
    lut: lutData,
  };

  return {
    preset,
    lut: lutData,
    pointCount: expectedPoints,
  };
}
