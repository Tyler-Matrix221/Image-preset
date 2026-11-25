import { useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import type { ExportOptions, ExportPresetSize, ExportFitMode, ExportFormat } from '@/lib/imageEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExport: (options: ExportOptions) => void;
  exporting: boolean;
  originalSize: { width: number; height: number } | null;
}

const SIZE_OPTIONS: {
  id: ExportPresetSize;
  label: string;
  sub: string;
}[] = [
  { id: 'original', label: 'Ảnh gốc', sub: 'Giữ nguyên tỷ lệ' },
  { id: 'tiktok', label: 'TikTok / Reels', sub: '9:16 (1080×1920)' },
  { id: 'fb_portrait', label: 'Facebook / IG Dọc', sub: '4:5 (1080×1350)' },
  { id: 'square', label: 'Vuông (FB / IG)', sub: '1:1 (1080×1080)' },
  { id: 'landscape', label: 'Ngang (FB / YouTube)', sub: '16:9 (1920×1080)' },
];

export default function ExportModal({
  isOpen,
  onClose,
  onConfirmExport,
  exporting,
  originalSize,
}: ExportModalProps) {
  const [size, setSize] = useState<ExportPresetSize>('original');
  const [fitMode, setFitMode] = useState<ExportFitMode>('cover');
  const [format, setFormat] = useState<ExportFormat>('jpeg');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-zinc-950/40 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
    >
      <div className="w-full sm:max-w-md overflow-hidden rounded-t-2xl sm:rounded-2xl border border-zinc-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3.5">
          <div>
            <h2 id="export-modal-title" className="text-[15px] font-bold text-zinc-900">
              Xuất ảnh
            </h2>
            <p className="text-[11px] text-zinc-500">
              Chọn kích thước phù hợp để đăng TikTok, Facebook hoặc giữ gốc
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-full p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 text-[13px]">
          {/* Kích thước */}
          <div>
            <p className="mb-2 text-[12px] font-semibold text-zinc-700">Kích thước</p>
            <div className="grid grid-cols-2 gap-2">
              {SIZE_OPTIONS.map((opt) => {
                const selected = size === opt.id;
                const subText =
                  opt.id === 'original' && originalSize
                    ? `${originalSize.width}×${originalSize.height}`
                    : opt.sub;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSize(opt.id)}
                    className={`flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all ${
                      selected
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 shadow-2xs'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300'
                    } ${opt.id === 'original' ? 'col-span-2' : ''}`}
                  >
                    <span className="text-[12.5px] font-semibold">{opt.label}</span>
                    <span className="text-[11px] text-zinc-500">{subText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kiểu cắt khung khi chọn tỷ lệ mạng xã hội */}
          {size !== 'original' && (
            <div>
              <p className="mb-1.5 text-[12px] font-semibold text-zinc-700">Căn khung ảnh</p>
              <div className="flex rounded-xl bg-zinc-100 p-1 text-[12px] font-medium">
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`flex-1 rounded-lg py-1.5 transition-all ${
                    fitMode === 'cover'
                      ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                      : 'text-zinc-600'
                  }`}
                >
                  Lấp đầy khung (Cắt vừa)
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`flex-1 rounded-lg py-1.5 transition-all ${
                    fitMode === 'contain'
                      ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                      : 'text-zinc-600'
                  }`}
                >
                  Giữ nguyên ảnh (Thêm viền)
                </button>
              </div>
            </div>
          )}

          {/* Định dạng file */}
          <div>
            <p className="mb-1.5 text-[12px] font-semibold text-zinc-700">Định dạng file</p>
            <div className="flex rounded-xl bg-zinc-100 p-1 text-[12px] font-medium">
              <button
                type="button"
                onClick={() => setFormat('jpeg')}
                className={`flex-1 rounded-lg py-1.5 transition-all ${
                  format === 'jpeg'
                    ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                    : 'text-zinc-600'
                }`}
              >
                JPEG (Nhẹ, 92%)
              </button>
              <button
                type="button"
                onClick={() => setFormat('png')}
                className={`flex-1 rounded-lg py-1.5 transition-all ${
                  format === 'png'
                    ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                    : 'text-zinc-600'
                }`}
              >
                PNG (Nét tối đa)
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-zinc-100 bg-zinc-50/70 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={exporting}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={() => onConfirmExport({ size, fitMode, format })}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Đang xuất ảnh...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Tải ảnh về</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
