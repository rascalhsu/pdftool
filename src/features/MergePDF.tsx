import { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { PDFDocument } from 'pdf-lib';
import { ArrowUp, ArrowDown, X, Layers } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';

interface SelectedFile {
  id: string;
  file: File;
  pageRange: string;
}

export function MergePDF() {
  const [files, setFiles] = useState<SelectedFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});

  const handleFiles = (newFiles: FileList) => {
    const arr = Array.from(newFiles).map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      file: f,
      pageRange: '' // Empty means all pages
    }));
    setFiles(prev => [...prev, ...arr]);
  };

  const removeFile = (id: string) => {
    setFiles(files.filter(f => f.id !== id));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newFiles = [...files];
    [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    setFiles(newFiles);
  };

  const moveDown = (index: number) => {
    if (index === files.length - 1) return;
    const newFiles = [...files];
    [newFiles[index + 1], newFiles[index]] = [newFiles[index], newFiles[index + 1]];
    setFiles(newFiles);
  };

  const updatePageRange = (id: string, range: string) => {
    setFiles(files.map(f => f.id === id ? { ...f, pageRange: range } : f));
  };

  const handleMerge = async () => {
    if (files.length === 0) {
      setAlert({ isOpen: true, type: 'error', title: '哎呀！', message: '請先上傳 PDF 檔案唷 🥺' });
      return;
    }

    setLoading(true);
    try {
      const mergedPdf = await PDFDocument.create();

      for (const item of files) {
        const arrayBuffer = await item.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer);
        const totalPages = pdf.getPageCount();
        
        let pagesToCopy: number[] = [];
        
        if (!item.pageRange.trim()) {
          // All pages
          pagesToCopy = Array.from({length: totalPages}, (_, i) => i);
        } else {
          // Parse range, e.g. "1-3, 5"
          const parts = item.pageRange.split(',').map(p => p.trim());
          for (const part of parts) {
            if (part.includes('-')) {
              const [startStr, endStr] = part.split('-');
              let start = parseInt(startStr, 10);
              let end = parseInt(endStr, 10);
              if (!isNaN(start) && !isNaN(end)) {
                start = Math.max(1, start);
                end = Math.min(totalPages, end);
                if (start <= end) {
                  for (let i = start; i <= end; i++) {
                    pagesToCopy.push(i - 1); // zero-indexed
                  }
                }
              }
            } else {
              const pageNum = parseInt(part, 10);
              if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
                pagesToCopy.push(pageNum - 1);
              }
            }
          }
        }

        if (pagesToCopy.length > 0) {
          const copiedPages = await mergedPdf.copyPages(pdf, pagesToCopy);
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        }
      }

      const pdfBytes = await mergedPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `merged_magic_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ isOpen: true, type: 'success', title: '太棒了！🎉', message: '檔案已經成功合併囉！✨' });
    } catch (e) {
      console.error(e);
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '阿喵，處理檔案時發生錯誤了。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <FileUpload onFileSelect={handleFiles} multiple accept="application/pdf" label="拖曳 PDF 到這裡 📚" />
      
      {files.length > 0 && (
        <div className="w-full max-w-2xl space-y-4">
          {files.map((file, idx) => (
            <div key={file.id} className="bg-white/40 backdrop-blur-sm border border-white/60 p-4 rounded-2xl flex items-center gap-4 hover:border-rose-300 transition-all shadow-sm">
              <div className="flex flex-col gap-1">
                <button onClick={() => moveUp(idx)} className="p-1 hover:bg-white/80 rounded text-slate-500 disabled:opacity-30 transition-colors" disabled={idx === 0}>
                  <ArrowUp size={18} />
                </button>
                <button onClick={() => moveDown(idx)} className="p-1 hover:bg-white/80 rounded text-slate-500 disabled:opacity-30 transition-colors" disabled={idx === files.length - 1}>
                  <ArrowDown size={18} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-700 truncate" title={file.file.name}>{file.file.name}</p>
                <input 
                  type="text" 
                  placeholder="保留頁數 (例: 1-3, 5) 留空代表全選" 
                  value={file.pageRange}
                  onChange={(e) => updatePageRange(file.id, e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 bg-white/60 rounded-xl border border-white/60 focus:outline-none focus:ring-2 focus:ring-rose-200 text-sm placeholder:text-slate-400 font-bold"
                />
              </div>
              <button onClick={() => removeFile(file.id)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
          ))}

          <div className="flex justify-center pt-4">
            <button onClick={handleMerge} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-300 to-blue-400 text-white rounded-2xl font-black shadow-xl shadow-blue-200/50 hover:scale-[1.02] transition-transform text-lg flex items-center justify-center gap-2">
              <Layers size={20} />
              <span>施展合併魔法！✨</span>
            </button>
          </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message="正在把檔案融合在一起... 🪄" />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
