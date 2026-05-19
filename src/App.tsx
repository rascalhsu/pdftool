import { useState } from 'react';
import { cn } from './lib/utils';
import { MergePDF } from './features/MergePDF';
import { SortRotatePDF } from './features/SortRotatePDF';
import { SplitPDF } from './features/SplitPDF';
import { DeletePages } from './features/DeletePages';
import { WatermarkPDF } from './features/WatermarkPDF';
import { CompressPDF } from './features/CompressPDF';
import { PDFToImage } from './features/PDFToImage';
import { ImageToPDF } from './features/ImageToPDF';

type TabId = 'merge' | 'sort' | 'split' | 'delete' | 'watermark' | 'compress' | 'pdf2img' | 'img2pdf';

const TABS: { id: TabId; label: string; paddingLabel: string }[] = [
  { id: 'merge', label: '📚 合併 PDF', paddingLabel: '合併 PDF' },
  { id: 'sort', label: '🔄 排序旋轉', paddingLabel: '排序與旋轉' },
  { id: 'split', label: '✂️ 魔法分割', paddingLabel: '魔法分割' },
  { id: 'delete', label: '🗑️ 刪除頁面', paddingLabel: '刪除頁面' },
  { id: 'watermark', label: '©️ 水印頁碼', paddingLabel: '浮水印與頁碼' },
  { id: 'compress', label: '🎈 壓縮瘦身', paddingLabel: '壓縮瘦身' },
  { id: 'pdf2img', label: '🖼️ 轉圖片', paddingLabel: 'PDF轉圖' },
  { id: 'img2pdf', label: '📸 圖片轉 PDF', paddingLabel: '圖轉PDF' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('merge');

  return (
    <div className="flex flex-col h-screen w-full bg-[#e0c3fc] font-sans text-slate-700 overflow-hidden" style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)' }}>
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 overflow-hidden h-full">
        <div className="w-full h-full max-w-[1200px] bg-white/40 backdrop-blur-xl rounded-[40px] shadow-2xl border border-white/60 flex flex-col overflow-hidden">
          
          <header className="px-6 md:px-8 py-4 sm:py-5 flex items-center justify-between border-b border-white/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🪄</div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800">魔法 PDF 工具箱</h1>
              </div>
            </div>
            <div className="flex items-center gap-4 hidden sm:flex">
                <div className="px-4 py-1.5 bg-white/50 rounded-full text-xs font-bold border border-white/40">✨ 目前狀態：待命中</div>
            </div>
          </header>

          <nav className="px-4 py-3 border-b border-white/20 shrink-0">
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "px-4 sm:px-6 py-2 rounded-2xl text-sm font-bold flex-shrink-0 transition-all duration-300",
                      isActive
                        ? "bg-gradient-to-r from-pink-400 to-rose-400 text-white shadow-md shadow-rose-200/50 transform scale-[1.02]"
                        : "bg-white/40 hover:bg-white/60 text-slate-600 border border-white/50 hover:scale-[1.02]"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <main className="flex-1 overflow-y-auto custom-scrollbar bg-white/10 flex flex-col relative w-full h-full">
             <section className="flex-1 p-6 md:p-8 flex flex-col items-center">
                {activeTab === 'merge' && <MergePDF />}
                {activeTab === 'sort' && <SortRotatePDF />}
                {activeTab === 'split' && <SplitPDF />}
                {activeTab === 'delete' && <DeletePages />}
                {activeTab === 'watermark' && <WatermarkPDF />}
                {activeTab === 'compress' && <CompressPDF />}
                {activeTab === 'pdf2img' && <PDFToImage />}
                {activeTab === 'img2pdf' && <ImageToPDF />}
             </section>
          </main>
          
          <footer className="px-6 md:px-8 py-4 bg-white/20 border-t border-white/20 flex flex-col sm:flex-row items-center justify-between text-xs shrink-0 gap-2">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-bold text-slate-700">安全防護中：所有處理皆在您的本地瀏覽器完成</span>
              </div>
            </div>
            <div className="flex gap-4">
              <span className="font-bold text-slate-500">Made with 💖</span>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
