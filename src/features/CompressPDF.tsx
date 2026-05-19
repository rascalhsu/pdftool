import { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { pdfjsLib } from '../lib/pdfWorker';
import { PDFDocument } from 'pdf-lib';
import { FileDown, CheckCircle2 } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';
import { cn } from '../lib/utils';

type Quality = 0.9 | 0.75 | 0.5;

export function CompressPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>(0.75);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});
  
  const handleFile = (files: FileList) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleCompress = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDocument.numPages;

      const newPdf = await PDFDocument.create();

      for (let i = 1; i <= numPages; i++) {
        setProgress(`正在努力壓扁... ${i} / ${numPages} 頁 🎈`);
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 }); // Good enough for reading after compress
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        } as any).promise;
        
        // Convert to JPG
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
        
        if (blob) {
          const imageBytes = await blob.arrayBuffer();
          const jpgImage = await newPdf.embedJpg(imageBytes);
          
          const newPage = newPdf.addPage([viewport.width, viewport.height]);
          newPage.drawImage(jpgImage, {
            x: 0,
            y: 0,
            width: viewport.width,
            height: viewport.height,
          });
        }
      }

      setProgress('正在打包瘦身成果... 🎁');
      const pdfBytes = await newPdf.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      
      const newSize = (blob.size / 1024 / 1024).toFixed(2);
      const oldSize = (file.size / 1024 / 1024).toFixed(2);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `compressed_${file.name}`;
      link.click();
      URL.revokeObjectURL(url);

      setAlert({ 
        isOpen: true, 
        type: 'success', 
        title: '瘦身成功！🎉', 
        message: `檔案從 ${oldSize} MB 減肥到了 ${newSize} MB！\n是不是很神奇呀 ✨` 
      });
    } catch (e) {
      console.error(e);
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '壓縮時發生錯誤。' });
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {!file ? (
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳要減肥的 PDF 🎈" />
      ) : (
        <div className="w-full max-w-xl glass-panel p-8 flex flex-col gap-8">
           <div className="flex items-center justify-between border-b border-white/40 pb-4">
             <div className="flex flex-col">
               <span className="font-black text-2xl text-slate-700 truncate max-w-[250px] sm:max-w-xs">{file.name}</span>
               <span className="text-sm font-bold text-slate-500">原大小: {(file.size / 1024 / 1024).toFixed(2)} MB</span>
             </div>
             <button onClick={() => setFile(null)} className="text-sm px-4 py-1.5 bg-rose-100 text-rose-500 rounded-full hover:bg-rose-200 font-bold transition-colors">重選</button>
           </div>

           <div className="space-y-4">
             <p className="text-lg font-black text-slate-700 text-center">選擇壓縮強度 💪</p>
             <div className="grid grid-cols-3 gap-3">
               {[
                 { q: 0.9, label: '輕度', emoji: '😌', desc: '畫質好' },
                 { q: 0.75, label: '中度', emoji: '😅', desc: '最推薦' },
                 { q: 0.5, label: '極致', emoji: '🥵', desc: '超小檔' },
               ].map((opt) => (
                 <button
                   key={opt.q}
                   onClick={() => setQuality(opt.q as Quality)}
                   className={cn(
                     "relative flex flex-col items-center gap-2 p-4 rounded-2xl transition-all border-2 border-transparent",
                     quality === opt.q 
                       ? "bg-teal-50 border-teal-400 ring-4 ring-teal-100 shadow-md transform scale-105" 
                       : "bg-white/60 hover:bg-white hover:border-teal-200"
                   )}
                 >
                   <span className="text-3xl">{opt.emoji}</span>
                   <span className="font-black text-slate-700">{opt.label}</span>
                   <span className="text-xs text-slate-500 font-bold">{opt.desc}</span>
                   {quality === opt.q && <CheckCircle2 size={16} className="text-teal-500 absolute top-2 right-2" />}
                 </button>
               ))}
             </div>
           </div>

           <button onClick={handleCompress} className="w-full py-4 text-xl bg-gradient-to-r from-teal-300 to-blue-400 text-white font-black rounded-[20px] flex items-center justify-center gap-3 hover:scale-[1.02] border-none shadow-xl shadow-blue-200/50 transition-transform">
             <FileDown size={24} />
             <span>開始極限瘦身！</span>
           </button>
        </div>
      )}

      <LoadingModal isOpen={loading} message={progress || "準備開始努力壓縮... 🏃‍♂️"} />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
