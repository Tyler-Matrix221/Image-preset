import type { DynamicSkeleton, ModelGender, Point2D } from '@/lib/geminiApi';

function dist(a: Point2D, b: Point2D): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function mid(a: Point2D, b: Point2D, t = 0.5): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function perp(a: Point2D, b: Point2D): Point2D {
  const len = dist(a, b) || 1;
  return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
}

function offsetPt(p: Point2D, n: Point2D, d: number): Point2D {
  return { x: p.x + n.x * d, y: p.y + n.y * d };
}

function fmt(p: Point2D): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

/**
 * Tạo đường viền ống tay hoặc ống chân bo cong mềm mại qua 3 khớp (Vai-Khuỷu-Cổ tay hoặc Hông-Gối-Cổ chân).
 */
function buildLimbPath(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  w0: number,
  w1: number,
  w2: number,
): string {
  const n0 = perp(p0, p1);
  const n2 = perp(p1, p2);
  // Pháp tuyến trung bình tại khớp giữa để bo tròn tự nhiên
  const nx = n0.x + n2.x;
  const ny = n0.y + n2.y;
  const nLen = Math.hypot(nx, ny) || 1;
  const n1 = { x: nx / nLen, y: ny / nLen };

  const a0 = offsetPt(p0, n0, w0);
  const a1 = offsetPt(p1, n1, w1);
  const a2 = offsetPt(p2, n2, w2);

  const b0 = offsetPt(p0, n0, -w0);
  const b1 = offsetPt(p1, n1, -w1);
  const b2 = offsetPt(p2, n2, -w2);

  const m01a = mid(a0, a1);
  const m12a = mid(a1, a2);
  const m01b = mid(b0, b1);
  const m12b = mid(b1, b2);

  // Bo tròn đầu bàn tay / bàn chân
  const dirEnd = {
    x: (p2.x - p1.x) / (dist(p1, p2) || 1),
    y: (p2.y - p1.y) / (dist(p1, p2) || 1),
  };
  const tip = { x: p2.x + dirEnd.x * (w2 * 1.8), y: p2.y + dirEnd.y * (w2 * 1.8) };

  return [
    `M${fmt(a0)}`,
    `L${fmt(m01a)}`,
    `Q${fmt(a1)} ${fmt(m12a)}`,
    `L${fmt(a2)}`,
    `Q${fmt(tip)} ${fmt(b2)}`,
    `L${fmt(m12b)}`,
    `Q${fmt(b1)} ${fmt(m01b)}`,
    `L${fmt(b0)}`,
    'Z',
  ].join(' ');
}

export interface SoftSilhouettePaths {
  headCx: number;
  headCy: number;
  headRx: number;
  headRy: number;
  headAngleDeg: number;
  neckPath: string;
  torsoPath: string;
  leftArmPath: string;
  rightArmPath: string;
  leftLegPath: string;
  rightLegPath: string;
}

/**
 * Chuyển 14 khớp xương thành đường viền cơ thể mềm mại (Soft Contour Silhouette),
 * tự điều chỉnh tỷ lệ vai/eo theo giới tính Nam hoặc Nữ.
 */
