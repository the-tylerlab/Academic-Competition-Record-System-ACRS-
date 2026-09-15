import { DEFAULT_STUDENTS } from '../mockData';

export interface Student {
  studentId: string;
  name: string;
  grade: string;
  room: string;
  program: string;
  email?: string;
  id?: string;
}

export interface MatchedResult {
  name: string;
  cleanName?: string;
  subject?: string;
  award?: string;
  isMatched: boolean;
  studentId: string;
  grade: string;
  room: string;
  program: string;
  email: string;
  score?: string;
  matchedStudent?: Student;
}

// Common Thai & English title prefixes
const TITLE_PREFIXES = [
  // Thai prefixes (ordered longest first to avoid partial replacement)
  'เด็กชาย',
  'เด็กหญิง',
  'นางสาว',
  'นาย',
  'นาง',
  'ด.ช.',
  'ด.ญ.',
  'ด.ช',
  'ด.ญ',
  'น.ส.',
  'น.ส',
  'อาจารย์',
  'ครู',
  'ดร.',
  'ผศ.',
  'รศ.',
  'ศ.',
  // English prefixes
  'mr.',
  'mr',
  'miss',
  'ms.',
  'ms',
  'mrs.',
  'mrs',
  'master',
  'mstr.',
  'mstr'
];

/**
 * Remove title prefixes, punctuation, surrounding notes, and normalize spaces
 */
export function cleanAndNormalizeThaiName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName.trim();

  // Remove parenthesis and brackets content (e.g. (โรงเรียน...), (ชั้น ม.5...))
  name = name.replace(/\([^)]*\)/g, ' ');
  name = name.replace(/\[[^\]]*\]/g, ' ');
  name = name.replace(/\{[^}]*\}/g, ' ');

  // Remove leading numbers or bullets (e.g. "1.", "2)", "•", "-", "No. 1")
  name = name.replace(/^(\d+[\.\)\-:]*|\(+\d+\)+|[-*•#]+|no\.?\s*\d+)\s*/i, '');

  // Remove award suffixes like "- ผ่านเข้ารอบสอง", "- ชนะเลิศ"
  name = name.replace(/\s*-\s*.*$/, '');

  // Normalize spaces first
  name = name.replace(/\s+/g, ' ').trim();

  // Check and strip prefixes
  for (const prefix of TITLE_PREFIXES) {
    const isThai = !/^[a-zA-Z]/.test(prefix);
    if (isThai) {
      // Thai prefix might or might not have space after it (e.g. "นายสมศักดิ์" or "นาย สมศักดิ์")
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length).trim();
        break;
      }
    } else {
      // English prefix case-insensitive with word boundary or dot
      const regex = new RegExp(`^${prefix}\\s*`, 'i');
      if (regex.test(name)) {
        name = name.replace(regex, '').trim();
        break;
      }
    }
  }

  // Remove any remaining unwanted characters (keep Thai, English letters, and single space)
  name = name.replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  return name;
}

/**
 * Compare two names with multiple fuzzy & normalized strategies
 */
export function isNameMatch(dbName: string, queryName: string): boolean {
  if (!dbName || !queryName) return false;

  const rawDb = dbName.trim().toLowerCase();
  const rawQuery = queryName.trim().toLowerCase();

  // 1. Raw exact or substring match
  if (rawDb === rawQuery) return true;
  if (rawDb.includes(rawQuery) || rawQuery.includes(rawDb)) {
    // Only accept substring if length is substantial (> 4 chars) to prevent matching short 1-2 letter names
    if (Math.min(rawDb.length, rawQuery.length) >= 4) return true;
  }

  const cleanDb = cleanAndNormalizeThaiName(dbName).toLowerCase();
  const cleanQuery = cleanAndNormalizeThaiName(queryName).toLowerCase();

  if (!cleanDb || !cleanQuery) return false;

  // 2. Clean exact match
  if (cleanDb === cleanQuery) return true;

  // 3. Spaceless match (handling Thai no-space vs space formatted names)
  const noSpaceDb = cleanDb.replace(/\s+/g, '');
  const noSpaceQuery = cleanQuery.replace(/\s+/g, '');

  if (noSpaceDb === noSpaceQuery) return true;
  if (noSpaceDb.length >= 6 && noSpaceQuery.length >= 6) {
    if (noSpaceDb.includes(noSpaceQuery) || noSpaceQuery.includes(noSpaceDb)) return true;
  }

  // 4. First name + Last name comparison
  const dbParts = cleanDb.split(' ').filter(Boolean);
  const queryParts = cleanQuery.split(' ').filter(Boolean);

  if (dbParts.length >= 2 && queryParts.length >= 2) {
    const dbFirst = dbParts[0];
    const dbLast = dbParts[dbParts.length - 1];
    const queryFirst = queryParts[0];
    const queryLast = queryParts[queryParts.length - 1];

    if (dbFirst === queryFirst) {
      if (dbLast === queryLast) return true;
      if (dbLast.startsWith(queryLast) || queryLast.startsWith(dbLast)) return true;
    }
  } else if (dbParts.length >= 1 && queryParts.length >= 1) {
    // If one only has first name and last name is missing, but both first names match exactly and are >= 4 chars
    if (dbParts[0].length >= 5 && dbParts[0] === queryParts[0]) {
      return true;
    }
  }

  return false;
}

