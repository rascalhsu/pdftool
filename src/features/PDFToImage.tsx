import { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { pdfjsLib } from '../lib/pdfWorker';
import JSZip from 'jszip';
import { FileImage } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';

export function PDFToImage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error'; title: string; message: string}>({isOpen: false, type: 'info', title: '', message: ''});
  
  const handleFile = (files: FileList) => {
    if (files.length > 0) setFile(files[0]);
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdfDocument.numPages;
      const zip = new JSZip();

      for (let i = 1; i <= numPages; i++) {
        setProgress(`努力產圖中... 第 ${i} / ${numPages} 張 🖼️`);
        const page = await pdfDocument.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // High resolution
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        } as any).promise;
        
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        
        if (blob) {
          zip.file(`page_${i.toString().padStart(3, '0')}.jpg`, blob);
        }
      }

      setProgress('正在把圖片裝進壓縮包... 🎁');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `images_${file.name.replace('.pdf', '')}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setAlert({ 
        isOpen: true, 
        type: 'success', 
        title: '轉換成功！🎉', 
        message: `已經把所有的頁面變成高畫質圖片打包囉！✨` 
      });
    } catch (e) {
      console.error(e);
      setAlert({ isOpen: true, type: 'error', title: '出錯了 🥺', message: '轉換時發生錯誤。' });
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {!file ? (
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳要轉成圖片的 PDF 🖼️" />
      ) : (
        <div className="w-full max-w-xl glass-panel p-8 flex flex-col gap-6 items-center text-center">
           <div className="flex flex-col items-center justify-center border-b border-white/40 pb-6 w-full">
             <div className="bg-white/60 p-6 rounded-[30px] mb-4 shadow-sm border border-white/60">
                <FileImage size={48} className="text-teal-500" />
             </div>
             <span className="font-black text-3xl text-slate-700 truncate max-w-[250px] sm:max-w-md">{file.name}</span>
           </div>

           <p className="text-slate-600 font-bold mb-2">準備好把這個 PDF 變成一張張漂亮的圖片了嗎？</p>

           <div className="flex gap-4 w-full">
             <button onClick={() => setFile(null)} className="flex-1 py-4 text-slate-600 font-black rounded-[20px] bg-white/60 hover:bg-white transition-colors border border-white/60">
               換個檔案
             </button>
             <button onClick={handleConvert} className="flex-[2] py-4 bg-gradient-to-r from-teal-300 to-blue-400 text-white font-black rounded-[20px] shadow-xl shadow-blue-200/50 hover:scale-[1.02] flex items-center justify-center gap-2 border-none transition-transform text-lg">
               <span>一鍵轉成圖片打包！</span>
             </button>
           </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message={progress || "正在變出圖片... 🪄"} />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
