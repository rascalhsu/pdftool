import React, { useState, useRef, useEffect } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { PDFDocument } from 'pdf-lib';
import { Image as ImageIcon, Save, Trash2 } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';

interface ImageItem {
  id: string;
  file: File;
  url: string;
}

export function ImageToPDF() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});
  
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Cleanup ObjectURLs to prevent memory leaks
  useEffect(() => {
    return () => {
      images.forEach(img => URL.revokeObjectURL(img.url));
    };
  }, []);

  const handleFiles = (files: FileList) => {
    if (files.length === 0) return;
    
    const newImages = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file)
    }));
    
    setImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (id: string, url: string) => {
    URL.revokeObjectURL(url);
    setImages(images.filter(img => img.id !== id));
  };

  const handDragStart = (e: React.DragEvent, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
    (e.target as HTMLElement).style.opacity = '0.5';
  };

  const handleDragEnter = (e: React.DragEvent, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyImages = [...images];
      const dragItemContent = copyImages[dragItem.current];
      copyImages.splice(dragItem.current, 1);
      copyImages.splice(dragOverItem.current, 0, dragItemContent);
      dragItem.current = null;
      dragOverItem.current = null;
      setImages(copyImages);
    }
  };

  const handleSave = async () => {
    if (images.length === 0) return;
    setLoading(true);
    try {
      const pdfDoc = await PDFDocument.create();

      for (const item of images) {
        const imageBytes = await item.file.arrayBuffer();
        let pdfImage;
        
        // Attempt to embed based on file type
        const type = item.file.type.toLowerCase();
        if (type === 'image/png') {
          pdfImage = await pdfDoc.embedPng(imageBytes);
        } else if (type === 'image/jpeg' || type === 'image/jpg') {
          pdfImage = await pdfDoc.embedJpg(imageBytes);
        } else {
          // pdf-lib natively only supports PNG and JPG. For webp, it would fail.
          // Since browser can render it, we can convert webp to JPG via canvas as fallback.
          const img = new Image();
          img.src = item.url;
          await new Promise((resolve, reject) => {
             img.onload = resolve;
             img.onerror = reject;
          });
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
          if (!blob) throw new Error("Fallback conversion failed");
          const jpegBytes = await blob.arrayBuffer();
          pdfImage = await pdfDoc.embedJpg(jpegBytes);
        }

        const { width, height } = pdfImage.scale(1);
        const page = pdfDoc.addPage([width, height]);
        page.drawImage(pdfImage, {
          x: 0,
          y: 0,
          width,
          height,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `images_to_pdf_${Date.now()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      setAlert({ isOpen: true, type: 'success', title: '變身成功！🎉', message: '所有圖片已經被神奇地裝進一本 PDF 裡囉 🪄' });
    } catch (e) {
       console.error(e);
       setAlert({ isOpen: true, type: 'error', title: '哎呀！', message: '處理圖片時出了點狀況 🥺' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <FileUpload 
         onFileSelect={handleFiles} 
         multiple 
         accept="image/png, image/jpeg, image/webp" 
         label="拖曳或點擊上傳多張圖片 📸 (支援 JPG, PNG, WebP)" 
      />
      
      {images.length > 0 && (
        <div className="w-full flex flex-col items-center gap-6">
           <div className="flex w-full justify-between items-center bg-white/40 border border-white/60 p-4 rounded-2xl">
             <span className="font-bold text-lg text-slate-700">可以拖曳縮圖改變順序唷 ✨ (已選 {images.length} 張)</span>
             <button onClick={handleSave} className="bg-gradient-to-r from-teal-300 to-blue-400 text-white px-6 py-2.5 rounded-2xl font-black shadow-xl shadow-blue-200/50 hover:scale-[1.02] flex items-center gap-2 border-none transition-transform">
               <Save size={18} />
               <span>結合成一本 PDF！</span>
             </button>
           </div>
           
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 w-full auto-rows-max p-4">
             {images.map((img, index) => (
               <div 
                 key={img.id}
                 draggable
                 onDragStart={(e) => handDragStart(e, index)}
                 onDragEnter={(e) => handleDragEnter(e, index)}
                 onDragEnd={handleDragEnd}
                 onDragOver={(e) => e.preventDefault()}
                 className="relative group cursor-grab active:cursor-grabbing bg-white rounded-2xl shadow-md border-2 border-transparent hover:border-teal-300 transition-all flex flex-col items-center justify-center p-2"
               >
                 <div className="absolute top-0 left-0 bg-slate-800/80 text-white text-[10px] font-black px-2 py-1 flex items-center justify-center rounded-br-lg rounded-tl-xl z-20">
                    NO. {String(index + 1).padStart(2, '0')}
                 </div>
                 <button 
                  onClick={() => removeImage(img.id, img.url)}
                  className="absolute -top-2 -right-2 w-8 h-8 bg-white shadow-md hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20"
                 >
                   <Trash2 size={16} />
                 </button>
                 <div className="w-full aspect-square relative overflow-hidden bg-slate-50 shadow-inner rounded-xl flex items-center justify-center p-1">
                    <img 
                      src={img.url} 
                      alt={`Upload ${index + 1}`} 
                      className="max-w-full max-h-full object-contain pointer-events-none"
                    />
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message="正在運用魔法把圖片拼成書... 📚" />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
