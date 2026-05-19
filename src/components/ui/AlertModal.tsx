import React from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  actionButton?: React.ReactNode;
}

export function AlertModal({ isOpen, type, title, message, onClose, actionButton }: AlertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-all duration-300 p-4">
      <div className="glass-panel p-1 w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white/80 rounded-[1.3rem] p-6 flex flex-col items-center text-center gap-4 relative">
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
          
          {type === 'success' && <CheckCircle2 className="w-16 h-16 text-green-500 mt-2" />}
          {type === 'error' && <XCircle className="w-16 h-16 text-red-500 mt-2" />}
          {type === 'info' && <span className="text-5xl mt-2">🔮</span>}
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-slate-800">{title}</h3>
            <p className="text-slate-600 font-medium whitespace-pre-line">{message}</p>
          </div>
          
          <div className="mt-4 flex gap-3 w-full justify-center">
            {actionButton}
            <button
              onClick={onClose}
              className="glass-button px-6 py-2.5 rounded-xl font-bold text-purple-700 w-full"
            >
              好唷！
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
