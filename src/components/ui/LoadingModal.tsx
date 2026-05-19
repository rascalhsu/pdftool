import { Loader2 } from 'lucide-react';

export function LoadingModal({ isOpen, message = "施放魔法中..." }: { isOpen: boolean; message?: string }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm transition-all duration-300">
      <div className="glass-panel p-8 flex flex-col items-center gap-6 animate-pulse max-w-xs w-full text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-purple-400 rounded-full blur-xl opacity-50 animate-ping"></div>
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin relative z-10" />
        </div>
        <p className="text-xl font-bold text-purple-800 tracking-wide">{message}</p>
      </div>
    </div>
  );
}
