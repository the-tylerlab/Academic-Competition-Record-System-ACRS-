// Service for scanning documents using Google Gemini Vision AI with Multimodal Filtering

export interface GeminiScannedStudent {
  name: string;
  school?: string;
  competitionName?: string;
  subject?: string;
  award?: string;
  grade?: string;
}

export interface GeminiScanResult {
  competitionName?: string;
  academicYear?: string;
  students: GeminiScannedStudent[];
  rawSummary?: string;
}

/**
 * Converts a File object to base64 string and mime type
 */
export async function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [header, base64] = dataUrl.split(',');
      const mimeType = header.match(/:(.*?);/)?.[1] || file.type || 'application/pdf';
      resolve({ base64, mimeType });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Auto-detect available Vision/Multimodal Gemini models for this API key
 */
async function getAvailableVisionModels(apiKey: string): Promise<string[]> {
  const isExcluded = (name: string) => {
    return /tts|audio|embed|imagen|music|speech|whisper|realtime/i.test(name);
  };

  const prioritized = [
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash-001',
    'gemini-1.5-flash-8b',
    'gemini-2.0-flash-exp',
    'gemini-1.5-pro-latest',
    'gemini-1.5-pro',
    'gemini-2.5-flash'
  ];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
    if (res.ok) {
      const data = await res.json();
      const models: any[] = data.models || [];
      const usable = models
        .filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') &&
          !isExcluded(m.name)
        )
        .map((m: any) => m.name.replace('models/', ''));

      const result: string[] = [];
      for (const p of prioritized) {
        if (usable.includes(p)) {
          result.push(p);
        }
      }

      for (const u of usable) {
        if (!result.includes(u) && !isExcluded(u) && (u.includes('flash') || u.includes('pro') || u.includes('gemini'))) {
          result.push(u);
        }
      }

      if (result.length > 0) {
        return result;
      }
    }
  } catch (err) {
    console.warn('Could not auto-list Gemini models:', err);
  }

  // Fallback prioritized list
  return prioritized;
}

/**
 * Scan a document (PDF, Image, or Text) using Google Gemini AI
 */
export async function scanDocumentWithGemini(
  fileOrText: File | string,
  apiKey?: string,
  onProgress?: (status: string) => void
): Promise<GeminiScanResult> {
  const activeKey = apiKey || 
    localStorage.getItem('acrs_gemini_api_key') || 
    import.meta.env.VITE_GEMINI_API_KEY || 
    '';

  if (!activeKey) {
    throw new Error('ไม่พบ Gemini API Key กรุณาระบุ Gemini API Key ในการตั้งค่า');
  }

  onProgress?.('กำลังค้นหาโมเดล Vision AI ที่พร้อมใช้งาน...');
  const candidateModels = await getAvailableVisionModels(activeKey);

  const promptText = `
คุณคือระบบ AI ผู้เชี่ยวชาญการอ่านเอกสารประกาศผลการแข่งขันทางวิชาการและสอบวัดระดับ (เช่น สอวน., สพฐ., สสวท., เพชรยอดมงกุฎ, ศิลปหัตถกรรม)
หน้าที่ของคุณ:
1. อ่านเอกสารประกาศผลหรือตารางรายชื่อทั้งหมดอย่างละเอียด
2. ค้นหาและสกัดรายชื่อนักเรียน โดยเน้นเฉพาะนักเรียนจาก **โรงเรียนอัสสัมชัญธนบุรี** (หรือ อัสสัมชัญ ธนบุรี / ACT / อสธ / Assumption College Thonburi) เป็นอันดับแรก
3. หากมีนักเรียนโรงเรียนอัสสัมชัญธนบุรี ให้ส่งเฉพาะรายชื่อนักเรียนโรงเรียนนี้เท่านั้น
4. หากไม่มีนักเรียนโรงเรียนอัสสัมชัญธนบุรีเลย ให้สกัดรายชื่อนักเรียนทุกคนที่พบในเอกสาร
5. สกัดข้อมูลออกมาเป็น JSON Object รูปแบบดังนี้:
{
  "competitionName": "ชื่อการแข่งขัน เช่น การสอบคัดเลือกโอลิมปิกวิชาการ สอวน. ค่าย 1 สาขาวิชาชีววิทยา",
  "academicYear": "2569",
  "students": [
    {
      "name": "นาย ธนบูรณ์ พุทธชัย",
      "school": "โรงเรียนอัสสัมชัญธนบุรี",
      "subject": "ชีววิทยา (สอวน.)",
      "award": "ผ่านการคัดเลือก ค่าย 1",
      "grade": "ม.5"
    }
  ],
  "rawSummary": "คำอธิบายสรุปสั้นๆ เกี่ยวกับผลการสแกน"
}
`;

  let parts: any[] = [{ text: promptText }];

  if (typeof fileOrText === 'string') {
    parts.push({ text: `\n\nเนื้อหาข้อความจากเอกสาร:\n${fileOrText}` });
  } else {
    onProgress?.(`กำลังเตรียมไฟล์ ${fileOrText.name} (${(fileOrText.size / 1024).toFixed(1)} KB)...`);
    const { base64, mimeType } = await fileToBase64(fileOrText);
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64
      }
    });
  }

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    try {
      onProgress?.(`กำลังอ่านเอกสารด้วยโมเดล ${modelName}...`);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(activeKey)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            }
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.warn(`Model ${modelName} returned error (${response.status}): ${message}, trying next candidate...`);
        lastError = new Error(message);
        continue;
      }

      const data = await response.json();
      const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!rawResponseText) {
        lastError = new Error(`โมเดล ${modelName} ไม่ได้ส่งเนื้อหากลับมา`);
        continue;
      }

      const parsedResult = JSON.parse(rawResponseText) as GeminiScanResult;
      return parsedResult;
    } catch (err: any) {
      console.warn(`Model ${modelName} execution exception:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('ไม่สามารถประมวลผลไฟล์ด้วยโมเดล Gemini Vision ที่มีอยู่ได้');
}
