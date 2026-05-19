import { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import { Stamp, Save } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';

export function WatermarkPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'success', title: '', message: ''});
  
  const [watermarkText, setWatermarkText] = useState('機密文件');
  const [addWatermark, setAddWatermark] = useState(true);
  const [addPageNumber, setAddPageNumber] = useState(true);

  const handleFile = (files: FileList) => {
    if (files.length > 0) setFile(files[0]);
  };

  const createWatermarkImage = async (text: string, pdfDoc: PDFDocument) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No canvas context');
    
    const fontSize = 120;
    ctx.font = `bold ${fontSize}px "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif`;
    const metrics = ctx.measureText(text);
    const w = Math.ceil(metrics.width) + 20;
    const h = fontSize * 1.5;
    
    canvas.width = w;
    canvas.height = h;
    
    ctx.font = `bold ${fontSize}px "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", sans-serif`;
    ctx.fillStyle = 'rgb(204, 204, 204)'; 
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('toBlob failed');
    const arrayBuffer = await blob.arrayBuffer();
    return await pdfDoc.embedPng(arrayBuffer);
  };

  const handleSave = async () => {
    if (!file) return;
    if (!addWatermark && !addPageNumber) {
       setAlert({ isOpen: true, type: 'error', title: '咦？', message: '你沒有勾選任何選項喔 🥺' });
       return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      let watermarkImg = null;
      if (addWatermark && watermarkText) {
         watermarkImg = await createWatermarkImage(watermarkText, pdfDoc);
      }

      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      const total = pages.length;

      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();

        // 1. Watermark
        if (watermarkImg) {
          const imgDims = watermarkImg.scale(0.5); // scale down since generated at 120px
          const radians = Math.PI / 4; // 45 degrees
          const cx = width / 2;
          const cy = height / 2;
          
          const dx = (imgDims.width / 2) * Math.cos(radians) - (imgDims.height / 2) * Math.sin(radians);
          const dy = (imgDims.width / 2) * Math.sin(radians) + (imgDims.height / 2) * Math.cos(radians);

          page.drawImage(watermarkImg, {
            x: cx - dx,
            y: cy - dy,
            width: imgDims.width,
            height: imgDims.height,
            opacity: 0.4,
            rotate: degrees(45),
          });
        }

        // 2. Page Number
        if (addPageNumber) {
          const text = `- ${i + 1} / ${total} -`;
          const textWidth = helveticaFont.widthOfTextAtSize(text, 14);
          page.drawText(text, {
            x: width / 2 - textWidth / 2,
            y: 20, // bottom margin
            size: 14,
            font: helveticaFont,
            color: rgb(0.3, 0.3, 0.3),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `watermarked_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);

      setAlert({ isOpen: true, type: 'success', title: '蓋章完成！🎉', message: '已經成功加上浮水印/頁碼囉 ✨' });
    } catch (e) {
      console.error(e);
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '處理過程中發生錯誤。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {!file ? (
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳 PDF 蓋章去 ©️" />
      ) : (
        <div className="w-full max-w-xl glass-panel p-8 flex flex-col gap-8">
           <div className="flex items-center justify-between border-b border-white/40 pb-4">
             <span className="font-black text-2xl text-slate-700 truncate mr-4">{file.name}</span>
             <button onClick={() => setFile(null)} className="text-sm px-4 py-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 font-bold transition-colors">重新上傳</button>
           </div>

           <div className="space-y-6">
             <label className="flex items-start gap-4 cursor-pointer group">
               <div className="relative flex items-center justify-center mt-1">
                 <input type="checkbox" checked={addWatermark} onChange={(e) => setAddWatermark(e.target.checked)} className="peer sr-only" />
                 <div className="w-6 h-6 border-2 border-slate-300 rounded-lg peer-checked:bg-teal-400 peer-checked:border-teal-400 transition-all flex items-center justify-center shadow-inner">
                    <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
               </div>
               <div className="flex flex-col gap-2 w-full">
                 <span className="text-lg font-black text-slate-700">中央滿版浮水印 🔏</span>
                 {addWatermark && (
                   <input 
                     type="text" 
                     value={watermarkText}
                     onChange={(e) => setWatermarkText(e.target.value)}
                     placeholder="請輸入浮水印文字..."
                     className="p-4 rounded-[20px] border border-white/60 focus:ring-4 focus:ring-teal-200 focus:outline-none w-full bg-white/60 font-bold text-slate-700 shadow-inner"
                   />
                 )}
               </div>
             </label>

             <label className="flex items-center gap-4 cursor-pointer group">
               <div className="relative flex items-center justify-center">
                 <input type="checkbox" checked={addPageNumber} onChange={(e) => setAddPageNumber(e.target.checked)} className="peer sr-only" />
                 <div className="w-6 h-6 border-2 border-slate-300 rounded-lg peer-checked:bg-teal-400 peer-checked:border-teal-400 transition-all flex items-center justify-center shadow-inner">
                    <svg className="w-4 h-4 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                 </div>
               </div>
               <span className="text-lg font-black text-slate-700">底部頁碼 (例: - 1 / 10 -) 📄</span>
             </label>
           </div>

           <button onClick={handleSave} className="w-full py-4 text-xl bg-gradient-to-r from-teal-300 to-blue-400 text-white font-black rounded-[20px] flex items-center justify-center gap-3 hover:scale-[1.02] border-none shadow-xl shadow-blue-200/50 transition-transform">
             <Stamp size={24} />
             <span>用力蓋下去！</span>
           </button>
        </div>
      )}

      <LoadingModal isOpen={loading} message="正在蓋章與標記頁碼中... 🪄" />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
