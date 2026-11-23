import { useState, useMemo } from 'react';
import { Flame, Loader2, RotateCw, Sparkles, Wand2 } from 'lucide-react';
import { getWeeklyTrendingStyles, type TrendingStyle } from '@/rules/tiktokTrends';

interface AiSuggestionPanelProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export default function AiSuggestionPanel({
  onGenerate,
  isLoading,
  hasApiKey,
  onOpenSettings,
}: AiSuggestionPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [open, setOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Lấy danh sách trend theo tuần hiện tại (hoặc tuần người dùng chuyển sang)
  const trendData = useMemo(() => getWeeklyTrendingStyles(weekOffset), [weekOffset]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onGenerate(prompt.trim() || 'Tự nhiên, hài hòa, da hồng hào, ánh sáng cân đối');
  };

  const handleSelectStyle = (style: TrendingStyle) => {
    setPrompt(style.prompt);
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }
    onGenerate(style.prompt);
  };

  const handleNextWeekPack = () => {
    setWeekOffset((w) => w + 1);
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
        <div className="border-t border-zinc-200/80 bg-zinc-50/40 p-4 space-y-3.5">
          {/* Form nhập phong cách tùy chỉnh */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Nhập phong cách hoặc chọn nhanh banner TikTok bên dưới..."
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

            {/* Khu vực Banner Gợi ý Hot Trend TikTok cập nhật theo tuần */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Flame size={14} className="text-rose-500 fill-rose-500 animate-pulse" />
                  <span className="text-[12px] font-bold text-zinc-800">
                    Hot Trend TikTok
                  </span>
                  <span className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 border border-rose-200/60">
                    Tuần {trendData.weekNum}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleNextWeekPack}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-200/60 hover:text-zinc-800 transition-colors"
                  title="Xem bộ trend của tuần khác"
                >
                  <RotateCw size={11} />
                  <span>Đổi tuần</span>
                </button>
              </div>

              {/* Lưới các banner hot trend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {trendData.styles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleSelectStyle(style)}
                    className="group relative flex flex-col items-start rounded-xl border border-zinc-200/80 bg-white p-2.5 text-left shadow-2xs hover:border-amber-400 hover:bg-amber-50/40 hover:shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    <div className="flex w-full items-center justify-between gap-1.5 mb-1">
                      <span className="text-[12px] font-bold text-zinc-900 group-hover:text-amber-900 transition-colors">
                        {style.name}
                      </span>
                      {style.badge && (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-800 border border-amber-200/60">
                          {style.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 line-clamp-1 leading-normal">
                      {style.desc}
                    </p>
                    <span className="mt-1 text-[10px] font-medium text-rose-500/90">
                      {style.tag}
                    </span>
                  </button>
                ))}
              </div>
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
