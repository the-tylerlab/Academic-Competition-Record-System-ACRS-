import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Setup pdfjs worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ExtractProgressCallback {
  (message: string, progress: number): void;
}

/**
 * Extract all text from PDF with smart Y/X coordinate line grouping (table reconstruction)
 * and automatic fallback to OCR if the PDF contains scanned images.
 */
export async function extractTextFromPdf(
  data: ArrayBuffer | Uint8Array,
  onProgress?: ExtractProgressCallback
): Promise<string> {
  try {
    if (onProgress) onProgress('กำลังโหลดเอกสาร PDF...', 10);

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
      useSystemFonts: true,
    });

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    let fullText = '';
    let totalTextItemsCount = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        const pageProgress = 10 + Math.round((pageNum / numPages) * 70);
        onProgress(`กำลังสกัดข้อความ หน้า ${pageNum}/${numPages}...`, pageProgress);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      totalTextItemsCount += items.length;

      if (items.length > 0) {
        // Group text items by vertical Y-coordinate to reconstruct table rows accurately
        const lineMap = new Map<number, any[]>();
        const Y_TOLERANCE = 4; // Items within 4px vertical distance belong to same row

        for (const item of items) {
          if (!('str' in item) || !item.str.trim()) continue;
          
          const y = Math.round(item.transform[5]);
          let matchedYKey: number | null = null;

          for (const existingY of lineMap.keys()) {
            if (Math.abs(existingY - y) <= Y_TOLERANCE) {
              matchedYKey = existingY;
              break;
            }
          }

          if (matchedYKey !== null) {
            lineMap.get(matchedYKey)!.push(item);
          } else {
            lineMap.set(y, [item]);
          }
        }

        // Sort lines from top to bottom (Y descending in PDF coordinates)
        const sortedYKeys = Array.from(lineMap.keys()).sort((a, b) => b - a);

        let pageText = '';
        for (const yKey of sortedYKeys) {
          const rowItems = lineMap.get(yKey)!;
          // Sort items in the same row from left to right (X ascending)
          rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

          const rowStr = rowItems.map(i => i.str.trim()).filter(Boolean).join('  ');
          if (rowStr) {
            pageText += rowStr + '\n';
          }
        }

        if (pageText.trim()) {
          fullText += `--- [ หน้า ${pageNum} ] ---\n` + pageText.trim() + '\n\n';
        }
      }
    }

    // Check if extracted text is empty or too short (scanned PDF image)
    if (totalTextItemsCount < 5 || fullText.trim().length < 20) {
      if (onProgress) onProgress('ตรวจพบไฟล์เป็นภาพสแกน กำลังเรียกใช้ OCR สแกนภาษาไทย...', 80);
      
      const ocrText = await performOcrOnPdf(pdfDoc, onProgress);
      if (ocrText.trim()) {
        return ocrText.trim();
      }
    }

    if (onProgress) onProgress('สกัดข้อความเสร็จสมบูรณ์', 100);
    return fullText.trim();

  } catch (err: any) {
    console.error('PDF Extraction error:', err);
    throw new Error('ไม่สามารถอ่านข้อความจากไฟล์ PDF: ' + (err.message || 'รูปแบบไฟล์ไม่รองรับ'));
  }
}

/**
 * Fallback OCR runner for scanned image PDF pages
 */
async function performOcrOnPdf(
  pdfDoc: any, 
  onProgress?: ExtractProgressCallback
): Promise<string> {
  try {
    const worker = await createWorker('tha+eng');
    let fullOcrText = '';
    const numPages = Math.min(pdfDoc.numPages, 10); // Process up to 10 pages for speed

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        onProgress(`กำลังทำ OCR สแกนหน้า ${pageNum}/${numPages}...`, 80 + Math.round((pageNum / numPages) * 18));
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const ret = await worker.recognize(canvas);
        if (ret && ret.data && ret.data.text) {
          fullOcrText += `--- [ หน้า ${pageNum} (OCR) ] ---\n` + ret.data.text + '\n\n';
        }
      }
    }

    await worker.terminate();
    return fullOcrText.trim();
  } catch (ocrErr: any) {
    console.warn('OCR Fallback error:', ocrErr);
    return '';
  }
}