/**
 * Find matching student from student list
 */
export function findMatchingStudent(targetName: string, students: Student[]): Student | null {
  const studentPool = students && students.length > 0 ? students : DEFAULT_STUDENTS;

  for (const st of studentPool) {
    if (isNameMatch(st.name, targetName)) {
      return st;
    }
  }
  return null;
}

/**
 * Extract surrounding context like subject or award from a line or block
 */
function extractContextInfo(line: string, surroundingLines: string[]): { subject: string; award: string } {
  let subject = '';
  let award = '';

  // Check line for awards
  if (/ชนะเลิศอันดับ\s*\d|ชนะเลิศ|เหรียญทอง|เหรียญเงิน|เหรียญทองแดง|รางวัลดีเด่น|ผ่านเข้ารอบสอง|ผ่านเข้ารอบ|ผ่านการคัดเลือก|ตัวแทน/i.test(line)) {
    const match = line.match(/(ชนะเลิศอันดับ\s*\d|ชนะเลิศ|เหรียญทอง(?:แดง)?|เหรียญเงิน|รางวัล[^\(\)\-\n]+|ผ่านเข้ารอบ[^\(\)\-\n]*|ผ่านการคัดเลือก|ตัวแทน[^\(\)\-\n]*)/i);
    if (match) award = match[1].trim();
  }

  // Check line for subject/department
  if (/คณิตศาสตร์|เคมี|ฟิสิกส์|ชีววิทยา|ดาราศาสตร์|คอมพิวเตอร์|ภาษาอังกฤษ|ภาษาไทย|วิทยาศาสตร์|สุนทรพจน์|หุ่นยนต์|โครงงาน/i.test(line)) {
    const match = line.match(/(คณิตศาสตร์|เคมี|ฟิสิกส์|ชีววิทยา|ดาราศาสตร์|คอมพิวเตอร์|ภาษาอังกฤษ|ภาษาไทย|วิทยาศาสตร์|สุนทรพจน์[^\(\)\-\n]*|หุ่นยนต์|โครงงาน[^\(\)\-\n]*)/i);
    if (match) subject = match[1].trim();
  }

  // If not found in current line, look at nearby header lines
  if (!subject || !award) {
    for (const nearby of surroundingLines) {
      if (!subject && /สาขาวิชา|กลุ่มสาระ|วิชา|สาขา/i.test(nearby)) {
        const match = nearby.match(/(?:สาขาวิชา|วิชา|สาขา)\s*([ก-๙a-zA-Z\s\(\)]+)/i);
        if (match) subject = match[1].replace(/[\(\):\-]/g, '').trim();
      }
      if (!award && /ผลการแข่งขัน|รางวัล|ระดับ/i.test(nearby)) {
        const match = nearby.match(/(?:ผลการแข่งขัน|รางวัล)\s*([ก-๙a-zA-Z\s\(\)]+)/i);
        if (match) award = match[1].replace(/[\(\):\-]/g, '').trim();
      }
    }
  }

  return {
    subject: subject || 'วิชาการ',
    award: award || 'ผู้มีรายชื่อประกาศผล'
  };
}

/**
 * Scan raw text against students database and pattern extraction
 */
