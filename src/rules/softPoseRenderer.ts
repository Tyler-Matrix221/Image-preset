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
 * Nội suy Catmull-Rom spline mượt mà cho đường nét đứt chỉ dẫn dáng.
 */
function buildSmoothCurve(points: Point2D[], subdivisions = 4): string {
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

/**
 * Tạo đầu mũi tên chữ V thanh thoát tại điểm `tip` hướng theo vector `from -> tip`.
 */
function buildArrowHead(from: Point2D, tip: Point2D, size = 8): string {
  const dx = tip.x - from.x;
  const dy = tip.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 3) return '';
  const ux = dx / len;
  const uy = dy / len;
  const angle = Math.PI / 5.5; // ~33 độ
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const left: Point2D = {
    x: tip.x - size * (ux * cos - uy * sin),
    y: tip.y - size * (ux * sin + uy * cos),
  };
  const right: Point2D = {
    x: tip.x - size * (ux * cos + uy * sin),
    y: tip.y - size * (-ux * sin + uy * cos),
  };
  return `M${fmt(left)} L${fmt(tip)} L${fmt(right)}`;
}

export interface GuidePosePaths {
  headCx: number;
  headCy: number;
  headR: number;
  gazeArrowPath: string;
  torsoCurvePath: string;
  leftArmPath: string;
  leftArmArrow: string;
  rightArmPath: string;
  rightArmArrow: string;
  leftLegPath: string;
  leftLegArrow: string;
  rightLegPath: string;
  rightLegArrow: string;
}

/**
 * Dựng bộ đường nét đứt + mũi tên chỉ hướng tối giản (kiểu Hình 2 & Hình 3),
 * bỏ hoàn toàn hình người que để không che cảnh và dễ hình dung tức thì.
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
): GuidePosePaths {
  const shoulderW = Math.max(14, dist(pts.lShoulder, pts.rShoulder));
  const midShoulder = mid(pts.lShoulder, pts.rShoulder);
  const midHip = mid(pts.lHip, pts.rHip);
  const spineMid = pts.spineMid || mid(midShoulder, midHip, 0.55);

  // Vòng tròn nét đứt mảnh đánh dấu vị trí đầu
  const headR = Math.max(9, Math.min(24, shoulderW * 0.34));

  // Mũi tên nhỏ chỉ hướng quay mặt (nếu quay nghiêng)
  let gazeArrowPath = '';
  if (pts.faceTarget) {
    const dx = pts.faceTarget.x - pts.head.x;
    const dy = pts.faceTarget.y - pts.head.y;
    const dLen = Math.hypot(dx, dy);
    if (dLen > 3) {
      const startPt: Point2D = {
        x: pts.head.x + (dx / dLen) * (headR * 0.4),
        y: pts.head.y + (dy / dLen) * (headR * 0.4),
      };
      const endPt: Point2D = {
        x: pts.head.x + (dx / dLen) * (headR * 1.45),
        y: pts.head.y + (dy / dLen) * (headR * 1.45),
      };
      gazeArrowPath = `M${fmt(startPt)} L${fmt(endPt)} ${buildArrowHead(startPt, endPt, 6)}`;
    }
  }

  // Đường cong trục thân / độ nghiêng người
  const torsoCurvePath = buildSmoothCurve([pts.neck, spineMid, midHip], 4);

  // Tay: nét đứt cong theo khuỷu tay + đầu mũi tên tại bàn tay/cổ tay
  const buildArm = (sh: Point2D, el: Point2D, wr: Point2D, hand?: Point2D) => {
    const endPt = hand && dist(wr, hand) > 1.5 ? hand : wr;
    const prevPt = hand && dist(wr, hand) > 1.5 ? wr : el;
    const curve = buildSmoothCurve([sh, mid(sh, el), el, mid(el, wr), endPt], 3);
    const arrow = buildArrowHead(prevPt, endPt, 7.5);
    return { curve, arrow };
  };

  // Chân: nét đứt cong theo đầu gối + đầu mũi tên tại bàn chân/cổ chân
  const buildLeg = (hip: Point2D, kn: Point2D, an: Point2D, foot?: Point2D) => {
    const endPt = foot && dist(an, foot) > 1.5 ? foot : an;
    const prevPt = foot && dist(an, foot) > 1.5 ? an : kn;
    const curve = buildSmoothCurve([hip, mid(hip, kn), kn, mid(kn, an), endPt], 3);
    const arrow = buildArrowHead(prevPt, endPt, 8);
    return { curve, arrow };
  };

  const lArm = buildArm(pts.lShoulder, pts.lElbow, pts.lWrist, pts.lHand);
  const rArm = buildArm(pts.rShoulder, pts.rElbow, pts.rWrist, pts.rHand);
  const lLeg = buildLeg(pts.lHip, pts.lKnee, pts.lAnkle, pts.lFoot);
  const rLeg = buildLeg(pts.rHip, pts.rKnee, pts.rAnkle, pts.rFoot);

  return {
    headCx: pts.head.x,
    headCy: pts.head.y,
    headR,
    gazeArrowPath,
    torsoCurvePath,
    leftArmPath: lArm.curve,
    leftArmArrow: lArm.arrow,
    rightArmPath: rArm.curve,
    rightArmArrow: rArm.arrow,
    leftLegPath: lLeg.curve,
    leftLegArrow: lLeg.arrow,
    rightLegPath: rLeg.curve,
    rightLegArrow: rLeg.arrow,
  };
}

export type { DynamicSkeleton };
