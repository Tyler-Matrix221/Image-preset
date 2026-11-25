import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Crop,
  Eye,
  EyeOff,
  FlipHorizontal2,
  ImagePlus,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { readBasicExif, type PhotoExif } from '@/lib/exifReader';
import {
  analyzeShootingScene,
  DemoLimitReachedError,
  generatePosePreviewImage,
  getDemoQuota,
  hasAiAccess,
  hasDemoProxy,
  type DemoQuota,
  type DynamicSkeleton,
  type ModelGender,
  type PoseSuggestion,
  type ShootingGuideResult,
  type SuggestedCrop,
} from '@/lib/geminiApi';
import { loadImage } from '@/lib/imageEngine';
import { POSE_TEMPLATES, getPoseById, type PoseTemplate } from '@/rules/poseTemplates';
import { buildSoftSilhouette } from '@/rules/softPoseRenderer';

interface ShootingCoachTabProps {
  hasApiKey: boolean;
  demoQuota: DemoQuota | null;
  onQuotaUpdated: (q: DemoQuota | null) => void;
  onOpenSettings: (limitNotice?: string) => void;
  onSendToColorTab: (file: File) => void;
  onError: (msg: string) => void;
}

export default function ShootingCoachTab({
  hasApiKey,
  demoQuota,
  onQuotaUpdated,
  onOpenSettings,
  onSendToColorTab,
  onError,
}: ShootingCoachTabProps) {
  const [sceneFile, setSceneFile] = useState<File | null>(null);
  const [sceneUrl, setSceneUrl] = useState<string | null>(null);
  const [sceneExif, setSceneExif] = useState<PhotoExif | null>(null);

  const [refUrl, setRefUrl] = useState<string | null>(null);
  const [modelGender, setModelGender] = useState<ModelGender>('female');
  const [analyzedGender, setAnalyzedGender] = useState<ModelGender | null>(null);
  const [guide, setGuide] = useState<ShootingGuideResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Cách 2: Ảnh AI ghép người mẫu thật vào bối cảnh
  const [generatedPoseUrl, setGeneratedPoseUrl] = useState<string | null>(null);
  const [showGeneratedPose, setShowGeneratedPose] = useState(false);
  const [isGeneratingPoseImg, setIsGeneratingPoseImg] = useState(false);

  // Ảnh mẫu đã crop & cân thẳng theo gợi ý AI
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [cropPreviewActive, setCropPreviewActive] = useState(false);

  // Khung dáng đang chọn & vị trí kéo thả trên ảnh (mặc định ẩn khi mới tải ảnh)
  const [selectedPoseId, setSelectedPoseId] = useState<string>(POSE_TEMPLATES[0].id);
  const [posePos, setPosePos] = useState({ x: 50, y: 54, scale: 0.9 });
  const [skeletonOffset, setSkeletonOffset] = useState({ dx: 0, dy: 0 });
  const [flipPose, setFlipPose] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [showAllPoses, setShowAllPoses] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const outerStageRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const draggingPoseRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [imgBoxSize, setImgBoxSize] = useState<{ width: number; height: number } | null>(null);

  // Đồng bộ kích thước stageRef khớp chính xác 100% với khung ảnh thật (không tính viền đen)
  useEffect(() => {
    const updateBox = () => {
      const outer = outerStageRef.current;
      const img = imgRef.current;
      if (!outer || !img || !img.naturalWidth || !img.naturalHeight) return;
      const padX = 24;
      const padY = 16;
      const availW = Math.max(100, outer.clientWidth - padX);
      const availH = Math.max(100, outer.clientHeight - padY);
      const ratio = img.naturalWidth / img.naturalHeight;
      let w = availW;
      let h = w / ratio;
      if (h > availH) {
        h = availH;
        w = h * ratio;
      }
      setImgBoxSize({ width: Math.round(w), height: Math.round(h) });
    };

    updateBox();
    const ro = new ResizeObserver(updateBox);
    if (outerStageRef.current) ro.observe(outerStageRef.current);
    return () => ro.disconnect();
  }, [sceneUrl]);

  const handleSelectScene = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('Vui lòng chọn file ảnh hợp lệ (.jpg, .png, .webp).');
      return;
    }
    if (sceneUrl) URL.revokeObjectURL(sceneUrl);
    if (croppedUrl) URL.revokeObjectURL(croppedUrl);
    const url = URL.createObjectURL(file);
    setSceneFile(file);
    setSceneUrl(url);
    setCroppedUrl(null);
    setCroppedFile(null);
    setCropPreviewActive(false);
    setShowOverlay(false);
    setGuide(null);
    setAnalyzedGender(null);
    setGeneratedPoseUrl(null);
    setShowGeneratedPose(false);
    setPosePos({ x: 50, y: 54, scale: 0.9 });
    setSkeletonOffset({ dx: 0, dy: 0 });

    const exif = await readBasicExif(file);
    setSceneExif(exif);
  };

  const handleSelectRef = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    if (refUrl) URL.revokeObjectURL(refUrl);
    setRefUrl(URL.createObjectURL(file));
  };

  const handleClearRef = () => {
    if (refUrl) URL.revokeObjectURL(refUrl);
    setRefUrl(null);
    if (refInputRef.current) refInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!sceneFile) return;
    if (!hasApiKey && !hasAiAccess()) {
      onOpenSettings();
      return;
    }

    setIsAnalyzing(true);
    try {
      const sceneImg = await loadImage(sceneFile);
      let refImg: HTMLImageElement | null = null;
      if (refUrl) {
        refImg = new Image();
        await new Promise((res, rej) => {
          refImg!.onload = () => res(refImg);
          refImg!.onerror = () => rej(new Error('Không tải được ảnh mẫu tham khảo'));
          refImg!.src = refUrl;
        });
      }

      const result = await analyzeShootingScene({
        sceneImage: sceneImg,
        referenceImage: refImg,
        exif: sceneExif,
        modelGender,
      });

      onQuotaUpdated(getDemoQuota());
      setGuide(result);
      setAnalyzedGender(modelGender);
      setGeneratedPoseUrl(null);
      setShowGeneratedPose(false);
      setShowOverlay(true);
      setShowAllPoses(false);
      setCropPreviewActive(false);

      // Tạo sẵn ảnh mẫu đã crop & cân thẳng nếu AI có đề xuất khung crop
      if (croppedUrl) URL.revokeObjectURL(croppedUrl);
      setCroppedUrl(null);
      setCroppedFile(null);

      if (result.suggestedCrop) {
        const sc = result.suggestedCrop;
        const sx = (sc.xPercent / 100) * sceneImg.naturalWidth;
        const sy = (sc.yPercent / 100) * sceneImg.naturalHeight;
        const sw = Math.max(1, (sc.widthPercent / 100) * sceneImg.naturalWidth);
        const sh = Math.max(1, (sc.heightPercent / 100) * sceneImg.naturalHeight);

        const c = document.createElement('canvas');
        c.width = Math.round(sw);
        c.height = Math.round(sh);
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.save();
          if (Math.abs(sc.rotateDeg) >= 0.2) {
            const rad = (sc.rotateDeg * Math.PI) / 180;
            const zoomFix = 1 + Math.abs(Math.sin(rad)) * 0.25;
            ctx.translate(c.width / 2, c.height / 2);
            ctx.rotate(rad);
            ctx.scale(zoomFix, zoomFix);
            ctx.drawImage(sceneImg, sx, sy, sw, sh, -c.width / 2, -c.height / 2, c.width, c.height);
          } else {
            ctx.drawImage(sceneImg, sx, sy, sw, sh, 0, 0, c.width, c.height);
          }
          ctx.restore();

          const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.92));
          if (blob) {
            const cFile = new File([blob], `goc-mau-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setCroppedFile(cFile);
            setCroppedUrl(URL.createObjectURL(blob));
          }
        }
      }

      if (result.poses.length > 0) {
        const first = result.poses[0];
        setSelectedPoseId(first.poseId);
        setPosePos({ x: first.xPercent, y: first.yPercent, scale: first.scale });
        setSkeletonOffset({ dx: 0, dy: 0 });
        setFlipPose(Boolean(first.flipHorizontal));
      }
    } catch (err) {
      onQuotaUpdated(getDemoQuota());
      if (err instanceof DemoLimitReachedError) {
        onOpenSettings(err.message);
        return;
      }
      onError(err instanceof Error ? err.message : 'Lỗi khi phân tích góc chụp');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const remapPoseForCrop = (
    pos: { x: number; y: number; scale: number },
    crop: SuggestedCrop,
    toCropped: boolean,
  ) => {
    if (toCropped) {
      return {
        x: Math.min(88, Math.max(12, ((pos.x - crop.xPercent) / crop.widthPercent) * 100)),
        y: Math.min(85, Math.max(15, ((pos.y - crop.yPercent) / crop.heightPercent) * 100)),
        scale: Math.min(1.25, Math.max(0.55, pos.scale / (crop.heightPercent / 100))),
      };
    }
    return {
      x: Math.min(88, Math.max(12, crop.xPercent + (pos.x / 100) * crop.widthPercent)),
      y: Math.min(85, Math.max(15, crop.yPercent + (pos.y / 100) * crop.heightPercent)),
      scale: Math.min(1.25, Math.max(0.55, pos.scale * (crop.heightPercent / 100))),
    };
  };

  const handleToggleCropPreview = () => {
    if (!guide?.suggestedCrop || !croppedUrl) return;
    const next = !cropPreviewActive;
    setCropPreviewActive(next);
    setPosePos((prev) => remapPoseForCrop(prev, guide.suggestedCrop!, next));
  };

  const handleGenerateRealPose = async () => {
    const targetFile = cropPreviewActive && croppedFile ? croppedFile : sceneFile;
    if (!targetFile) return;
    if (!hasApiKey && !hasAiAccess()) {
      onOpenSettings();
      return;
    }

    setIsGeneratingPoseImg(true);
    try {
      const img = await loadImage(targetFile);
      const dataUrl = await generatePosePreviewImage({
        sceneImage: img,
        sceneVisualPrompt: guide?.sceneVisualPrompt,
        tip: activeTipText,
        modelGender,
      });
      onQuotaUpdated(getDemoQuota());
      setGeneratedPoseUrl(dataUrl);
      setShowGeneratedPose(true);
    } catch (err) {
      onQuotaUpdated(getDemoQuota());
      if (err instanceof DemoLimitReachedError) {
        onOpenSettings(err.message);
        return;
      }
      onError(
        err instanceof Error ? err.message : 'Không thể tạo ảnh người mẫu thật.',
      );
    } finally {
      setIsGeneratingPoseImg(false);
    }
  };

  const handleSelectAiPose = (p: PoseSuggestion) => {
    setSelectedPoseId(p.poseId);
    setFlipPose(Boolean(p.flipHorizontal));
    setSkeletonOffset({ dx: 0, dy: 0 });
    setShowGeneratedPose(false);
    const base = { x: p.xPercent, y: p.yPercent, scale: p.scale };
    if (cropPreviewActive && guide?.suggestedCrop) {
      setPosePos(remapPoseForCrop(base, guide.suggestedCrop, true));
    } else {
      setPosePos(base);
    }
    setShowOverlay(true);
  };

  const handleSelectLibraryPose = (p: PoseTemplate) => {
    setSelectedPoseId(p.id);
    setSkeletonOffset({ dx: 0, dy: 0 });
    setShowOverlay(true);
  };

  const updatePoseDrag = (clientX: number, clientY: number) => {
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    if (activeAiPose?.skeleton && !showAllPoses && dragStartRef.current) {
      const dxPct = ((clientX - dragStartRef.current.x) / rect.width) * 100;
      const dyPct = ((clientY - dragStartRef.current.y) / rect.height) * 100;
      dragStartRef.current = { x: clientX, y: clientY };
      setSkeletonOffset((prev) => ({
        dx: Math.min(45, Math.max(-45, prev.dx + dxPct)),
        dy: Math.min(45, Math.max(-45, prev.dy + dyPct)),
      }));
      return;
    }

    const x = Math.min(88, Math.max(12, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(85, Math.max(15, ((clientY - rect.top) / rect.height) * 100));
    setPosePos((prev) => ({ ...prev, x, y }));
  };

  const activeTemplate = getPoseById(selectedPoseId);
  const activeAiPose = guide?.poses.find((p) => p.poseId === selectedPoseId);
  const activeTipText = activeAiPose?.tip || activeTemplate.defaultTip;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectScene(f);
          e.target.value = '';
        }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectScene(f);
          e.target.value = '';
        }}
      />
      <input
        ref={refInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleSelectRef(f);
          e.target.value = '';
        }}
      />

      {!sceneUrl ? (
        /* Trạng thái chưa chọn ảnh bối cảnh */
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400/20 text-amber-600">
            <Camera size={30} />
          </div>
          <h2 className="text-[17px] font-bold text-zinc-900">
            Trợ lý Canh góc & Tạo dáng
          </h2>
          <p className="mt-1.5 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            Chụp thử 1 tấm hoặc chọn ảnh bối cảnh từ máy ảnh. AI sẽ gợi ý thông số chụp và vẽ khung dáng cho người mẫu làm theo.
          </p>

          <div className="mt-6 flex w-full max-w-xs flex-col gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 text-[14px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] transition-all"
            >
              <Camera size={18} />
              <span>Chụp ảnh bối cảnh ngay</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-[13.5px] font-semibold text-zinc-700 shadow-2xs hover:bg-zinc-50 active:scale-[0.98] transition-all"
            >
              <Upload size={16} />
              <span>Chọn ảnh từ máy / thẻ nhớ</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Khung hiển thị ảnh bối cảnh + Overlay khung dáng SVG nét trắng */}
          <div
            ref={outerStageRef}
            className="relative flex min-h-[190px] w-full flex-1 items-center justify-center overflow-hidden bg-zinc-900 px-3 py-2"
          >
            <div
              ref={stageRef}
              style={imgBoxSize ? { width: imgBoxSize.width, height: imgBoxSize.height } : undefined}
              onPointerDown={(e) => {
                if (!showOverlay) return;
                draggingPoseRef.current = true;
                dragStartRef.current = { x: e.clientX, y: e.clientY };
                e.currentTarget.setPointerCapture(e.pointerId);
                if (!activeAiPose?.skeleton || showAllPoses) {
                  updatePoseDrag(e.clientX, e.clientY);
                }
              }}
              onPointerMove={(e) => {
                if (!draggingPoseRef.current || !showOverlay) return;
                updatePoseDrag(e.clientX, e.clientY);
              }}
              onPointerUp={() => {
                draggingPoseRef.current = false;
                dragStartRef.current = null;
              }}
              onPointerCancel={() => {
                draggingPoseRef.current = false;
                dragStartRef.current = null;
              }}
              className={`relative flex items-center justify-center overflow-hidden rounded-xl select-none ${
                imgBoxSize ? '' : 'max-h-full max-w-full'
              } ${showOverlay ? 'touch-none cursor-move' : ''}`}
            >
              <img
                ref={imgRef}
                src={
                  showGeneratedPose && generatedPoseUrl
                    ? generatedPoseUrl
                    : cropPreviewActive && croppedUrl
                    ? croppedUrl
                    : sceneUrl
                }
                alt="Bối cảnh chụp"
                draggable={false}
                onLoad={() => {
                  const outer = outerStageRef.current;
                  const img = imgRef.current;
                  if (!outer || !img || !img.naturalWidth || !img.naturalHeight) return;
                  const availW = Math.max(100, outer.clientWidth - 24);
                  const availH = Math.max(100, outer.clientHeight - 16);
                  const ratio = img.naturalWidth / img.naturalHeight;
                  let w = availW;
                  let h = w / ratio;
                  if (h > availH) {
                    h = availH;
                    w = h * ratio;
                  }
                  setImgBoxSize({ width: Math.round(w), height: Math.round(h) });
                }}
                className="h-full w-full rounded-xl object-contain"
              />

              {/* Khung lưới 1/3 đề xuất crop góc chụp */}
              {!cropPreviewActive && guide?.suggestedCrop && (
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-amber-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                  style={{
                    left: `${guide.suggestedCrop.xPercent}%`,
                    top: `${guide.suggestedCrop.yPercent}%`,
                    width: `${guide.suggestedCrop.widthPercent}%`,
                    height: `${guide.suggestedCrop.heightPercent}%`,
                  }}
                >
                  <div className="absolute inset-x-0 top-1/3 h-px bg-amber-300/40" />
                  <div className="absolute inset-x-0 top-2/3 h-px bg-amber-300/40" />
                  <div className="absolute inset-y-0 left-1/3 w-px bg-amber-300/40" />
                  <div className="absolute inset-y-0 left-2/3 w-px bg-amber-300/40" />
                  <span className="absolute left-1.5 top-1 rounded bg-amber-400 px-1.5 py-0.5 text-[9.5px] font-bold text-zinc-950">
                    Góc đề xuất
                  </span>
                </div>
              )}

              {/* Lớp khung dáng nét trắng: ẩn khi đang xem ảnh người thật mẫu */}
              {showOverlay && !showGeneratedPose && activeAiPose?.skeleton && !showAllPoses ? (
                (() => {
                  const sk: DynamicSkeleton = activeAiPose.skeleton;
                  const boxW = imgBoxSize?.width || 300;
                  const boxH = imgBoxSize?.height || 400;
                  const sc = cropPreviewActive ? guide?.suggestedCrop : undefined;
                  const centerX = sc
                    ? ((sk.neck.x - sc.xPercent) / sc.widthPercent) * 100
                    : sk.neck.x;

                  const mapPt = (pt: { x: number; y: number }) => {
                    let px = sc ? ((pt.x - sc.xPercent) / sc.widthPercent) * 100 : pt.x;
                    const py = sc ? ((pt.y - sc.yPercent) / sc.heightPercent) * 100 : pt.y;
                    if (flipPose) {
                      px = centerX - (px - centerX);
                    }
                    return {
                      x: ((px + skeletonOffset.dx) / 100) * boxW,
                      y: ((py + skeletonOffset.dy) / 100) * boxH,
                    };
                  };

                  const mapped = {
                    head: mapPt(sk.head),
                    neck: mapPt(sk.neck),
                    lShoulder: mapPt(sk.lShoulder),
                    rShoulder: mapPt(sk.rShoulder),
                    lElbow: mapPt(sk.lElbow),
                    rElbow: mapPt(sk.rElbow),
                    lWrist: mapPt(sk.lWrist),
                    rWrist: mapPt(sk.rWrist),
                    lHip: mapPt(sk.lHip),
                    rHip: mapPt(sk.rHip),
                    lKnee: mapPt(sk.lKnee),
                    rKnee: mapPt(sk.rKnee),
                    lAnkle: mapPt(sk.lAnkle),
                    rAnkle: mapPt(sk.rAnkle),
                  };

                  const sil = buildSoftSilhouette(mapped, modelGender);

                  return (
                    <svg
                      viewBox={`0 0 ${boxW} ${boxH}`}
                      className="pointer-events-none absolute inset-0 h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                      fill="none"
                    >
                      <g
                        stroke="rgba(255,255,255,0.92)"
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <ellipse
                          cx={sil.headCx}
                          cy={sil.headCy}
                          rx={sil.headRx}
                          ry={sil.headRy}
                          transform={`rotate(${sil.headAngleDeg.toFixed(1)} ${sil.headCx.toFixed(1)} ${sil.headCy.toFixed(1)})`}
                          fill="rgba(255,255,255,0.10)"
                        />
                        <path d={sil.neckPath} />
                        <path d={sil.leftLegPath} fill="rgba(255,255,255,0.10)" />
                        <path d={sil.rightLegPath} fill="rgba(255,255,255,0.10)" />
                        <path d={sil.torsoPath} fill="rgba(255,255,255,0.12)" />
                        <path d={sil.leftArmPath} fill="rgba(255,255,255,0.10)" />
                        <path d={sil.rightArmPath} fill="rgba(255,255,255,0.10)" />
                      </g>
                    </svg>
                  );
                })()
              ) : showOverlay && !showGeneratedPose ? (
                <div
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${posePos.x}%`,
                    top: `${posePos.y}%`,
                    height: `${Math.round(posePos.scale * 62)}%`,
                    aspectRatio: '200 / 320',
                  }}
                >
                  <svg
                    viewBox="0 0 200 320"
                    className="h-full w-full drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)] transition-transform duration-150"
                    style={flipPose ? { transform: 'scaleX(-1)' } : undefined}
                    fill="none"
                  >
                    {activeTemplate.head && (
                      <circle
                        cx={activeTemplate.head.cx}
                        cy={activeTemplate.head.cy}
                        r={activeTemplate.head.r}
                        stroke="rgba(255,255,255,0.95)"
                        strokeWidth="3.2"
                      />
                    )}
                    {activeTemplate.paths.map((d, idx) => (
                      <path
                        key={idx}
                        d={d}
                        stroke="rgba(255,255,255,0.95)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                  </svg>
                </div>
              ) : null}

              {/* Dòng hướng dẫn tạo dáng cho model đọc */}
              {showOverlay && (
                <div className="pointer-events-none absolute left-3 right-3 top-2 flex justify-center">
                  <div className="max-w-md rounded-xl bg-zinc-950/75 px-3 py-1.5 text-center text-[12px] font-medium leading-snug text-white shadow-md backdrop-blur-xs">
                    {activeTipText}
                  </div>
                </div>
              )}
            </div>

            {/* Nút điều khiển nhanh góc dưới ảnh */}
            <div className="absolute bottom-3 right-3 z-10 flex flex-wrap items-center justify-end gap-1.5">
              {generatedPoseUrl && (
                <button
                  type="button"
                  onClick={() => setShowGeneratedPose((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs transition-colors ${
                    showGeneratedPose
                      ? 'border-emerald-400 bg-emerald-400 text-zinc-950'
                      : 'border-white/20 bg-zinc-950/70 text-white hover:bg-zinc-900'
                  }`}
                >
                  <UserCheck size={12} />
                  <span>{showGeneratedPose ? 'Xem khung dáng' : 'Ảnh mẫu thật'}</span>
                </button>
              )}
              {croppedUrl && !showGeneratedPose && (
                <button
                  type="button"
                  onClick={handleToggleCropPreview}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs transition-colors ${
                    cropPreviewActive
                      ? 'border-amber-400 bg-amber-400 text-zinc-950'
                      : 'border-white/20 bg-zinc-950/70 text-white hover:bg-zinc-900'
                  }`}
                  title="Xem thử ảnh sau khi crop & cân góc theo gợi ý AI"
                >
                  <Crop size={12} />
                  <span>{cropPreviewActive ? 'Ảnh gốc' : 'Góc crop mẫu'}</span>
                </button>
              )}
              {showOverlay && (
                <button
                  type="button"
                  onClick={() => setFlipPose((f) => !f)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs hover:bg-zinc-900"
                  title="Đảo hướng xoay người trái/phải vào tâm khung hình"
                >
                  <FlipHorizontal2 size={12} />
                  <span>Lật hướng</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowOverlay((s) => !s)}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs hover:bg-zinc-900"
              >
                {showOverlay ? <EyeOff size={12} /> : <Eye size={12} />}
                <span>{showOverlay ? 'Ẩn dáng' : 'Hiện dáng'}</span>
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-zinc-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs hover:bg-zinc-900"
                title="Đổi ảnh bối cảnh khác"
              >
                <RefreshCw size={12} />
                <span>Đổi ảnh</span>
              </button>
            </div>
          </div>

          {/* Khu vực điều khiển bên dưới */}
          <div className="relative z-10 max-h-[54dvh] shrink-0 space-y-3 overflow-y-auto overscroll-contain border-t border-zinc-200 bg-white px-4 py-3 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
            {/* Dải chọn dáng (giống thanh chọn dáng bên dưới của Huawei) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="font-semibold text-zinc-700">
                  {guide && !showAllPoses
                    ? 'Dáng AI gợi ý (kéo khung trên ảnh để chỉnh vị trí)'
                    : 'Thư viện dáng mẫu (Miễn phí)'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAllPoses((s) => !s)}
                  className="font-medium text-amber-700 hover:underline"
                >
                  {showAllPoses ? (guide ? 'Xem dáng AI' : 'Thu gọn') : 'Xem tất cả dáng'}
                </button>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {guide && !showAllPoses
                  ? guide.poses.map((p) => {
                      const tpl = getPoseById(p.poseId);
                      const active = selectedPoseId === p.poseId && showOverlay;
                      return (
                        <button
                          key={p.poseId}
                          type="button"
                          onClick={() => handleSelectAiPose(p)}
                          className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[12px] transition-all ${
                            active
                              ? 'border-amber-500 bg-amber-50 font-semibold text-amber-950'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          <span className="rounded bg-rose-500/15 px-1 text-[9px] font-bold text-rose-700">
                            AI
                          </span>
                          <span>{tpl.name}</span>
                        </button>
                      );
                    })
                  : POSE_TEMPLATES.map((tpl) => {
                      const active = selectedPoseId === tpl.id && showOverlay;
                      return (
                        <button
                          key={tpl.id}
                          type="button"
                          onClick={() => handleSelectLibraryPose(tpl)}
                          className={`shrink-0 rounded-xl border px-3 py-1.5 text-[12px] transition-all ${
                            active
                              ? 'border-amber-500 bg-amber-50 font-semibold text-amber-950'
                              : 'border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100'
                          }`}
                        >
                          {tpl.name}
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Chọn nhanh giới tính/loại mẫu + Nút AI phân tích */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] font-semibold text-zinc-600">Người mẫu:</span>
              <div className="flex flex-1 rounded-xl bg-zinc-100 p-0.5 text-[11.5px] font-medium">
                {(
                  [
                    { id: 'female', label: 'Nữ' },
                    { id: 'male', label: 'Nam' },
                    { id: 'couple', label: 'Cặp đôi' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModelGender(item.id)}
                    className={`flex-1 rounded-lg py-1 transition-all ${
                      modelGender === item.id
                        ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                        : 'text-zinc-500 hover:text-zinc-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nhắc tạo lại tư thế khi đổi đối tượng mẫu (Nam / Nữ / Cặp đôi) */}
            {guide && analyzedGender && analyzedGender !== modelGender && (
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-amber-400 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-950 hover:bg-amber-100 transition-colors"
              >
                <RefreshCw size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>
                  Đã đổi sang{' '}
                  {modelGender === 'male' ? 'Nam' : modelGender === 'couple' ? 'Cặp đôi' : 'Nữ'} —
                  Bấm để tạo lại tư thế phù hợp
                </span>
              </button>
            )}

            {/* Nút AI phân tích góc & thông số + Tùy chọn ảnh mẫu */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>AI đang phân tích...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>
                      AI Phân tích góc & Thông số
                      {!hasApiKey && hasDemoProxy() && demoQuota
                        ? ` (${demoQuota.remaining}/${demoQuota.limit})`
                        : ''}
                    </span>
                  </>
                )}
              </button>

              {refUrl ? (
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-400">
                  <img src={refUrl} alt="Ảnh mẫu góc" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={handleClearRef}
                    className="absolute inset-0 flex items-center justify-center bg-black/45 text-white opacity-0 hover:opacity-100 transition-opacity"
                    title="Xóa ảnh mẫu góc"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => refInputRef.current?.click()}
                  className="flex h-10 shrink-0 items-center gap-1 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-2.5 text-[11.5px] font-medium text-zinc-700 hover:border-amber-500 hover:bg-amber-50/40"
                  title="Thêm ảnh mẫu để AI học góc chụp"
                >
                  <ImagePlus size={14} className="text-amber-600" />
                  <span>Ảnh mẫu</span>
                </button>
              )}
            </div>

            {/* Tạo ảnh người mẫu thật minh họa tư thế (luôn sẵn sàng ngay khi tải ảnh lên) */}
            <button
              type="button"
              onClick={handleGenerateRealPose}
              disabled={isGeneratingPoseImg}
              className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3 text-[12px] font-semibold text-rose-900 hover:bg-rose-100/70 disabled:opacity-50 transition-all"
            >
              {isGeneratingPoseImg ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang tạo ảnh người thật minh họa...</span>
                </>
              ) : (
                <>
                  <UserCheck size={14} className="text-rose-600" />
                  <span>Tạo ảnh người thật minh họa tư thế</span>
                </>
              )}
            </button>

            {/* Hiển thị EXIF hiện tại (nếu đọc được) */}
            {sceneExif && (
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                <span className="font-medium text-zinc-600">EXIF ảnh nháp:</span>
                {sceneExif.cameraModel && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{sceneExif.cameraModel}</span>
                )}
                {sceneExif.fNumber && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">f/{sceneExif.fNumber}</span>
                )}
                {sceneExif.exposureTime && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{sceneExif.exposureTime}</span>
                )}
                {sceneExif.iso && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">ISO {sceneExif.iso}</span>
                )}
                {sceneExif.focalLength && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5">{sceneExif.focalLength}mm</span>
                )}
              </div>
            )}

            {/* Kết quả gợi ý thông số máy ảnh & góc chụp từ AI */}
            {guide && (
              <div className="space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3 text-[12px]">
                <div className="grid grid-cols-5 gap-1.5 text-center">
                  <div className="rounded-lg bg-white p-1.5 border border-zinc-200/70">
                    <div className="text-[10px] text-zinc-400">Khẩu</div>
                    <div className="font-bold text-zinc-900">{guide.cameraSettings.aperture}</div>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-zinc-200/70">
                    <div className="text-[10px] text-zinc-400">Tốc</div>
                    <div className="font-bold text-zinc-900">{guide.cameraSettings.shutterSpeed}</div>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-zinc-200/70">
                    <div className="text-[10px] text-zinc-400">ISO</div>
                    <div className="font-bold text-zinc-900">{guide.cameraSettings.iso}</div>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-zinc-200/70">
                    <div className="text-[10px] text-zinc-400">WB</div>
                    <div className="font-bold text-zinc-900">{guide.cameraSettings.whiteBalance}</div>
                  </div>
                  <div className="rounded-lg bg-white p-1.5 border border-zinc-200/70">
                    <div className="text-[10px] text-zinc-400">EV</div>
                    <div className="font-bold text-zinc-900">{guide.cameraSettings.ev}</div>
                  </div>
                </div>

                <div className="space-y-1 text-zinc-700">
                  <p>
                    <span className="font-semibold text-zinc-900">Ánh sáng:</span>{' '}
                    {guide.lightingSummary}
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-900">Chỉnh góc:</span>{' '}
                    {guide.angleAdvice}
                  </p>
                </div>
              </div>
            )}

            {/* Nút chuyển nhanh sang Tab Chỉnh màu */}
            {sceneFile && (
              <button
                type="button"
                onClick={() =>
                  onSendToColorTab(cropPreviewActive && croppedFile ? croppedFile : sceneFile)
                }
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white text-[13px] font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 active:scale-[0.98] transition-all"
              >
                <Palette size={15} className="text-amber-600" />
                <span>
                  {cropPreviewActive && croppedFile
                    ? 'Đưa ảnh đã crop sang Chỉnh màu'
                    : 'Đưa ảnh này sang Chỉnh màu'}
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
