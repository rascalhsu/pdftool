import React, { useState, useRef } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { generateThumbnails, PageThumbnail } from '../lib/pdfHelpers';
import { PDFDocument, degrees } from 'pdf-lib';
import { RefreshCw, Save } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';
import { cn } from '../lib/utils';

export function SortRotatePDF() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('施放魔法中...');
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleFile = async (files: FileList) => {
    if (files.length === 0) return;
    setLoadingMessage('正在讀取文件與產生縮圖... 🔍');
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

  const handleRotate = (id: string) => {
    setThumbnails(prev => prev.map(t => t.id === id ? { ...t, rotation: (t.rotation + 90) % 360 } : t));
  };

  const handDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
    // Slight opacity to show drag
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyThumbnails = [...thumbnails];
      const dragItemContent = copyThumbnails[dragItem.current];
      copyThumbnails.splice(dragItem.current, 1);
      copyThumbnails.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setThumbnails(copyThumbnails);
    }
  };

  const handleSave = async () => {
    if (!file || thumbnails.length === 0) return;
    setLoadingMessage('正在重新排列與旋轉... 🔄');
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const newPdf = await PDFDocument.create();

      for (const thumb of thumbnails) {
        const [copiedPage] = await newPdf.copyPages(pdf, [thumb.pageIndex]);
        // apply the rotation
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees(currentRotation + thumb.rotation));
        newPdf.addPage(copiedPage);
      }

      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reordered_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ isOpen: true, type: 'success', title: '完成囉！🎉', message: 'PDF 已經重新排好並旋轉完成 🪄' });
    } catch (e) {
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '處理過程中發生錯誤。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {!file ? (
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳想要排序與旋轉的 PDF 🔄" />
      ) : (
        <div className="w-full flex flex-col items-center gap-6">
           <div className="flex w-full justify-between items-center bg-white/40 border border-white/40 p-4 rounded-2xl">
             <span className="font-bold text-lg text-slate-700">拖曳縮圖來排序，點擊左上角旋轉 💫</span>
             <button onClick={handleSave} className="bg-gradient-to-r from-teal-300 to-blue-400 text-white px-6 py-2.5 rounded-2xl font-black shadow-lg shadow-blue-200/50 hover:scale-[1.02] flex items-center gap-2 border-none transition-transform">
               <Save size={18} />
               <span>儲存新 PDF</span>
             </button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full auto-rows-max p-4">
             {thumbnails.map((thumb, index) => (
               <div 
                 key={thumb.id}
                 draggable
                 onDragStart={(e) => handDragStart(e, index)}
                 onDragEnter={(e) => handleDragEnter(e, index)}
                 onDragEnd={handleDragEnd}
                 onDragOver={(e) => e.preventDefault()}
                 className="relative group cursor-grab active:cursor-grabbing bg-white rounded-2xl shadow-md border-2 border-transparent hover:border-rose-300 transition-all flex flex-col items-center justify-center p-2"
               >
                 <div className="absolute top-0 left-0 bg-slate-800/80 text-white text-[10px] font-black px-2 py-1 flex items-center justify-center rounded-br-lg rounded-tl-xl z-20">
                    PAGE {String(index + 1).padStart(2, '0')}
                 </div>
                 <button 
                  onClick={() => handleRotate(thumb.id)}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-white shadow-md rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20 text-slate-600 hover:text-rose-500"
                 >
                   🔄
                 </button>
                 <div className="w-full aspect-[3/4] relative overflow-hidden bg-slate-50 shadow-inner rounded-xl flex items-center justify-center p-1">
                    <img 
                      src={thumb.url} 
                      alt={`Page ${thumb.pageIndex + 1}`} 
                      className="max-w-full max-h-full object-contain transition-transform duration-300 pointer-events-none"
                      style={{ transform: `rotate(${thumb.rotation}deg)` }}
                    />
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message={loadingMessage} />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