export function extractAndMatchStudentsFromText(
  rawText: string,
  students: Student[]
): MatchedResult[] {
  const studentPool = students && students.length > 0 ? students : DEFAULT_STUDENTS;
  const results: MatchedResult[] = [];
  const processedStudentIds = new Set<string>();
  const processedNames = new Set<string>();

  if (!rawText || !rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Strategy 1: Scan student pool directly against rawText
  // This guarantees that ANY student from our database who is mentioned anywhere in the PDF is found!
  studentPool.forEach(student => {
    const cleanDbName = cleanAndNormalizeThaiName(student.name);
    const spacelessDbName = cleanDbName.replace(/\s+/g, '');

    let foundInText = false;
    let matchedLine = '';
    let lineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = cleanAndNormalizeThaiName(line);
      const spacelessLine = cleanLine.replace(/\s+/g, '');

      if (
        line.includes(student.name) ||
        (cleanDbName.length >= 5 && line.includes(cleanDbName)) ||
        (spacelessDbName.length >= 5 && spacelessLine.includes(spacelessDbName)) ||
        isNameMatch(student.name, line)
      ) {
        foundInText = true;
        matchedLine = line;
        lineIndex = i;
        break;
      }
    }

    if (foundInText) {
      const nearbyLines = lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4));
      const { subject, award } = extractContextInfo(matchedLine, nearbyLines);

      results.push({
        name: student.name,
        cleanName: cleanDbName,
        subject,
        award,
        isMatched: true,
        studentId: student.studentId,
        grade: student.grade,
        room: student.room,
        program: student.program,
        email: student.email || '',
        matchedStudent: student
      });

      processedStudentIds.add(student.studentId);
      processedNames.add(cleanDbName);
    }
  });

  // Strategy 2: Extract candidate names from document lines
  // (e.g. lines with "1. ด.ช.จิรเดช ธรรมชัย", "น.ส.พชรมน ภูเณรพากร", "นายชัญญากาจน์ ภัทรสาธิต")
  const NAME_LINE_REGEX = /(?:(?:[0-9]+[\.\)\-]|[-*•])\s*)?(?:(นาย|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ด\.ช|ด\.ญ|น\.ส\.|น\.ส|นาง|Mr\.|Miss|Mrs\.|Master)\s*([ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)*))/g;

  lines.forEach((line, index) => {
    // Skip document official header lines
    if (/สมเด็จ|พระเจ้าพี่นางเธอ|พระราชทาน|พระอุปถัมภ์|กรมหลวง|เจ้าฟ้า|มูลนิธิส่งเสริม|ประกาศผู้ผ่าน/i.test(line)) {
      return;
    }

    // If line has name pattern
    let match: RegExpExecArray | null;
    const regex = new RegExp(NAME_LINE_REGEX);
    while ((match = regex.exec(line)) !== null) {
      const prefix = match[1] || '';
      let namePart = (match[2] || '').trim();
      
      // Separate school or suffix if attached (e.g. "ธรรมชัย โรงเรียนสวนกุหลาบ" -> name: "ธรรมชัย", school: "โรงเรียนสวนกุหลาบ")
      let schoolAffiliation = '';
      const schoolMatch = namePart.match(/(.*?)\s+(โรงเรียน[^\n]+|สาธิต[^\n]+)/);
      if (schoolMatch) {
        namePart = schoolMatch[1].trim();
        schoolAffiliation = schoolMatch[2].trim();
      }

      // Clean multiple inner spaces
      namePart = namePart.replace(/\s+/g, ' ');
      const candidateFullName = `${prefix}${prefix.endsWith('.') ? ' ' : ' '}${namePart}`.trim();
      const cleanCandidate = cleanAndNormalizeThaiName(candidateFullName);

      if (!cleanCandidate || cleanCandidate.length < 4) continue;
      if (processedNames.has(cleanCandidate)) continue;

      // Try to match with student database
      const matchedDb = findMatchingStudent(candidateFullName, studentPool);

      const nearbyLines = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4));
      const { subject, award } = extractContextInfo(line, nearbyLines);
      const finalSubject = subject || (schoolAffiliation ? `ชีววิทยา / ${schoolAffiliation}` : 'ชีววิทยา (สอวน.)');

      if (matchedDb) {
        if (!processedStudentIds.has(matchedDb.studentId)) {
          results.push({
            name: matchedDb.name, // or candidateFullName
            cleanName: cleanCandidate,
            subject: finalSubject,
            award,
            isMatched: true,
            studentId: matchedDb.studentId,
            grade: matchedDb.grade,
            room: matchedDb.room,
            program: matchedDb.program,
            email: matchedDb.email || '',
            matchedStudent: matchedDb
          });
          processedStudentIds.add(matchedDb.studentId);
          processedNames.add(cleanCandidate);
        }
      } else {
        // Unmatched student from PDF document
        results.push({
          name: candidateFullName,
          cleanName: cleanCandidate,
          subject: finalSubject,
          award,
          isMatched: false,
          studentId: 'ไม่พบข้อมูล',
          grade: 'N/A',
          room: 'N/A',
          program: 'Unknown',
          email: 'N/A'
        });
        processedNames.add(cleanCandidate);
      }
    }
  });

  return results;
}
