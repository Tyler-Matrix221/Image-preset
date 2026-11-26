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
 * Tạo đường viền ống tay/chân bo cong mềm mại qua 3 khớp (Vai-Khuỷu-Cổ tay hoặc Hông-Gối-Cổ chân),
 * nối tiếp thêm bàn tay hoặc bàn chân ở đầu mút nếu có.
 */
function buildLimbWithEndPath(
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  pEnd: Point2D | undefined,
  w0: number,
  w1: number,
  w2: number,
  wEnd: number,
): string {
  const n0 = perp(p0, p1);
  const n2 = perp(p1, p2);
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

  if (pEnd && dist(p2, pEnd) > 2) {
    const nEnd = perp(p2, pEnd);
    const aEnd = offsetPt(pEnd, nEnd, wEnd);
    const bEnd = offsetPt(pEnd, nEnd, -wEnd);
    const dirEnd = {
      x: (pEnd.x - p2.x) / (dist(p2, pEnd) || 1),
      y: (pEnd.y - p2.y) / (dist(p2, pEnd) || 1),
    };
    const tip = {
      x: pEnd.x + dirEnd.x * (wEnd * 1.4),
      y: pEnd.y + dirEnd.y * (wEnd * 1.4),
    };
    const m2eA = mid(a2, aEnd);
    const m2eB = mid(b2, bEnd);

    return [
      `M${fmt(a0)}`,
      `L${fmt(m01a)}`,
      `Q${fmt(a1)} ${fmt(m12a)}`,
      `L${fmt(a2)}`,
      `Q${fmt(m2eA)} ${fmt(aEnd)}`,
      `Q${fmt(tip)} ${fmt(bEnd)}`,
      `Q${fmt(m2eB)} ${fmt(b2)}`,
      `L${fmt(m12b)}`,
      `Q${fmt(b1)} ${fmt(m01b)}`,
      `L${fmt(b0)}`,
      'Z',
    ].join(' ');
  }

  const dirEnd = {
    x: (p2.x - p1.x) / (dist(p1, p2) || 1),
    y: (p2.y - p1.y) / (dist(p1, p2) || 1),
  };
  const tip = { x: p2.x + dirEnd.x * (w2 * 1.6), y: p2.y + dirEnd.y * (w2 * 1.6) };

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
  faceLinePath: string;
  neckPath: string;
  torsoPath: string;
  leftArmPath: string;
  rightArmPath: string;
  leftLegPath: string;
  rightLegPath: string;
  jointDots: Point2D[];
}

/**
 * Chuyển 20 khớp xương thành đường viền cơ thể mềm mại (Soft Croquis Silhouette),
 * hỗ trợ cột sống cong (spineMid), hướng mặt (faceTarget), bàn tay và bàn chân.
 */
