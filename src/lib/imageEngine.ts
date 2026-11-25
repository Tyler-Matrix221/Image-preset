import type { EditParams, SplitTone } from '@/rules/params';
import { HSL_CHANNELS, clampParams } from '@/rules/params';
import type { CubeLutData } from '@/rules/cubeImport';

const VERTEX_SHADER = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

// Channel packing per uniform set:
//   A = red, orange, yellow   B = green, aqua, blue   C.xy = purple, magenta
const FRAGMENT_SHADER = `
precision highp float;

varying vec2 vUv;
uniform sampler2D uImage;

uniform float uExposure;    // -2..2
uniform float uTemperature; // -1..1 (K lệch -1000..1000 / 1000)
uniform float uTint;        // -1..1
uniform float uContrast;    // -1..1
uniform float uHighlights;  // -1..1
uniform float uShadows;     // -1..1
uniform float uWhites;      // -1..1
uniform float uBlacks;      // -1..1
uniform float uSaturation;  // -1..1
uniform float uVibrance;    // -1..1
uniform vec3 uHslHueA;      // red, orange, yellow (-1..1)
uniform vec3 uHslSatA;
uniform vec3 uHslLumA;
uniform vec3 uHslHueB;      // green, aqua, blue
uniform vec3 uHslSatB;
uniform vec3 uHslLumB;
uniform vec2 uHslHueC;      // purple, magenta
uniform vec2 uHslSatC;
uniform vec2 uHslLumC;
uniform float uIntensity;   // 0..1 mix with original
uniform vec3 uShadowTint;   // split tone màu vùng tối
uniform float uShadowAmt;   // 0..1

// 3D LUT (định dạng atlas 2D kích thước [size*size, size])
uniform sampler2D uLut;
uniform float uLutSize;     // ví dụ 17, 32, 33, 64
uniform float uLutEnabled;  // 1.0 nếu đang áp LUT, 0.0 nếu dùng thông số

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
const mat3 BAYER = mat3(
  1.0,  1.0,  1.0,
  1.0,  0.0, -1.0,
  1.0, -2.0,  1.0
);

float lumaOf(vec3 c) { return dot(c, LUMA); }
float softSplit(float x) { float b = 1.0 - abs(x); return b * b; }
float softSplitWider(float x) { return max(1.0 - x * x, 0.0); }

// Band trọng số [a..b] độ, dốc 20 độ hai mép. Với band đỏ (wrap qua 0),
// truyền h đã dịch +360 khi h < 180 và b = 375.
float band(float h, float a, float b) {
  return smoothstep(a - 20.0, a + 20.0, h) * (1.0 - smoothstep(b - 20.0, b + 20.0, h));
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + 1e-10)), d / max(q.x, 1e-10), q.x);
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

/**
 * Nội suy trilinear lấy mẫu màu từ 3D LUT (được trải thành 2D atlas):
 * - Chiều R & G được nội suy bilinear trực tiếp qua phần cứng GPU (gl.LINEAR)
 * - Chiều B được nội suy tuyến tính giữa 2 lát cắt liền kề b0 và b1
 */
vec3 sampleLutTrilinear(sampler2D lut, vec3 color, float size) {
  vec3 c = clamp(color, 0.0, 1.0);
  float blue = c.b * (size - 1.0);
  float b0 = floor(blue);
  float b1 = min(b0 + 1.0, size - 1.0);
  float f = blue - b0;

  float atlasWidth = size * size;
  float uOffset = c.r * (size - 1.0);
  float v = (c.g * (size - 1.0) + 0.5) / size;

  vec2 uv0 = vec2((b0 * size + uOffset + 0.5) / atlasWidth, v);
  vec2 uv1 = vec2((b1 * size + uOffset + 0.5) / atlasWidth, v);

  vec3 col0 = texture2D(lut, uv0).rgb;
  vec3 col1 = texture2D(lut, uv1).rgb;

  return mix(col0, col1, f);
}

void main() {
  vec3 original = texture2D(uImage, vUv).rgb;

  // Nếu preset là 3D LUT (.cube)
  if (uLutEnabled > 0.5) {
    vec3 lutColor = sampleLutTrilinear(uLut, original, uLutSize);
    gl_FragColor = vec4(mix(original, lutColor, uIntensity), 1.0);
    return;
  }

  // Chế độ chỉnh theo bộ thông số EditParams
  vec3 c = original;

  // Exposure theo stop, neo quanh xám trung bình
  c *= pow(2.0, uExposure);

  // White balance kiểu camera (Bayer derivation)
  vec3 b = BAYER * vec3(0.0, uTemperature * 0.5, uTint * 0.5);
  c = max(c + c * b, 0.0);

  // Tone: chia vùng tối / trung gian / sáng
  float l = lumaOf(c);
  float wShadow = softSplit(l * 2.0 - 1.0);
  float wMid = softSplitWider(l * 2.0 - 1.0);
  float wHigh = max(1.0 - wShadow - wMid, 0.0);
  float hi = (uHighlights / 100.0) * 0.75;
  float sh = (uShadows / 100.0) * 0.75;
  float wt = (uWhites / 100.0) * 0.6;
  float bk = (uBlacks / 100.0) * 0.6;
  c += c * (wMid * (sh * (1.0 - l) + bk) + wHigh * (hi + wt));

  // Tương phản: giãn quanh 0.5, không cắt gáy
  float ct = uContrast / 100.0;
  c = (c - 0.5) * (ct >= 0.0 ? 1.0 / (1.0 - ct) : 1.0 + ct) + 0.5;

  // Bão hòa toàn cục
  float satLuma = lumaOf(c);
  c = mix(vec3(satLuma), c, 1.0 + uSaturation / 100.0);

  // Rực rỡ: ưu tiên màu nhạt, giữ màu da
  float vibLuma = lumaOf(c);
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  float colorfulness = mx - mn;
  float vib = (uVibrance / 100.0) * (1.0 - colorfulness) * (1.0 - abs(2.0 * vibLuma - 1.0));
  c = mix(vec3(vibLuma), c, 1.0 + vib);

  c = clamp(c, 0.0, 1.0);

  // HSL 8 kênh
  vec3 hsv = rgb2hsv(c);
  float hDeg = hsv.x * 360.0;
  float hRed = hDeg < 180.0 ? hDeg + 360.0 : hDeg;
  float wR = band(hRed, 345.0, 375.0);
  float wO = band(hDeg, 15.0, 45.0);
  float wY = band(hDeg, 45.0, 75.0);
  float wG = band(hDeg, 75.0, 165.0);
  float wA = band(hDeg, 165.0, 195.0);
  float wB = band(hDeg, 195.0, 255.0);
  float wP = band(hDeg, 255.0, 315.0);
  float wM = band(hDeg, 315.0, 345.0);

  float dH = wR * uHslHueA.x + wO * uHslHueA.y + wY * uHslHueA.z
           + wG * uHslHueB.x + wA * uHslHueB.y + wB * uHslHueB.z
           + wP * uHslHueC.x + wM * uHslHueC.y;
  float dS = wR * uHslSatA.x + wO * uHslSatA.y + wY * uHslSatA.z
           + wG * uHslSatB.x + wA * uHslSatB.y + wB * uHslSatB.z
           + wP * uHslSatC.x + wM * uHslSatC.y;
  float dL = wR * uHslLumA.x + wO * uHslLumA.y + wY * uHslLumA.z
           + wG * uHslLumB.x + wA * uHslLumB.y + wB * uHslLumB.z
           + wP * uHslLumC.x + wM * uHslLumC.y;

  if (abs(dH) > 0.0001 || abs(dS) > 0.0001 || abs(dL) > 0.0001) {
    hsv.x = fract(hsv.x + dH * (30.0 / 360.0));
    hsv.y = clamp(hsv.y * (1.0 + dS), 0.0, 1.0);
    c = hsv2rgb(hsv);
    c = clamp(c * (1.0 + dL * 0.6), 0.0, 1.0);
  }

  // Split tone vùng tối
  float shadowMask = 1.0 - smoothstep(0.0, 0.65, lumaOf(c));
  c = clamp(c + uShadowTint * shadowMask * uShadowAmt, 0.0, 1.0);

  gl_FragColor = vec4(mix(original, c, uIntensity), 1.0);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Không tạo được shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error('Lỗi shader: ' + info);
  }
  return shader;
}

const UNIFORM_NAMES = [
  'uImage', 'uExposure', 'uTemperature', 'uTint', 'uContrast',
  'uHighlights', 'uShadows', 'uWhites', 'uBlacks', 'uSaturation',
  'uVibrance', 'uHslHueA', 'uHslSatA', 'uHslLumA', 'uHslHueB', 'uHslSatB',
  'uHslLumB', 'uHslHueC', 'uHslSatC', 'uHslLumC', 'uIntensity',
  'uShadowTint', 'uShadowAmt',
  'uLut', 'uLutSize', 'uLutEnabled',
];

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let rgb: [number, number, number];
  if (hp < 1) rgb = [c, x, 0];
  else if (hp < 2) rgb = [x, c, 0];
  else if (hp < 3) rgb = [0, c, x];
  else if (hp < 4) rgb = [0, x, c];
  else if (hp < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = v - c;
  return [rgb[0] + m, rgb[1] + m, rgb[2] + m];
}

export class ImageEngine {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private texture: WebGLTexture;
  private lutTexture: WebGLTexture;
  private currentLut: CubeLutData | null = null;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};

  constructor(canvas: HTMLCanvasElement, source: TexImageSource) {
    const gl = canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      antialias: false,
    });
    if (!gl) throw new Error('Thiết bị không hỗ trợ WebGL');

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    const program = gl.createProgram();
    if (!program) throw new Error('Không tạo được chương trình WebGL');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Không khởi động được bộ xử lý ảnh');
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Texture 0: Ảnh đầu vào
    const texture = gl.createTexture();
    if (!texture) throw new Error('Không tạo được texture ảnh');
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    // Texture 1: 3D LUT Atlas
    const lutTexture = gl.createTexture();
    if (!lutTexture) throw new Error('Không tạo được texture LUT');
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));

    for (const name of UNIFORM_NAMES) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }
    gl.uniform1i(this.uniforms.uImage!, 0);
    gl.uniform1i(this.uniforms.uLut!, 1);
    gl.uniform1f(this.uniforms.uLutEnabled!, 0.0);
    gl.uniform1f(this.uniforms.uLutSize!, 0.0);

    this.gl = gl;
    this.program = program;
    this.texture = texture;
    this.lutTexture = lutTexture;
  }

  render(
    params: EditParams,
    intensity: number,
    splitTone: SplitTone | null,
    lut?: CubeLutData | null,
  ) {
    const gl = this.gl;
    const canvas = gl.canvas as HTMLCanvasElement;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniforms.uImage!, 0);

    const safeIntensity = Math.min(1, Math.max(0, intensity));
    gl.uniform1f(this.uniforms.uIntensity!, safeIntensity);

    // Nếu áp 3D LUT
    if (lut) {
      gl.uniform1f(this.uniforms.uLutEnabled!, 1.0);
      gl.uniform1f(this.uniforms.uLutSize!, lut.size);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.lutTexture);
      gl.uniform1i(this.uniforms.uLut!, 1);

      if (this.currentLut !== lut) {
        this.currentLut = lut;
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          lut.size * lut.size,
          lut.size,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          lut.rgbaData,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }

      gl.drawArrays(gl.TRIANGLES, 0, 6);
      return;
    }

    // Chế độ EditParams thông thường
    gl.uniform1f(this.uniforms.uLutEnabled!, 0.0);

    const p = clampParams(params);
    gl.uniform1f(this.uniforms.uExposure!, p.exposure);
    gl.uniform1f(this.uniforms.uTemperature!, p.temperature / 1000);
    gl.uniform1f(this.uniforms.uTint!, p.tint / 100);
    gl.uniform1f(this.uniforms.uContrast!, p.contrast);
    gl.uniform1f(this.uniforms.uHighlights!, p.highlights);
    gl.uniform1f(this.uniforms.uShadows!, p.shadows);
    gl.uniform1f(this.uniforms.uWhites!, p.whites);
    gl.uniform1f(this.uniforms.uBlacks!, p.blacks);
    gl.uniform1f(this.uniforms.uSaturation!, p.saturation);
    gl.uniform1f(this.uniforms.uVibrance!, p.vibrance);

    const k = HSL_CHANNELS.map((c) => c.key);
    const field = (idx: number, f: 'hue' | 'saturation' | 'luminance') =>
      p.hsl[k[idx]][f] / 100;

    gl.uniform3f(
      this.uniforms.uHslHueA!, field(0, 'hue'), field(1, 'hue'), field(2, 'hue'),
    );
    gl.uniform3f(
      this.uniforms.uHslSatA!, field(0, 'saturation'), field(1, 'saturation'), field(2, 'saturation'),
    );
    gl.uniform3f(
      this.uniforms.uHslLumA!, field(0, 'luminance'), field(1, 'luminance'), field(2, 'luminance'),
    );
    gl.uniform3f(
      this.uniforms.uHslHueB!, field(3, 'hue'), field(4, 'hue'), field(5, 'hue'),
    );
    gl.uniform3f(
      this.uniforms.uHslSatB!, field(3, 'saturation'), field(4, 'saturation'), field(5, 'saturation'),
    );
    gl.uniform3f(
      this.uniforms.uHslLumB!, field(3, 'luminance'), field(4, 'luminance'), field(5, 'luminance'),
    );
    gl.uniform2f(
      this.uniforms.uHslHueC!, field(6, 'hue'), field(7, 'hue'),
    );
    gl.uniform2f(
      this.uniforms.uHslSatC!, field(6, 'saturation'), field(7, 'saturation'),
    );
    gl.uniform2f(
      this.uniforms.uHslLumC!, field(6, 'luminance'), field(7, 'luminance'),
    );

    if (splitTone?.shadow && splitTone.shadow.saturation > 0) {
      const [r, g, b] = hsvToRgb(splitTone.shadow.hue, 1, 1);
      const mid = (r + g + b) / 3;
      const amt = splitTone.shadow.saturation / 100;
      gl.uniform3f(
        this.uniforms.uShadowTint!,
        (r - mid) * amt,
        (g - mid) * amt,
        (b - mid) * amt,
      );
      gl.uniform1f(this.uniforms.uShadowAmt!, 1);
    } else {
      gl.uniform3f(this.uniforms.uShadowTint!, 0, 0, 0);
      gl.uniform1f(this.uniforms.uShadowAmt!, 0);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.texture);
    gl.deleteTexture(this.lutTexture);
    gl.deleteProgram(this.program);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Không đọc được tệp ảnh này'));
      img.src = url;
    });
    if ('decode' in img) {
      try {
        await img.decode();
      } catch {
        /* decode() failure is non-fatal */
      }
    }
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downscaleCanvas(
  img: HTMLImageElement,
  maxSide: number,
): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Không tạo được canvas xem trước');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export type ExportPresetSize = 'original' | 'tiktok' | 'fb_portrait' | 'square' | 'landscape';
export type ExportFitMode = 'cover' | 'contain';
export type ExportFormat = 'jpeg' | 'png';

export interface ExportOptions {
  size: ExportPresetSize;
  fitMode: ExportFitMode;
  format: ExportFormat;
}

const EXPORT_DIMENSIONS: Record<Exclude<ExportPresetSize, 'original'>, { width: number; height: number; tag: string }> = {
  tiktok: { width: 1080, height: 1920, tag: 'tiktok-9x16' },
  fb_portrait: { width: 1080, height: 1350, tag: 'fb-4x5' },
  square: { width: 1080, height: 1080, tag: 'vuong-1x1' },
  landscape: { width: 1920, height: 1080, tag: 'ngang-16x9' },
};

export async function exportImage(
  img: HTMLImageElement,
  params: EditParams,
  intensity: number,
  splitTone: SplitTone | null,
  lut?: CubeLutData | null,
  options: ExportOptions = { size: 'original', fitMode: 'cover', format: 'jpeg' },
): Promise<void> {
  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = img.naturalWidth;
  sourceCanvas.height = img.naturalHeight;
  const engine = new ImageEngine(sourceCanvas, img);
  try {
    engine.render(params, intensity, splitTone, lut);

    let finalCanvas: HTMLCanvasElement = sourceCanvas;
    let fileTag = 'goc';

    if (options.size !== 'original') {
      const target = EXPORT_DIMENSIONS[options.size];
      fileTag = target.tag;
      const out = document.createElement('canvas');
      out.width = target.width;
      out.height = target.height;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Không tạo được canvas xuất ảnh');

      const srcW = sourceCanvas.width;
      const srcH = sourceCanvas.height;

      if (options.fitMode === 'cover') {
        const scale = Math.max(target.width / srcW, target.height / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const dx = (target.width - drawW) / 2;
        const dy = (target.height - drawH) / 2;
        ctx.drawImage(sourceCanvas, dx, dy, drawW, drawH);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, target.width, target.height);
        const scale = Math.min(target.width / srcW, target.height / srcH);
        const drawW = srcW * scale;
        const drawH = srcH * scale;
        const dx = (target.width - drawW) / 2;
        const dy = (target.height - drawH) / 2;
        ctx.drawImage(sourceCanvas, dx, dy, drawW, drawH);
      }
      finalCanvas = out;
    }

    const mime = options.format === 'png' ? 'image/png' : 'image/jpeg';
    const ext = options.format === 'png' ? 'png' : 'jpg';
    const quality = options.format === 'png' ? undefined : 0.92;

    const blob = await new Promise<Blob | null>((resolve) =>
      finalCanvas.toBlob(resolve, mime, quality),
    );
    if (!blob) throw new Error('Không xuất được ảnh');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-mau-${fileTag}-${Date.now()}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } finally {
    engine.dispose();
  }
}
