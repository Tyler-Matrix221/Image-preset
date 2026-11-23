import { useState } from 'react';
import { Loader2, Sparkles, Wand2 } from 'lucide-react';

interface AiSuggestionPanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

const QUICK_STYLES = [
  { label: 'Tông lạnh', prompt: 'Tông lạnh thanh thoát, phủ teal nhẹ vùng tối, da mặt vẫn giữ nét hồng hào' },
  { label: 'Tông ấm', prompt: 'Tông ấm hoàng hôn, vàng dịu nhẹ, da tự nhiên, rực rỡ và nịnh mắt' },
  { label: 'Film nhạt', prompt: 'Muted Film vintage, tương phản nhẹ nhàng, điểm đen nâng mờ phong cách ảnh phim analog' },
  { label: 'Trong sáng', prompt: 'Trong trẻo, tươi sáng, da trắng hồng rạng rỡ, ánh sáng cân đối' },
];

export default function AiSuggestionPanel({
  onGenerate,
  isLoading,
  hasApiKey,
  onOpenSettings,
}: AiSuggestionPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [open, setOpen] = useState(false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onGenerate(prompt.trim() || 'Tự nhiên, hài hòa, da hồng hào, ánh sáng cân đối');
  };

  const handleSelectQuick = (quickPrompt: string) => {
    setPrompt(quickPrompt);
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onGenerate(quickPrompt);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 cursor-pointer hover:bg-zinc-50/60 active:bg-zinc-100/50 transition-colors"
      >
        <span className="flex items-center gap-2.5 text-[14px] font-semibold text-zinc-900">
          <Sparkles size={17} className="text-amber-500" />
          <span>AI gợi ý chỉnh màu</span>
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-500/20">
            Gemini Flash
          </span>
        </span>
        <span className="text-[12px] font-medium text-zinc-500 hover:text-amber-700">
          {open ? 'Thu gọn' : 'Mở gợi ý'}
        </span>
      </div>

      {open && (
        <div className="border-t border-zinc-200/80 bg-zinc-50/40 p-4 space-y-3">
          {/* Form nhập phong cách */}
          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ví dụ: tông lạnh, da vẫn hồng hào..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang nghĩ...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={16} />
                    <span>Gợi ý</span>
                  </>
                )}
              </button>
            </div>

            {/* Các nút chọn nhanh */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[11px] font-medium text-zinc-400 mr-1">
                Chọn nhanh:
              </span>
              {QUICK_STYLES.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSelectQuick(q.prompt)}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 shadow-2xs hover:border-amber-400 hover:bg-amber-50/50 hover:text-amber-900 transition-colors active:scale-95 disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Dòng thông báo quyền riêng tư bắt buộc */}
            <p className="pt-1 text-[11px] text-zinc-500 leading-normal">
              Ảnh (bản thu nhỏ) sẽ được gửi tới Google Gemini để phân tích khi bạn dùng tính năng này.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
