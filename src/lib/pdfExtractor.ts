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
 * Reconstruct row text from PDF text items by measuring horizontal X distance gaps
 * Ensures Thai syllables and tone marks join seamlessly into words
 */
function reconstructRowText(rowItems: any[]): string {
  if (!rowItems || rowItems.length === 0) return '';
  // Sort items from left to right (X ascending)
  rowItems.sort((a, b) => a.transform[4] - b.transform[4]);

  let result = '';
  let lastEndX: number | null = null;

  for (const item of rowItems) {
    const str = item.str;
    if (!str && str !== '0') continue;

    const startX = item.transform[4];
    const width = item.width || (str.length * 6);

    if (lastEndX !== null) {
      const gap = startX - lastEndX;
      if (gap > 28) {
        result += '   '; // Table column separator
      } else if (gap > 6) {
        result += ' ';   // Word space
      }
      // If gap <= 6: tight letter / vowel ligature -> NO space
    }

    result += str;
    lastEndX = startX + width;
  }

  return result.trim();
}

/**
 * Extract all text from PDF directly from vector text layer with accurate table reconstruction
 */
export async function extractTextFromPdf(
  data: ArrayBuffer | Uint8Array,
  onProgress?: ExtractProgressCallback
): Promise<string> {
  try {
    if (onProgress) onProgress('กำลังเปิดไฟล์เอกสาร PDF...', 5);

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
        const pageProgress = 5 + Math.round((pageNum / numPages) * 85);
        onProgress(`กำลังสกัดข้อความ หน้า ${pageNum}/${numPages}...`, pageProgress);
      }

      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items as any[];
      totalTextItemsCount += items.length;

      if (items.length > 0) {
        // Group items by vertical Y-coordinate (within 4px tolerance)
        const lineMap = new Map<number, any[]>();
        const Y_TOLERANCE = 4;

        for (const item of items) {
          if (!('str' in item)) continue;
          
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
          const rowStr = reconstructRowText(rowItems);
          if (rowStr) {
            pageText += rowStr + '\n';
          }
        }

        if (pageText.trim()) {
          fullText += `--- [ หน้า ${pageNum} ] ---\n` + pageText.trim() + '\n\n';
        }
      }
    }

    // If PDF text layer contains text, use it directly (100% accurate vector text)
    if (totalTextItemsCount > 10 && fullText.trim().length > 30) {
      if (onProgress) onProgress('สกัดข้อความเสร็จสมบูรณ์', 100);
      return fullText.trim();
    }

    // Fallback ONLY if the document has 0 text items (scanned image only)
    if (onProgress) onProgress('ไม่พบเลเยอร์ข้อความ กำลังทำ OCR สแกนภาษาไทย...', 90);
    const ocrText = await performHighResOcr(pdfDoc, onProgress);
    return ocrText.trim() || fullText.trim();

  } catch (err: any) {
    console.error('PDF Extraction error:', err);
    throw new Error('ไม่สามารถประมวลผลไฟล์ PDF: ' + (err.message || 'รูปแบบไฟล์ไม่รองรับ'));
  }
}

/**
 * Fallback OCR for scanned image PDFs
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
        const ocrProgress = 90 + Math.round((pageNum / numPages) * 9);
        onProgress(`กำลังทำ OCR สแกนหน้า ${pageNum}/${numPages}...`, ocrProgress);
      }

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        const ret = await worker.recognize(canvas);
        if (ret && ret.data && ret.data.text) {
          fullOcrText += `--- [ หน้า ${pageNum} ] ---\n` + ret.data.text.trim() + '\n\n';
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
