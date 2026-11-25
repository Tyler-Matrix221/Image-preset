import { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, ShieldCheck, Trash2, X, Check } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
} from '@/lib/geminiApi';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (hasKey: boolean) => void;
}

export default function SettingsModal({
  isOpen,
  onClose,
  onSaved,
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setJustSaved(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setStoredApiKey(apiKey);
    setJustSaved(true);
    onSaved?.(Boolean(apiKey.trim()));
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearStoredApiKey();
    setApiKey('');
    onSaved?.(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Key size={17} />
            </div>
            <div>
              <h2
                id="settings-modal-title"
                className="text-[15px] font-bold text-zinc-900"
              >
                Cài đặt Gemini API Key
              </h2>
              <p className="text-[11px] text-zinc-500">
                Kết nối Google Gemini AI để gợi ý màu ảnh
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5 text-[13px]">
          <div>
            <label
              htmlFor="gemini-key-input"
              className="block font-medium text-zinc-700 mb-1.5"
            >
              Google Gemini API Key
            </label>
            <div className="relative flex items-center">
              <input
                id="gemini-key-input"
                type={showPassword ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-zinc-200 bg-zinc-50/60 px-3.5 py-2.5 pr-20 font-mono text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              />
              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600 transition-colors"
                  title={showPassword ? 'Ẩn key' : 'Hiện key'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {apiKey && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                    title="Xóa key"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Dòng ghi chú bảo mật bắt buộc */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5 text-zinc-600">
            <div className="flex items-start gap-2.5">
              <ShieldCheck size={18} className="mt-0.5 flex-shrink-0 text-emerald-600" />
              <div className="space-y-1 text-[12px] leading-relaxed">
                <p className="font-semibold text-zinc-800">
                  Cam kết bảo mật & Quyền riêng tư:
                </p>
                <p className="text-zinc-600">
                  Key được <strong>lưu duy nhất trong localStorage</strong> của trình duyệt trên máy của bạn.
                </p>
                <p className="text-zinc-500">
                  Chỉ dùng để gọi trực tiếp tới Google Gemini API. Tuyệt đối không ghi key vào mã nguồn, không gửi key đi bất kỳ nơi nào khác.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-zinc-100 bg-zinc-50/50 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-[13px] font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-[13px] font-bold text-zinc-950 shadow-xs hover:bg-amber-300 transition-colors"
          >
            {justSaved ? (
              <>
                <Check size={16} />
                <span>Đã lưu!</span>
              </>
            ) : (
              <span>Lưu cài đặt</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
