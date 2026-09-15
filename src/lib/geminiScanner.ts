// Service for scanning documents using Google Gemini 1.5 Flash Vision AI

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
 * Scan a document (PDF, Image, or Text) using Google Gemini 1.5 Flash
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

  onProgress?.('กำลังเตรียมไฟล์ส่งไปยัง Google Gemini Vision AI...');

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
    onProgress?.(`กำลังประมวลผลไฟล์ ${fileOrText.name} (${(fileOrText.size / 1024).toFixed(1)} KB)...`);
    const { base64, mimeType } = await fileToBase64(fileOrText);
    parts.push({
      inline_data: {
        mime_type: mimeType,
        data: base64
      }
    });
  }

  onProgress?.('Google Gemini 1.5 Flash กำลังอ่านและวิเคราะห์รายชื่อ...');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(activeKey)}`,
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
    const message = errorData?.error?.message || `HTTP Error ${response.status} ${response.statusText}`;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const rawResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!rawResponseText) {
    throw new Error('ไม่ได้รับข้อมูลตอบกลับจาก Gemini AI');
  }

  try {
    const parsedResult = JSON.parse(rawResponseText) as GeminiScanResult;
    return parsedResult;
  } catch (err) {
    console.error('Failed to parse Gemini response as JSON:', rawResponseText);
    throw new Error('รูปแบบข้อมูลที่ส่งกลับมาจาก AI ไม่ถูกต้อง');
  }
}
