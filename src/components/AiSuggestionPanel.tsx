import { useState, useMemo, useRef } from 'react';
import {
  Flame,
  Image as ImageIcon,
  Layers,
  Loader2,
  RotateCw,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { getWeeklyTrendingStyles, type TrendingStyle } from '@/rules/tiktokTrends';

interface AiSuggestionPanelProps {
  onGenerate: (prompt: string) => void;
  onMatchColor?: (refImage: HTMLImageElement) => void;
  isLoading: boolean;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

export default function AiSuggestionPanel({
  onGenerate,
  onMatchColor,
  isLoading,
  hasApiKey,
  onOpenSettings,
}: AiSuggestionPanelProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'match'>('trends');
  const [prompt, setPrompt] = useState('');
  const [open, setOpen] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // State cho Color Match
  const [matchFile, setMatchFile] = useState<File | null>(null);
  const [matchPreview, setMatchPreview] = useState<string | null>(null);
  const matchInputRef = useRef<HTMLInputElement>(null);

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

  const handleSelectMatchFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setMatchFile(file);
    const url = URL.createObjectURL(file);
    setMatchPreview(url);
  };

  const handleClearMatchImage = () => {
    setMatchFile(null);
    if (matchPreview) URL.revokeObjectURL(matchPreview);
    setMatchPreview(null);
    if (matchInputRef.current) matchInputRef.current.value = '';
  };

  const handleTriggerMatch = async () => {
    if (!matchPreview) return;
    if (!hasApiKey) {
      onOpenSettings();
      return;
    }

    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Không thể tải ảnh mẫu'));
      img.src = matchPreview;
    });

    onMatchColor?.(img);
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
          {/* Thanh chuyển đổi Tab: TikTok Hot Trend vs Khớp màu từ ảnh */}
          <div className="flex rounded-xl bg-zinc-200/70 p-1 text-[12px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('trends')}
              className={`flex-1 rounded-lg py-1.5 transition-all text-center ${
                activeTab === 'trends'
                  ? 'bg-white font-semibold text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              🔥 Hot Trend TikTok
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('match')}
              className={`flex-1 rounded-lg py-1.5 transition-all text-center ${
                activeTab === 'match'
                  ? 'bg-white font-semibold text-rose-900 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              🎨 Khớp màu từ ảnh mẫu (Color Match)
            </button>
          </div>

          {activeTab === 'trends' ? (
            /* TAB 1: TikTok Hot Trend & Custom Prompt */
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
          ) : (
            /* TAB 2: Khớp màu 2 ảnh (Color Match) */
            <div className="space-y-3">
              <div>
                <p className="text-[12px] font-medium text-zinc-700 mb-1.5">
                  Tải ảnh mẫu bạn muốn bắt chước màu sắc:
                </p>
                {!matchPreview ? (
                  <div
                    onClick={() => matchInputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white p-4 text-center hover:border-amber-500 hover:bg-amber-50/20 transition-all"
                  >
                    <Upload size={18} className="text-amber-600" />
                    <p className="text-[12px] font-medium text-zinc-800">
                      Chọn ảnh mẫu (tải từ TikTok, FB, Pinterest...)
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      Hỗ trợ JPEG, PNG, WEBP
                    </p>
                  </div>
                ) : (
                  <div className="relative flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-2.5">
                    <img
                      src={matchPreview}
                      alt="Ảnh mẫu"
                      className="h-16 w-16 rounded-lg object-cover bg-zinc-100 border border-zinc-200"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold text-zinc-900 truncate">
                        {matchFile?.name}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">
                        AI sẽ so sánh với ảnh đang chỉnh và cân chỉnh màu cho khớp nhất.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearMatchImage}
                      disabled={isLoading}
                      className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      title="Chọn ảnh khác"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <input
                  ref={matchInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleSelectMatchFile(f);
                  }}
                />
              </div>

              <button
                type="button"
                onClick={handleTriggerMatch}
                disabled={isLoading || !matchPreview}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 active:scale-[0.98] disabled:opacity-50 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Đang so sánh và khớp màu...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>So sánh & Khớp màu ngay</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-zinc-500 leading-normal">
                Bản thu nhỏ của cả 2 ảnh sẽ được gửi tới Google Gemini để phân tích chênh lệch màu sắc. Ảnh gốc của bạn giữ nguyên 100% trên máy.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
