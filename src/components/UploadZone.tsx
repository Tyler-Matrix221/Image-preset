import { Camera, ImagePlus } from 'lucide-react';

interface UploadZoneProps {
  onFile: (file: File) => void;
  error: string | null;
  shootDraftFile?: File | null;
  onUseShootDraft?: () => void;
}

export default function UploadZone({
  onFile,
  error,
  shootDraftFile,
  onUseShootDraft,
}: UploadZoneProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      {shootDraftFile && onUseShootDraft ? (
        <div className="w-full max-w-sm space-y-3 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Camera size={24} />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">
              Chọn ảnh để chỉnh màu
            </h2>
            <p className="mt-1 text-[12.5px] text-zinc-500">
              Bạn đang có ảnh từ tab Canh chụp & Tạo dáng. Muốn dùng luôn ảnh đó hay tải ảnh mới?
            </p>
          </div>
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={onUseShootDraft}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 text-[13.5px] font-bold text-zinc-950 shadow-2xs hover:bg-amber-300 active:scale-[0.98] transition-all"
            >
              <Camera size={16} />
              <span>Dùng ảnh từ Canh chụp</span>
            </button>
            <label
              htmlFor="photo-input"
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-[13.5px] font-semibold text-zinc-700 hover:bg-zinc-100 active:scale-[0.98] transition-all"
            >
              <ImagePlus size={16} />
              <span>Tải ảnh mới từ máy</span>
            </label>
          </div>
        </div>
      ) : (
        <label
          htmlFor="photo-input"
          className="flex cursor-pointer flex-col items-center gap-4 rounded-3xl border-2 border-dashed border-zinc-300 bg-white px-8 py-12 transition-all hover:border-amber-400 hover:bg-amber-50/20 active:bg-zinc-50 shadow-sm"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <ImagePlus size={28} />
          </span>
          <span>
            <span className="block text-[15px] font-semibold text-zinc-800">
              Chạm để chọn ảnh
            </span>
            <span className="mt-1 block text-[13px] text-zinc-500">
              JPEG hoặc PNG · tối đa 2048px cho bản xem trước
            </span>
          </span>
        </label>
      )}
      <input
        id="photo-input"
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = '';
        }}
      />
      {error && <p className="mt-4 text-[13px] font-medium text-red-600">{error}</p>}
      <p className="mt-6 max-w-xs text-[12px] leading-relaxed text-zinc-500">
        Ảnh chỉ được xử lý ngay trên thiết bị của bạn, không gửi đi bất kỳ đâu.
      </p>
    </div>
  );
}
