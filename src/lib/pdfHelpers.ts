import { pdfjsLib } from '../lib/pdfWorker';

export interface PageThumbnail {
  id: string; // unique internal id
  pageIndex: number; // original 0-based page index
  url: string; // object URL of the generated image
  rotation: number; // user's requested additional rotation
  originalRotation: number; // the page's intrinsic rotation
  isDeleted: boolean; // used for delete tool
}

export async function generateThumbnails(file: File): Promise<{ thumbnails: PageThumbnail[], pdfDocument: any }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDocument.numPages;
  const thumbnails: PageThumbnail[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const viewport = page.getViewport({ scale: 0.5 }); // Use smaller scale for thumbnails
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    await page.render({
      canvasContext: context,
      viewport: viewport
    } as any).promise;
    
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
    if (blob) {
      thumbnails.push({
        id: Math.random().toString(36).substr(2, 9),
        pageIndex: i - 1,
        url: URL.createObjectURL(blob),
        rotation: 0,
        originalRotation: page.rotate || 0,
        isDeleted: false
      });
    }
  }
  
  return { thumbnails, pdfDocument };
}