export function buildSoftSilhouette(
  pts: {
    head: Point2D;
    faceTarget?: Point2D;
    neck: Point2D;
    spineMid?: Point2D;
    lShoulder: Point2D;
    rShoulder: Point2D;
    lElbow: Point2D;
    rElbow: Point2D;
    lWrist: Point2D;
    rWrist: Point2D;
    lHand?: Point2D;
    rHand?: Point2D;
    lHip: Point2D;
    rHip: Point2D;
    lKnee: Point2D;
    rKnee: Point2D;
    lAnkle: Point2D;
    rAnkle: Point2D;
    lFoot?: Point2D;
    rFoot?: Point2D;
  },
  gender: ModelGender,
): SoftSilhouettePaths {
  const shoulderW = Math.max(14, dist(pts.lShoulder, pts.rShoulder));
  const midShoulder = mid(pts.lShoulder, pts.rShoulder);
  const midHip = mid(pts.lHip, pts.rHip);
  const torsoH = Math.max(24, dist(midShoulder, midHip));

  const headRy = Math.max(9, Math.min(26, shoulderW * 0.36));
  const headRx = headRy * 0.82;
  const headAngleDeg =
    (Math.atan2(pts.head.x - pts.neck.x, -(pts.head.y - pts.neck.y)) * 180) / Math.PI;

  // Đường chỉ hướng nhìn nhẹ trên khuôn mặt (giúp model biết quay mặt sang trái/phải/thẳng)
  let faceLinePath = '';
  if (pts.faceTarget) {
    const dx = pts.faceTarget.x - pts.head.x;
    const dy = pts.faceTarget.y - pts.head.y;
    const dLen = Math.hypot(dx, dy) || 1;
    const gazeShiftX = Math.max(-headRx * 0.45, Math.min(headRx * 0.45, (dx / dLen) * headRx * 0.4));
    const gazeShiftY = Math.max(-headRy * 0.25, Math.min(headRy * 0.25, (dy / dLen) * headRy * 0.2));
    const browY = pts.head.y - headRy * 0.12 + gazeShiftY * 0.5;
    const chinY = pts.head.y + headRy * 0.55 + gazeShiftY * 0.5;
    faceLinePath = `M${(pts.head.x + gazeShiftX * 0.7).toFixed(1)},${browY.toFixed(1)} Q${(pts.head.x + gazeShiftX * 1.15).toFixed(1)},${(pts.head.y + headRy * 0.22).toFixed(1)} ${(pts.head.x + gazeShiftX * 0.6).toFixed(1)},${chinY.toFixed(1)}`;
  }

  // Đường cổ
  const neckW = shoulderW * 0.14;
  const neckN = perp(pts.neck, pts.head);
  const neckTopL = offsetPt(mid(pts.neck, pts.head, 0.35), neckN, neckW);
  const neckTopR = offsetPt(mid(pts.neck, pts.head, 0.35), neckN, -neckW);
  const neckBotL = offsetPt(pts.neck, neckN, neckW * 1.15);
  const neckBotR = offsetPt(pts.neck, neckN, -neckW * 1.15);
  const neckPath = `M${fmt(neckTopL)} L${fmt(neckBotL)} M${fmt(neckTopR)} L${fmt(neckBotR)}`;

  // Thân người uốn cong mềm mại theo spineMid (nữ thắt eo mềm hơn nam)
  const waistFactor = gender === 'male' ? 0.84 : 0.68;
  const waistCenter = pts.spineMid || mid(midShoulder, midHip, 0.56);
  const torsoAxis = perp(midShoulder, midHip);
  const waistHalf = (shoulderW * waistFactor) / 2;

  const sideSign =
    (pts.lShoulder.x - midShoulder.x) * torsoAxis.x +
      (pts.lShoulder.y - midShoulder.y) * torsoAxis.y >=
    0
      ? 1
      : -1;
  const lWaist = offsetPt(waistCenter, torsoAxis, waistHalf * sideSign);
  const rWaist = offsetPt(waistCenter, torsoAxis, -waistHalf * sideSign);

  const lHipOuter = mid(pts.lHip, offsetPt(pts.lHip, torsoAxis, shoulderW * 0.14 * sideSign));
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

  const armBase = Math.max(3.2, shoulderW * (gender === 'male' ? 0.135 : 0.11));
  const legBase = Math.max(4.2, shoulderW * (gender === 'male' ? 0.185 : 0.17));
  const pad = torsoH * 0.01;

  const leftArmPath = buildLimbWithEndPath(
    pts.lShoulder,
    pts.lElbow,
    pts.lWrist,
    pts.lHand,
    armBase + pad,
    armBase * 0.78,
    armBase * 0.52,
    armBase * 0.36,
  );
  const rightArmPath = buildLimbWithEndPath(
    pts.rShoulder,
    pts.rElbow,
    pts.rWrist,
    pts.rHand,
    armBase + pad,
    armBase * 0.78,
    armBase * 0.52,
    armBase * 0.36,
  );
  const leftLegPath = buildLimbWithEndPath(
    pts.lHip,
    pts.lKnee,
    pts.lAnkle,
    pts.lFoot,
    legBase,
    legBase * 0.72,
    legBase * 0.48,
    legBase * 0.42,
  );
  const rightLegPath = buildLimbWithEndPath(
    pts.rHip,
    pts.rKnee,
    pts.rAnkle,
    pts.rFoot,
    legBase,
    legBase * 0.72,
    legBase * 0.48,
    legBase * 0.42,
  );

  return {
    headCx: pts.head.x,
    headCy: pts.head.y,
    headRx,
    headRy,
    headAngleDeg,
    faceLinePath,
    neckPath,
    torsoPath,
    leftArmPath,
    rightArmPath,
    leftLegPath,
    rightLegPath,
    jointDots: [pts.lElbow, pts.rElbow, pts.lWrist, pts.rWrist, pts.lKnee, pts.rKnee],
  };
}

export type { DynamicSkeleton };
