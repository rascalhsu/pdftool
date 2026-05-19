import React, { useState } from 'react';
import { FileUpload } from '../components/ui/FileUpload';
import { generateThumbnails, PageThumbnail } from '../lib/pdfHelpers';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { Scissors, Undo2, ArrowRight } from 'lucide-react';
import { LoadingModal } from '../components/ui/LoadingModal';
import { AlertModal } from '../components/ui/AlertModal';
import { cn } from '../lib/utils';

type SplitMode = 'visual' | 'equal' | 'every';

interface Segment {
  start: number; // index inside thumbnails array
  end: number;
}

export function SplitPDF() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [mode, setMode] = useState<SplitMode>('visual');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{isOpen: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; actionButton?: React.ReactNode}>({isOpen: false, type: 'info', title: '', message: ''});
  
  // Visual Mode State
  const [segments, setSegments] = useState<Segment[]>([]);
  const [visualStart, setVisualStart] = useState<number | null>(null);
  
  // Equal Mode State
  const [parts, setParts] = useState(2);

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

  const isIndexInSegment = (index: number) => {
    return segments.some(seg => index >= seg.start && index <= seg.end);
  };

  const handleVisualClick = (index: number) => {
    if (isIndexInSegment(index)) {
      setAlert({ isOpen: true, type: 'error', title: 'Oops!', message: '這頁已經被切割過囉！請選其他頁。' });
      return;
    }

    if (visualStart === null) {
      setVisualStart(index);
    } else {
      // User picked end
      let start = visualStart;
      let end = index;
      if (start > end) {
        [start, end] = [end, start];
      }
      
      // Check for overlap
      let overlap = false;
      for (let i = start; i <= end; i++) {
        if (isIndexInSegment(i)) overlap = true;
      }

      if (overlap) {
        setAlert({ isOpen: true, type: 'error', title: '等等！', message: '你選的範圍跟已經切好的重疊了啦 🥺' });
        setVisualStart(null);
        return;
      }

      const newSegment = { start, end };
      const newSegments = [...segments, newSegment];
      setSegments(newSegments);
      setVisualStart(null);

      // Ask user to continue or finish
      setAlert({
        isOpen: true,
        type: 'success',
        title: '太讚了！🎉',
        message: `已經切好一段了（共 ${end - start + 1} 頁）！\n要繼續切下一段還是打包下載呢？`,
        actionButton: (
          <button
            onClick={() => {
              setAlert(prev => ({...prev, isOpen: false}));
               // Just to close
               if (newSegments.length > 0) {
                 // Check if all pages are covered
                  let covered = 0;
                  newSegments.forEach(s => covered += (s.end - s.start + 1));
                  if (covered >= thumbnails.length) {
                    handleDownload(newSegments);
                  }
               }
            }}
            className="glass-button px-6 py-2.5 rounded-xl font-bold text-slate-700 bg-white"
          >
            繼續切！
          </button>
        )
      });
    }
  };

  const handleDownload = async (manualSegments?: Segment[]) => {
    if (!file) return;
    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await PDFDocument.load(arrayBuffer);
      const zip = new JSZip();
      
      let ranges: Segment[] = [];
      const total = thumbnails.length;

      if (mode === 'every') {
        for (let i = 0; i < total; i++) {
          ranges.push({ start: i, end: i });
        }
      } else if (mode === 'equal') {
        const p = Math.max(1, parts);
        const perPart = Math.ceil(total / p);
        for (let i = 0; i < p; i++) {
          const start = i * perPart;
          const end = Math.min(start + perPart - 1, total - 1);
          if (start < total) ranges.push({ start, end });
        }
      } else if (mode === 'visual') {
        ranges = manualSegments || segments;
        if (ranges.length === 0) {
          setAlert({ isOpen: true, type: 'error', title: '阿喵', message: '你還沒有選要切割的範圍喔！' });
          setLoading(false);
          return;
        }
      }

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const newPdf = await PDFDocument.create();
        const pagesToCopy = [];
        for (let j = range.start; j <= range.end; j++) {
           pagesToCopy.push(thumbnails[j].pageIndex);
        }
        
        const copiedPages = await newPdf.copyPages(pdf, pagesToCopy);
        copiedPages.forEach(p => newPdf.addPage(p));
        const pdfBytes = await newPdf.save();
        zip.file(`split_part_${i + 1}.pdf`, pdfBytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `magic_split_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);

      setAlert({ isOpen: true, type: 'success', title: '完成打包！🎉', message: '都幫你切好放進壓縮檔囉！✨' });
      // Reset visual state after successful download to allow restarting easily
      if (mode === 'visual') {
         setSegments([]);
         setVisualStart(null);
      }
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
         <FileUpload onFileSelect={handleFile} accept="application/pdf" label="上傳想要切割的 PDF ✂️" />
      ) : (
        <div className="w-full flex flex-col items-center gap-6">
          
          <div className="flex bg-white/40 p-1 rounded-2xl w-full max-w-2xl justify-center gap-2 border border-white/60">
             <button onClick={() => setMode('visual')} className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all", mode === 'visual' ? "bg-gradient-to-r from-teal-300 to-blue-400 text-white shadow-md transform scale-[1.02]" : "text-slate-600 hover:bg-white/50")}>
               視覺化點選
             </button>
             <button onClick={() => setMode('equal')} className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all", mode === 'equal' ? "bg-gradient-to-r from-teal-300 to-blue-400 text-white shadow-md transform scale-[1.02]" : "text-slate-600 hover:bg-white/50")}>
               平均等分
             </button>
             <button onClick={() => setMode('every')} className={cn("flex-1 py-2.5 rounded-xl font-bold transition-all", mode === 'every' ? "bg-gradient-to-r from-teal-300 to-blue-400 text-white shadow-md transform scale-[1.02]" : "text-slate-600 hover:bg-white/50")}>
               按原本頁數
             </button>
          </div>

          <div className="w-full glass-panel p-6 sm:p-10 flex flex-col items-center gap-6">
             {mode === 'visual' && (
                <div className="w-full flex flex-col items-center gap-6">
                  <div className="flex justify-between w-full items-center">
                    <p className="font-black text-slate-700 text-lg">
                      {visualStart === null ? "點擊第一頁來設定「起點」📍" : `起點：PAGE ${String(visualStart + 1).padStart(2, '0')}。請點擊另一頁設定「終點」📍`}
                    </p>
                    <div className="flex gap-3">
                      <button onClick={() => { setSegments([]); setVisualStart(null); }} className="bg-white/80 hover:bg-white p-3 rounded-full text-slate-500 shadow-sm transition-all" title="復原全部">
                        <Undo2 size={20} />
                      </button>
                      <button onClick={() => handleDownload(segments)} className="bg-gradient-to-r from-teal-300 to-blue-400 text-white font-black px-8 py-2.5 rounded-2xl flex items-center gap-2 opacity-100 disabled:opacity-50 shadow-xl shadow-blue-200/50 hover:scale-[1.02] transition-transform">
                        打包 ZIP
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 w-full">
                     {thumbnails.map((thumb, index) => {
                       const inSegment = isIndexInSegment(index);
                       const isStart = visualStart === index;
                       
                       let containerClass = "border-transparent border-2";
                       if (isStart) containerClass = "border-blue-400 ring-4 ring-blue-200 bg-blue-50";
                       else if (inSegment) containerClass = "border-transparent opacity-50 grayscale";

                       return (
                         <div 
                           key={thumb.id}
                           onClick={() => handleVisualClick(index)}
                           className={cn(
                             "relative bg-white rounded-2xl shadow-md transition-all cursor-pointer flex flex-col items-center justify-center p-2 hover:border-blue-300",
                             containerClass
                           )}
                         >
                            <div className="absolute top-0 left-0 bg-slate-800/80 text-white text-[10px] font-black px-2 py-1 flex items-center justify-center rounded-br-lg rounded-tl-xl z-20">
                              PAGE {String(index + 1).padStart(2, '0')}
                            </div>
                            {inSegment && <div className="absolute top-0 right-0 bg-teal-400 text-white text-[10px] px-2 py-1 flex items-center justify-center rounded-bl-lg rounded-tr-xl z-20 font-black">已選</div>}
                            <div className="w-full aspect-[3/4] relative overflow-hidden bg-slate-50 shadow-inner rounded-xl flex items-center justify-center p-1">
                              <img src={thumb.url} alt={`p${index+1}`} className="max-w-full max-h-full object-contain pointer-events-none" />
                            </div>
                         </div>
                       );
                     })}
                  </div>
                </div>
             )}

             {mode === 'equal' && (
               <div className="flex flex-col items-center gap-6 py-12">
                 <p className="text-2xl font-black text-slate-700">想把 PDF 變成幾等份？🤔</p>
                 <input 
                   type="number" 
                   min="2" 
                   value={parts} 
                   onChange={(e) => setParts(parseInt(e.target.value) || 2)}
                   className="text-center text-4xl font-black p-6 w-48 rounded-[30px] border border-white/60 bg-white/60 focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-200 text-slate-700 shadow-inner"
                 />
                 <button onClick={() => handleDownload()} className="mt-6 bg-gradient-to-r from-teal-300 to-blue-400 text-white px-10 py-4 rounded-[20px] font-black shadow-xl shadow-blue-200/50 hover:scale-[1.02] flex items-center gap-3 transition-transform text-xl">
                   開始分割並下載 ZIP <ArrowRight size={24} />
                 </button>
               </div>
             )}

             {mode === 'every' && (
               <div className="flex flex-col items-center gap-6 py-12 text-center max-w-md">
                 <div className="w-20 h-20 bg-white/60 rounded-3xl flex items-center justify-center text-4xl shadow-sm">
                   📄
                 </div>
                 <p className="text-2xl font-black text-slate-700 leading-snug">將這 {thumbnails.length} 頁獨立成<br/> {thumbnails.length} 個 PDF 檔！🎉</p>
                 <button onClick={() => handleDownload()} className="mt-4 bg-gradient-to-r from-pink-400 to-rose-400 text-white px-10 py-4 rounded-[20px] font-black shadow-xl shadow-rose-200/50 hover:scale-[1.02] flex items-center gap-3 transition-transform text-xl">
                   一鍵狂刀切割 <Scissors size={24} />
                 </button>
               </div>
             )}
          </div>
        </div>
      )}

      <LoadingModal isOpen={loading} message="正在切切切... ✂️" />
      <AlertModal {...alert} onClose={() => setAlert(prev => ({...prev, isOpen: false}))} />
    </div>
  );
}
