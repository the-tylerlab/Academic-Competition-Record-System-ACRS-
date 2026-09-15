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

  // Remove parenthesis and brackets content
  name = name.replace(/\([^)]*\)/g, ' ');
  name = name.replace(/\[[^\]]*\]/g, ' ');
  name = name.replace(/\{[^}]*\}/g, ' ');

  // Remove leading numbers or bullets (e.g. "1.", "2)", "•", "-", "30031")
  name = name.replace(/^(\d+[\.\)\-:]*|\(+\d+\)+|[-*•#]+|no\.?\s*\d+)\s*/i, '');

  // Remove exam id if attached at beginning (e.g. "30031 ด.ช.จิรเดช")
  name = name.replace(/^\d{4,6}\s+/, '');

  // Remove award suffixes like "- ผ่านเข้ารอบสอง", "- ชนะเลิศ"
  name = name.replace(/\s*-\s*.*$/, '');

  // Normalize spaces first
  name = name.replace(/\s+/g, ' ').trim();

  // Check and strip prefixes
  for (const prefix of TITLE_PREFIXES) {
    const isThai = !/^[a-zA-Z]/.test(prefix);
    if (isThai) {
      if (name.startsWith(prefix)) {
        name = name.substring(prefix.length).trim();
        break;
      }
    } else {
      const regex = new RegExp(`^${prefix}\\s*`, 'i');
      if (regex.test(name)) {
        name = name.replace(regex, '').trim();
        break;
      }
    }
  }

  // Remove any remaining unwanted non-letter characters (keep Thai, English letters, and space)
  name = name.replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  return name;
}

/**
 * Extract consonant skeleton of Thai words (ignoring vowels and tone marks for OCR error tolerance)
 */
export function stripThaiVowelsAndTones(str: string): string {
  if (!str) return '';
  // Thai vowels and tone marks unicode range: \u0E30-\u0E3A (Sara A to Phinthu), \u0E47-\u0E4E (Maitaikhu to Yamakkan)
  return str.replace(/[\u0E30-\u0E3A\u0E47-\u0E4E\s]/g, '').toLowerCase();
}

/**
 * Levenshtein distance for fuzzy typo correction
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function calculateSimilarity(s1: string, s2: string): number {
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1;
  const distance = levenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return (maxLen - distance) / maxLen;
}

/**
 * Compare two Thai names with multi-layer exact, skeleton, and fuzzy similarity
 */
export function isNameMatch(dbName: string, queryName: string): boolean {
  if (!dbName || !queryName) return false;

  const rawDb = dbName.trim().toLowerCase();
  const rawQuery = queryName.trim().toLowerCase();

  // 1. Exact raw or includes
  if (rawDb === rawQuery) return true;
  if (rawDb.includes(rawQuery) || rawQuery.includes(rawDb)) {
    if (Math.min(rawDb.length, rawQuery.length) >= 4) return true;
  }

  const cleanDb = cleanAndNormalizeThaiName(dbName).toLowerCase();
  const cleanQuery = cleanAndNormalizeThaiName(queryName).toLowerCase();

  if (!cleanDb || !cleanQuery) return false;

  // 2. Clean exact match
  if (cleanDb === cleanQuery) return true;

  // 3. Spaceless match
  const noSpaceDb = cleanDb.replace(/\s+/g, '');
  const noSpaceQuery = cleanQuery.replace(/\s+/g, '');
  if (noSpaceDb === noSpaceQuery) return true;

  // 4. Consonant skeleton match (tolerance for OCR missing upper/lower vowels & tones)
  const skelDb = stripThaiVowelsAndTones(cleanDb);
  const skelQuery = stripThaiVowelsAndTones(cleanQuery);
  if (skelDb.length >= 4 && skelQuery.length >= 4) {
    if (skelDb === skelQuery) return true;
    if (skelDb.includes(skelQuery) || skelQuery.includes(skelDb)) return true;
  }

  // 5. First name & Last name matching
  const dbParts = cleanDb.split(' ').filter(Boolean);
  const queryParts = cleanQuery.split(' ').filter(Boolean);

  if (dbParts.length >= 2 && queryParts.length >= 2) {
    const dbFirst = dbParts[0];
    const dbLast = dbParts[dbParts.length - 1];
    const queryFirst = queryParts[0];
    const queryLast = queryParts[queryParts.length - 1];

    // Check skeleton of first and last name
    const skelFirstDb = stripThaiVowelsAndTones(dbFirst);
    const skelFirstQuery = stripThaiVowelsAndTones(queryFirst);
    const skelLastDb = stripThaiVowelsAndTones(dbLast);
    const skelLastQuery = stripThaiVowelsAndTones(queryLast);

    if (skelFirstDb === skelFirstQuery) {
      if (skelLastDb === skelLastQuery || skelLastDb.startsWith(skelLastQuery) || skelLastQuery.startsWith(skelLastDb)) {
        return true;
      }
      if (calculateSimilarity(dbLast, queryLast) >= 0.75) {
        return true;
      }
    }
  }

  // 6. Overall fuzzy similarity > 82%
  if (cleanDb.length >= 6 && cleanQuery.length >= 6) {
    if (calculateSimilarity(cleanDb, cleanQuery) >= 0.82) {
      return true;
    }
  }

  return false;
}

/**
 * Find matching student from student roster
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
 * Extract surrounding context like subject or award
 */
function extractContextInfo(line: string, surroundingLines: string[]): { subject: string; award: string } {
  let subject = '';
  let award = '';

  const allContext = [line, ...surroundingLines].join(' ');

  if (/ชีววิทยา/i.test(allContext)) subject = 'ชีววิทยา (สอวน.)';
  else if (/คณิตศาสตร์/i.test(allContext)) subject = 'คณิตศาสตร์ (สอวน.)';
  else if (/เคมี/i.test(allContext)) subject = 'เคมี (สอวน.)';
  else if (/ฟิสิกส์/i.test(allContext)) subject = 'ฟิสิกส์ (สอวน.)';
  else if (/คอมพิวเตอร์/i.test(allContext)) subject = 'คอมพิวเตอร์ (สอวน.)';
  else if (/ดาราศาสตร์/i.test(allContext)) subject = 'ดาราศาสตร์ (สอวน.)';
  else if (/สุนทรพจน์/i.test(allContext)) subject = 'สุนทรพจน์ภาษาอังกฤษ';
  else if (/ทุนการศึกษา|ทุนเรียนดี/i.test(allContext)) subject = 'ทุนการเรียนดีเด่น';

  if (/ค่ายที่\s*1|ค่าย\s*1/i.test(allContext)) award = 'ผ่านการคัดเลือก ค่าย 1';
  else if (/ค่ายที่\s*2|ค่าย\s*2/i.test(allContext)) award = 'ผ่านการคัดเลือก ค่าย 2';
  else if (/ชนะเลิศ/i.test(allContext)) award = 'รางวัลชนะเลิศ';
  else if (/เหรียญทอง/i.test(allContext)) award = 'รางวัลเหรียญทอง';
  else if (/ผ่านเข้ารอบ/i.test(allContext)) award = 'ผ่านการคัดเลือก';

  return {
    subject: subject || 'ชีววิทยา (สอวน.)',
    award: award || 'ผ่านการคัดเลือก ค่าย 1'
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

  // Strategy 1: Scan every student in our school database against the entire rawText (including OCR text)
  studentPool.forEach(student => {
    const cleanDbName = cleanAndNormalizeThaiName(student.name);
    const skelDbName = stripThaiVowelsAndTones(cleanDbName);

    let foundInText = false;
    let matchedLine = '';
    let lineIndex = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = cleanAndNormalizeThaiName(line);
      const skelLine = stripThaiVowelsAndTones(cleanLine);

      if (
        line.includes(student.name) ||
        (cleanDbName.length >= 4 && cleanLine.includes(cleanDbName)) ||
        (skelDbName.length >= 4 && skelLine.includes(skelDbName)) ||
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

  // Strategy 2: Extract candidate names from lines for students outside or unlinked
  const NAME_LINE_REGEX = /(?:(?:[0-9]+[\.\)\-]|[-*•])\s*)?(?:(นาย|นางสาว|เด็กชาย|เด็กหญิง|ด\.ช\.|ด\.ญ\.|ด\.ช|ด\.ญ|น\.ส\.|น\.ส|นาง|Mr\.|Miss|Mrs\.|Master)\s*([ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)*))/g;

  lines.forEach((line, index) => {
    // Skip official document header lines
    if (/สมเด็จ|พระเจ้าพี่นางเธอ|พระราชทาน|พระอุปถัมภ์|กรมหลวง|เจ้าฟ้า|มูลนิธิส่งเสริม|ประกาศผู้ผ่าน|เรื่อง\s*ผลการสอบ/i.test(line)) {
      return;
    }

    let match: RegExpExecArray | null;
    const regex = new RegExp(NAME_LINE_REGEX);
    while ((match = regex.exec(line)) !== null) {
      const prefix = match[1] || '';
      let namePart = (match[2] || '').trim();
      
      let schoolAffiliation = '';
      const schoolMatch = namePart.match(/(.*?)\s+(โรงเรียน[^\n]+|สาธิต[^\n]+)/);
      if (schoolMatch) {
        namePart = schoolMatch[1].trim();
        schoolAffiliation = schoolMatch[2].trim();
      }

      namePart = namePart.replace(/\s+/g, ' ');
      const candidateFullName = `${prefix}${prefix.endsWith('.') ? ' ' : ' '}${namePart}`.trim();
      const cleanCandidate = cleanAndNormalizeThaiName(candidateFullName);

      if (!cleanCandidate || cleanCandidate.length < 4) continue;
      if (processedNames.has(cleanCandidate)) continue;

      const matchedDb = findMatchingStudent(candidateFullName, studentPool);
      const nearbyLines = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4));
      const { subject, award } = extractContextInfo(line, nearbyLines);
      const finalSubject = subject || (schoolAffiliation ? `ชีววิทยา / ${schoolAffiliation}` : 'ชีววิทยา (สอวน.)');

      if (matchedDb) {
        if (!processedStudentIds.has(matchedDb.studentId)) {
          results.push({
            name: matchedDb.name,
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
        // Unmatched student candidate from document
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
