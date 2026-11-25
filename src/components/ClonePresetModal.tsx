import { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, Sparkles, Upload, X } from 'lucide-react';
import {
  clonePresetFromReferenceImage,
  DemoLimitReachedError,
  hasAiAccess,
} from '@/lib/geminiApi';
import type { Preset } from '@/rules/presets';

interface ClonePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresetCreated: (preset: Preset) => void;
  onError: (msg: string) => void;
  hasApiKey: boolean;
  onOpenSettings: () => void;
  onDemoLimitReached?: (msg: string) => void;
}

export default function ClonePresetModal({
  isOpen,
  onClose,
  onPresetCreated,
  onError,
  hasApiKey,
  onOpenSettings,
  onDemoLimitReached,
}: ClonePresetModalProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [presetName, setPresetName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSelectFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      onError('Vui lòng chọn một file ảnh hợp lệ (.jpg, .png, .webp).');
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    if (!presetName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 25);
      setPresetName(cleanName);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleSelectFile(file);
  };

  const handleClearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleClearImage();
    setPresetName('');
    setIsLoading(false);
    onClose();
  };

  const handleGenerate = async () => {
    if (!imageFile || !imagePreview) {
      onError('Vui lòng chọn một bức ảnh mẫu trước.');
      return;
    }

    if (!hasApiKey && !hasAiAccess()) {
      onOpenSettings();
      return;
    }

    setIsLoading(true);
    try {
      // Tải ảnh vào đối tượng Image HTML (gán onload trước khi gán src để tránh race condition)
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = () => res(img);
        img.onerror = () => rej(new Error('Không thể tải ảnh mẫu'));
        img.src = imagePreview;
      });

      const { params, name } = await clonePresetFromReferenceImage({
        referenceImage: img,
        customName: presetName.trim(),
      });

      const newPreset: Preset = {
        id: `clone-${Date.now()}`,
        name: name || 'Preset từ ảnh mẫu',
        params,
      };

      onPresetCreated(newPreset);
      handleClose();
    } catch (err) {
      if (err instanceof DemoLimitReachedError) {
        handleClose();
        onDemoLimitReached?.(err.message);
        return;
      }
      onError(err instanceof Error ? err.message : 'Lỗi khi phân tích màu ảnh mẫu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clone-preset-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Sparkles size={17} />
            </div>
            <div>
              <h2
                id="clone-preset-title"
                className="text-[15px] font-bold text-zinc-900"
              >
                Hút màu từ ảnh mẫu bằng AI
              </h2>
              <p className="text-[11px] text-zinc-500">
                Tạo preset mới từ bất kỳ ảnh mạng nào (TikTok, FB, Pinterest)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5 text-[13px]">
          {/* Vùng chọn ảnh mẫu */}
          <div>
            <label className="block font-medium text-zinc-700 mb-1.5">
              Ảnh tham chiếu (Ảnh có màu bạn thích)
            </label>
            {!imagePreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-6 text-center hover:border-amber-500 hover:bg-amber-50/20 transition-all"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-zinc-500 shadow-xs">
                  <Upload size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-zinc-800">
                    Chạm hoặc kéo thả ảnh mẫu vào đây
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Hỗ trợ JPEG, PNG, WEBP, ảnh chụp màn hình
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-900/5">
                <img
                  src={imagePreview}
                  alt="Ảnh mẫu"
                  className="max-h-52 w-full object-contain bg-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  disabled={isLoading}
                  className="absolute top-2 right-2 rounded-full bg-zinc-900/70 p-1.5 text-white hover:bg-zinc-900 transition-colors backdrop-blur-xs"
                  title="Chọn ảnh khác"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Ô nhập tên preset */}
          <div>
            <label
              htmlFor="clone-preset-name-input"
              className="block font-medium text-zinc-700 mb-1.5"
            >
              Tên Preset mới
            </label>
            <input
              id="clone-preset-name-input"
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder="Ví dụ: Tone TikTok Cafe, Nàng Thơ...(để trống AI tự đặt)"
              disabled={isLoading}
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2.5 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>

          {/* Dòng ghi chú bảo mật */}
          <p className="text-[11px] text-zinc-500 leading-normal">
            Bản thu nhỏ của ảnh mẫu sẽ được gửi tới Google Gemini để phân tích bảng màu và tạo thông số. Ảnh gốc của bạn giữ an toàn 100% trên máy.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !imageFile}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang phân tích màu...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Tạo Preset bằng AI</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
