import * as pdfjsLib from 'pdfjs-dist';

// Need to set up the worker for PDF.js to function
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString();
}

export { pdfjsLib };
