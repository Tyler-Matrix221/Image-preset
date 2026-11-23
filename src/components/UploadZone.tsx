import { ImagePlus } from 'lucide-react';

interface UploadZoneProps {
  onFile: (file: File) => void;
  error: string | null;
}

export default function UploadZone({ onFile, error }: UploadZoneProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
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
