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
 * High-precision PDF text extraction with automatic 2.5x High-DPI OCR fallback for Thai scanned documents
 */
export async function extractTextFromPdf(
  data: ArrayBuffer | Uint8Array,
  onProgress?: ExtractProgressCallback
): Promise<string> {
  try {
    if (onProgress) onProgress('กำลังโหลดโครงสร้างไฟล์ PDF...', 5);

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
    let hasValidVectorText = false;
    let totalThaiCharCount = 0;

    // Pass 1: Try reading direct vector text layer from PDF
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        const pageProgress = 5 + Math.round((pageNum / numPages) * 30);
        onProgress(`กำลังตรวจสอบเลเยอร์ข้อความ หน้า ${pageNum}/${numPages}...`, pageProgress);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];

      if (items.length > 0) {
        // Group text items by vertical Y-coordinate to reconstruct table rows accurately
        const lineMap = new Map<number, any[]>();
        const Y_TOLERANCE = 4;

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

        const thaiMatches = pageText.match(/[\u0E00-\u0E7F]/g);
        if (thaiMatches) {
          totalThaiCharCount += thaiMatches.length;
        }

        if (pageText.trim()) {
          fullText += `--- [ หน้า ${pageNum} ] ---\n` + pageText.trim() + '\n\n';
        }
      }
    }

    // If vector text had meaningful Thai content (at least 30 Thai chars per page on average)
    if (totalThaiCharCount > numPages * 15 && fullText.trim().length > 100) {
      hasValidVectorText = true;
      if (onProgress) onProgress('สกัดข้อความจากเอกสารเรียบร้อย', 100);
      return fullText.trim();
    }

    // Pass 2: High-resolution Thai OCR for scanned PDF pages
    if (!hasValidVectorText) {
      if (onProgress) onProgress('เอกสารเป็นภาพสแกน กำลังเตรียมเอนจิน OCR ภาษาไทยความละเอียดสูง...', 40);
      const ocrResult = await performHighResOcr(pdfDoc, onProgress);
      if (ocrResult && ocrResult.trim()) {
        if (onProgress) onProgress('สแกน OCR เสร็จสมบูรณ์', 100);
        return ocrResult.trim();
      }
    }

    return fullText.trim();
  } catch (err: any) {
    console.error('PDF Extraction error:', err);
    throw new Error('ไม่สามารถประมวลผลไฟล์ PDF: ' + (err.message || 'รูปแบบไฟล์ไม่รองรับ'));
  }
}

/**
 * High-resolution canvas rendering + Binarization for accurate Thai OCR
 */
async function performHighResOcr(
  pdfDoc: any, 
  onProgress?: ExtractProgressCallback
): Promise<string> {
  let worker: any = null;
  try {
    worker = await createWorker('tha+eng');
    let fullOcrText = '';
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      if (onProgress) {
        const ocrProgress = 40 + Math.round((pageNum / numPages) * 55);
        onProgress(`กำลังทำ OCR สแกนภาษาไทย หน้า ${pageNum}/${numPages}...`, ocrProgress);
      }

      const page = await pdfDoc.getPage(pageNum);
      // Render at 2.5x scale (approx 300 DPI) for crisp Thai characters and tone marks
      const viewport = page.getViewport({ scale: 2.5 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;

        // Image preprocessing: Enhance contrast & sharpen for black text on white paper
        const imgData = context.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i];
          const g = d[i + 1];
          const b = d[i + 2];
          // Grayscale luminosity
          const v = 0.299 * r + 0.587 * g + 0.114 * b;
          // High contrast binarization curve
          const enhanced = v < 165 ? 0 : 255;
          d[i] = enhanced;
          d[i + 1] = enhanced;
          d[i + 2] = enhanced;
        }
        context.putImageData(imgData, 0, 0);

        const ret = await worker.recognize(canvas);
        if (ret && ret.data && ret.data.text) {
          const cleanedText = cleanOcrNoise(ret.data.text);
          fullOcrText += `--- [ หน้า ${pageNum} ] ---\n` + cleanedText + '\n\n';
        }
      }
    }

    return fullOcrText.trim();
  } catch (ocrErr: any) {
    console.warn('OCR Fallback error:', ocrErr);
    return '';
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

/**
 * Filter out OCR garbage symbols and fix common Thai character scan artifacts
 */
function cleanOcrNoise(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      // Clean isolated symbols like `q )`, `เ" 7`, `ad`, `o3 59`
      const trimmed = line.trim();
      if (/^[a-zA-Z0-9_\-\.\:\(\)\s]{1,4}$/.test(trimmed) && !/\d{5}/.test(trimmed)) {
        return '';
      }
      return trimmed;
    })
    .filter(Boolean)
    .join('\n');
}