export function buildSoftSilhouette(
  pts: {
    head: Point2D;
    neck: Point2D;
    lShoulder: Point2D;
    rShoulder: Point2D;
    lElbow: Point2D;
    rElbow: Point2D;
    lWrist: Point2D;
    rWrist: Point2D;
    lHip: Point2D;
    rHip: Point2D;
    lKnee: Point2D;
    rKnee: Point2D;
    lAnkle: Point2D;
    rAnkle: Point2D;
  },
  gender: ModelGender,
): SoftSilhouettePaths {
  const shoulderW = Math.max(14, dist(pts.lShoulder, pts.rShoulder));
  const torsoH = Math.max(24, dist(mid(pts.lShoulder, pts.rShoulder), mid(pts.lHip, pts.rHip)));

  const headRy = Math.max(9, Math.min(26, shoulderW * 0.36));
  const headRx = headRy * 0.82;
  const headAngleDeg =
    (Math.atan2(pts.head.x - pts.neck.x, -(pts.head.y - pts.neck.y)) * 180) / Math.PI;

  // Đường cổ
  const neckW = shoulderW * 0.14;
  const neckN = perp(pts.neck, pts.head);
  const neckTopL = offsetPt(mid(pts.neck, pts.head, 0.35), neckN, neckW);
  const neckTopR = offsetPt(mid(pts.neck, pts.head, 0.35), neckN, -neckW);
  const neckBotL = offsetPt(pts.neck, neckN, neckW * 1.15);
  const neckBotR = offsetPt(pts.neck, neckN, -neckW * 1.15);
  const neckPath = `M${fmt(neckTopL)} L${fmt(neckBotL)} M${fmt(neckTopR)} L${fmt(neckBotR)}`;

  // Thân người có đường cong eo mềm mại (nữ thắt eo rõ hơn nam)
  const waistFactor = gender === 'male' ? 0.86 : 0.7;
  const midShoulder = mid(pts.lShoulder, pts.rShoulder);
  const midHip = mid(pts.lHip, pts.rHip);
  const waistCenter = mid(midShoulder, midHip, 0.58);
  const torsoAxis = perp(midShoulder, midHip);
  const waistHalf = (shoulderW * waistFactor) / 2;

  // Đảm bảo lWaist cùng phía với lShoulder
  const sideSign =
    (pts.lShoulder.x - midShoulder.x) * torsoAxis.x +
      (pts.lShoulder.y - midShoulder.y) * torsoAxis.y >=
    0
      ? 1
      : -1;
  const lWaist = offsetPt(waistCenter, torsoAxis, waistHalf * sideSign);
  const rWaist = offsetPt(waistCenter, torsoAxis, -waistHalf * sideSign);

  // Bo tròn nhẹ hông & vai
  const lHipOuter = mid(pts.lHip, offsetPt(pts.lHip, torsoAxis, (shoulderW * 0.14) * sideSign));
  const rHipOuter = mid(pts.rHip, offsetPt(pts.rHip, torsoAxis, -(shoulderW * 0.14) * sideSign));
  const collarMid = mid(pts.lShoulder, pts.rShoulder);
  const collarDip = {
    x: collarMid.x + (midHip.x - midShoulder.x) * 0.08,
    y: collarMid.y + (midHip.y - midShoulder.y) * 0.08,
  };

  const torsoPath = [
    `M${fmt(pts.lShoulder)}`,
    `Q${fmt(collarDip)} ${fmt(pts.rShoulder)}`,
    `Q${fmt(rWaist)} ${fmt(rHipOuter)}`,
    `Q${fmt(mid(midHip, pts.rHip, 0.4))} ${fmt(midHip)}`,
    `Q${fmt(mid(midHip, pts.lHip, 0.4))} ${fmt(lHipOuter)}`,
    `Q${fmt(lWaist)} ${fmt(pts.lShoulder)}`,
    'Z',
  ].join(' ');

  // Độ dày tay và chân tỷ lệ theo kích thước vai & chiều dài thân
  const armBase = Math.max(3.5, shoulderW * (gender === 'male' ? 0.14 : 0.115));
  const legBase = Math.max(4.5, shoulderW * (gender === 'male' ? 0.19 : 0.175));
  const pad = torsoH * 0.01;

  const leftArmPath = buildLimbPath(
    pts.lShoulder,
    pts.lElbow,
    pts.lWrist,
    armBase + pad,
    armBase * 0.8,
    armBase * 0.55,
  );
  const rightArmPath = buildLimbPath(
    pts.rShoulder,
    pts.rElbow,
    pts.rWrist,
    armBase + pad,
    armBase * 0.8,
    armBase * 0.55,
  );
  const leftLegPath = buildLimbPath(
    pts.lHip,
    pts.lKnee,
    pts.lAnkle,
    legBase,
    legBase * 0.72,
    legBase * 0.48,
  );
  const rightLegPath = buildLimbPath(
    pts.rHip,
    pts.rKnee,
    pts.rAnkle,
    legBase,
    legBase * 0.72,
    legBase * 0.48,
  );

  return {
    headCx: pts.head.x,
    headCy: pts.head.y,
    headRx,
    headRy,
    headAngleDeg,
    neckPath,
    torsoPath,
    leftArmPath,
    rightArmPath,
    leftLegPath,
    rightLegPath,
  };
}

export type { DynamicSkeleton };
