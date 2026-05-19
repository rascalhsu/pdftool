import { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { generateThumbnails, PageThumbnail } from '../lib/pdfHelpers';
import { PDFDocument } from 'pdf-lib';
import { Trash2, Save, X } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';
import { cn } from '../lib/utils';

export function DeletePages() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});
  
  const handleFile = async (files: FileList) => {
    if (files.length === 0) return;
    setLoading(true);
    try {
      const selectedFile = files[0];
      setFile(selectedFile);
      const { thumbnails: thumbs } = await generateThumbnails(selectedFile);
      setThumbnails(thumbs);
    } catch (e) {
      setAlert({ isOpen: true, type: 'error', title: '哎呀！', message: '讀取 PDF 失敗了 🥺' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDelete = (id: string) => {
    setThumbnails(prev => prev.map(t => t.id === id ? { ...t, isDeleted: !t.isDeleted } : t));
  };

  const handleSave = async () => {
    const pagesToKeep = thumbnails.filter(t => !t.isDeleted);
    if (pagesToKeep.length === 0) {
      setAlert({ isOpen: true, type: 'error', title: '等等！', message: '你把所有頁面都刪光了啦 😅' });
      return;
    }
    
    if (!file) return;
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      for (const thumb of pagesToKeep) {
        const [copiedPage] = await newPdf.copyPages(pdf, [thumb.pageIndex]);
        newPdf.addPage(copiedPage);
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deleted_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ isOpen: true, type: 'success', title: '完成囉！🎉', message: '不需要的頁面已經消除囉 🪄' });
      
      // refresh thumbnails state to remove deleted visually
      setThumbnails(pagesToKeep.map(t => ({...t, isDeleted: false})));
    } catch (e) {
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '處理過程中發生錯誤。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {!file ? (
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳想要刪除頁面的 PDF 🗑️" />
      ) : (
        <div className="w-full flex flex-col items-center gap-6">
           <div className="flex w-full justify-between items-center bg-white/40 border border-white/40 p-4 rounded-2xl">
             <span className="font-bold text-lg text-slate-700">點擊縮圖加上 ❌ 刪除記號</span>
             <button onClick={handleSave} className="bg-gradient-to-r from-pink-400 to-rose-400 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg shadow-rose-200/50 hover:scale-[1.02] flex items-center gap-2 border-none transition-transform">
               <Trash2 size={18} />
               <span>刪除並儲存</span>
             </button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full auto-rows-max p-4">
             {thumbnails.map((thumb, index) => (
               <div 
                 key={thumb.id}
                 onClick={() => toggleDelete(thumb.id)}
                 className={cn(
                   "relative bg-white rounded-2xl shadow-md border-2 border-transparent transition-all cursor-pointer flex flex-col items-center justify-center p-2 hover:border-rose-300",
                   thumb.isDeleted && "opacity-60 grayscale border-rose-300"
                 )}
               >
                 <div className="absolute top-0 left-0 bg-slate-800/80 text-white text-[10px] font-black px-2 py-1 flex items-center justify-center rounded-br-lg rounded-tl-xl z-20">
                    PAGE {String(index + 1).padStart(2, '0')}
                 </div>
                 
                 <div className="w-full aspect-[3/4] relative overflow-hidden bg-slate-50 shadow-inner rounded-xl flex items-center justify-center p-1">
                    <img 
                      src={thumb.url} 
                      alt={`Page ${thumb.pageIndex + 1}`} 
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                    {/* Delete Mask */}
                    {thumb.isDeleted && (
                      <div className="absolute inset-0 bg-rose-400/20 rounded-xl flex items-center justify-center z-10 animate-in fade-in zoom-in duration-200 text-6xl">
                        ❌
                      </div>
                    )}
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message="正在刪除不需要的頁面..." />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
