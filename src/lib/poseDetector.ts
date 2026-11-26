import type { DynamicSkeleton, Point2D } from '@/lib/geminiApi';

let landmarkerPromise: Promise<any> | null = null;

async function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const { PoseLandmarker, FilesetResolver } = vision;
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
      );
      return PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numPoses: 1,
      });
    })().catch((err) => {
      landmarkerPromise = null;
      throw err;
    });
  }
  return landmarkerPromise;
}

function clampPt(x: number, y: number): Point2D {
  return {
    x: Math.min(94, Math.max(6, x)),
    y: Math.min(94, Math.max(6, y)),
  };
}

/**
 * Tách tự động 14 khớp xương cơ thể từ bất kỳ ảnh người thật nào (TikTok / Pinterest)
 * chạy hoàn toàn trên trình duyệt bằng MediaPipe Pose (miễn phí 100%, không tốn API).
 */
export async function extractSkeletonFromImage(
  img: HTMLImageElement | HTMLCanvasElement,
): Promise<DynamicSkeleton | null> {
  const landmarker = await getPoseLandmarker();
  const result = landmarker.detect(img);
  const lm = result?.landmarks?.[0];
  if (!lm || lm.length < 29) {
    return null;
  }

  const p = (idx: number): Point2D => clampPt(lm[idx].x * 100, lm[idx].y * 100);
  const lShoulder = p(11);
  const rShoulder = p(12);
  const nose = p(0);

  const midShoulder: Point2D = {
    x: (lShoulder.x + rShoulder.x) / 2,
    y: (lShoulder.y + rShoulder.y) / 2,
  };

  // Tâm đầu hơi cao hơn mũi một chút để vẽ oval đầu tự nhiên
  const head: Point2D = clampPt(
    nose.x,
    nose.y - Math.max(1.5, (midShoulder.y - nose.y) * 0.25),
  );

  const neck: Point2D = clampPt(
    midShoulder.x,
    midShoulder.y - (midShoulder.y - head.y) * 0.18,
  );

  return {
    head,
    neck,
    lShoulder,
    rShoulder,
    lElbow: p(13),
    rElbow: p(14),
    lWrist: p(15),
    rWrist: p(16),
    lHip: p(23),
    rHip: p(24),
    lKnee: p(25),
    rKnee: p(26),
    lAnkle: p(27),
    rAnkle: p(28),
  };
}
