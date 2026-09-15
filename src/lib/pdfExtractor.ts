import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch {
  // Fallback if URL resolution fails
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Extract all text content from a PDF ArrayBuffer or File
 */
export async function extractTextFromPdf(data: ArrayBuffer | Uint8Array): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY: number | null = null;
      let pageText = '';

      for (const item of textContent.items as any[]) {
        if ('str' in item) {
          // If Y position changed significantly, add a newline
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
            pageText += '\n';
          } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
            pageText += ' ';
          }
          pageText += item.str;
          lastY = item.transform[5];
        }
      }

      fullText += pageText.trim() + '\n\n';
    }

    return fullText.trim();
  } catch (err: any) {
    console.error('Error extracting text from PDF:', err);
    throw new Error('ไม่สามารถอ่านข้อความจากไฟล์ PDF ได้: ' + (err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'));
  }
}
