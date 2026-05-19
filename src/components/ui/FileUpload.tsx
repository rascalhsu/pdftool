import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadProps {
  onFileSelect: (files: FileList) => void;
  multiple?: boolean;
  accept?: string;
  label?: string;
}

export function FileUpload({ onFileSelect, multiple = false, accept = "application/pdf", label = "拖曳或點擊上傳檔案" }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "w-full max-w-2xl border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-4",
        isDragging
          ? "border-rose-400 bg-rose-50/50"
          : "border-white/60 bg-white/10 hover:bg-white/20"
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files) onFileSelect(e.target.files);
          e.target.value = ''; // Reset to allow same file upload again
        }}
        multiple={multiple}
        accept={accept}
        className="hidden"
      />
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm mb-2">
        📂
      </div>
      <p className="text-lg font-black text-slate-700">{label}</p>
      <p className="text-sm font-medium text-slate-500">或是點擊按鈕來選擇檔案 ✨</p>
    </div>
  );
}
