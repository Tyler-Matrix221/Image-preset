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

function fmt(p: Point2D): string {
  return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
}

/**
 * Nội suy Catmull-Rom spline thành chuỗi điểm mượt (tạo >50 điểm khớp tự nhiên từ các khớp chính)
 * và xuất ra đường SVG nét đơn liên tục.
 */
function buildSmoothSingleLine(points: Point2D[], subdivisions = 4): string {
  if (points.length < 2) return '';
  if (points.length === 2) return `M${fmt(points[0])} L${fmt(points[1])}`;

  const sampled: Point2D[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    for (let s = 0; s < subdivisions; s++) {
      const t = s / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;

      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      sampled.push({ x, y });
    }
  }
  sampled.push(points[points.length - 1]);

  return sampled.map((pt, idx) => `${idx === 0 ? 'M' : 'L'}${fmt(pt)}`).join(' ');
}

export interface SingleLinePosePaths {
  headCx: number;
  headCy: number;
  headRx: number;
  headRy: number;
  headAngleDeg: number;
  faceLinePath: string;
  spinePath: string;
  shouldersPath: string;
  hipsPath: string;
  leftArmPath: string;
  rightArmPath: string;
  leftLegPath: string;
  rightLegPath: string;
  keyJoints: Point2D[];
}

/**
 * Dựng khung dáng NÉT ĐƠN mượt mà từ khớp AI, tự động nội suy thành 50+ điểm khớp liên tục
 * (cột sống cong, cầu vai, hông, tay, bàn tay, chân, bàn chân và hướng mặt).
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
  _gender: ModelGender,
): SingleLinePosePaths {
  const shoulderW = Math.max(14, dist(pts.lShoulder, pts.rShoulder));
  const midShoulder = mid(pts.lShoulder, pts.rShoulder);
  const midHip = mid(pts.lHip, pts.rHip);
  const spineMid = pts.spineMid || mid(midShoulder, midHip, 0.55);

  const headRy = Math.max(9, Math.min(25, shoulderW * 0.35));
  const headRx = headRy * 0.82;
  const headAngleDeg =
    (Math.atan2(pts.head.x - pts.neck.x, -(pts.head.y - pts.neck.y)) * 180) / Math.PI;

  // Đường chỉ hướng nhìn trên đầu
  let faceLinePath = '';
  if (pts.faceTarget) {
    const dx = pts.faceTarget.x - pts.head.x;
    const dy = pts.faceTarget.y - pts.head.y;
    const dLen = Math.hypot(dx, dy) || 1;
    const gazeX = Math.max(-headRx * 0.45, Math.min(headRx * 0.45, (dx / dLen) * headRx * 0.42));
    const gazeY = Math.max(-headRy * 0.25, Math.min(headRy * 0.25, (dy / dLen) * headRy * 0.2));
    const browY = pts.head.y - headRy * 0.14 + gazeY * 0.5;
    const chinY = pts.head.y + headRy * 0.56 + gazeY * 0.5;
    faceLinePath = `M${(pts.head.x + gazeX * 0.7).toFixed(1)},${browY.toFixed(1)} Q${(pts.head.x + gazeX * 1.15).toFixed(1)},${(pts.head.y + headRy * 0.2).toFixed(1)} ${(pts.head.x + gazeX * 0.6).toFixed(1)},${chinY.toFixed(1)}`;
  }

  // Đường nét đơn cột sống cong mượt từ cổ -> ngực -> eo -> xương chậu
  const chestPt = mid(pts.neck, spineMid, 0.48);
  const spinePath = buildSmoothSingleLine([pts.neck, chestPt, spineMid, midHip], 4);

  // Cầu vai & xương chậu cong nhẹ tự nhiên
  const shouldersPath = buildSmoothSingleLine([pts.lShoulder, pts.neck, pts.rShoulder], 4);
  const hipsPath = buildSmoothSingleLine([pts.lHip, midHip, pts.rHip], 4);

  // Tay & Chân nét đơn nội suy 4 đoạn/khúc (>50 điểm tổng thể)
  const buildArm = (sh: Point2D, el: Point2D, wr: Point2D, hand?: Point2D) => {
    const arr = [sh, mid(sh, el), el, mid(el, wr), wr];
    if (hand && dist(wr, hand) > 1.5) arr.push(hand);
    return buildSmoothSingleLine(arr, 3);
  };

  const buildLeg = (hip: Point2D, kn: Point2D, an: Point2D, foot?: Point2D) => {
    const arr = [hip, mid(hip, kn), kn, mid(kn, an), an];
    if (foot && dist(an, foot) > 1.5) arr.push(foot);
    return buildSmoothSingleLine(arr, 3);
  };

  const leftArmPath = buildArm(pts.lShoulder, pts.lElbow, pts.lWrist, pts.lHand);
  const rightArmPath = buildArm(pts.rShoulder, pts.rElbow, pts.rWrist, pts.rHand);
  const leftLegPath = buildLeg(pts.lHip, pts.lKnee, pts.lAnkle, pts.lFoot);
  const rightLegPath = buildLeg(pts.rHip, pts.rKnee, pts.rAnkle, pts.rFoot);

  const keyJoints: Point2D[] = [
    pts.neck,
    spineMid,
    pts.lShoulder,
    pts.rShoulder,
    pts.lElbow,
    pts.rElbow,
    pts.lWrist,
    pts.rWrist,
    pts.lHip,
    pts.rHip,
    pts.lKnee,
    pts.rKnee,
    pts.lAnkle,
    pts.rAnkle,
  ];
  if (pts.lHand) keyJoints.push(pts.lHand);
  if (pts.rHand) keyJoints.push(pts.rHand);
  if (pts.lFoot) keyJoints.push(pts.lFoot);
  if (pts.rFoot) keyJoints.push(pts.rFoot);

  return {
    headCx: pts.head.x,
    headCy: pts.head.y,
    headRx,
    headRy,
    headAngleDeg,
    faceLinePath,
    spinePath,
    shouldersPath,
    hipsPath,
    leftArmPath,
    rightArmPath,
    leftLegPath,
    rightLegPath,
    keyJoints,
  };
}

export type { DynamicSkeleton };
