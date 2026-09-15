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

// All Thai & English title prefixes
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
  'ดช.',
  'ดญ.',
  'ดช',
  'ดญ',
  'น.ส.',
  'น.ส',
  'นส.',
  'นส',
  'อาจารย์',
  'ครู',
  'ดร.',
  'ดร',
  'ผศ.',
  'รศ.',
  'ศ.',
  'อ.',
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

// Target school patterns (Assumption College Thonburi / อัสสัมชัญธนบุรี)
export const ACT_SCHOOL_REGEX = /(?:โรงเรียน|ร\.ร\.)?\s*อัสสัมชัญ[\s\-]*ธนบุรี|อัสสัมชัญธนบุรี|อสธ\.?|\bACT\b|Assumption\s*College\s*Thonburi/i;

/**
 * Remove all title prefixes, numbers, symbols, and extra whitespace
 * Returns strictly the pure First Name + Last Name (ชื่อ-สกุล ล้วนๆ)
 */
export function cleanAndNormalizeThaiName(rawName: string): string {
  if (!rawName) return '';

  let name = rawName.trim()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    // Remove school names starting with โรงเรียน, ร.ร., อัสสัมชัญ, Assumption
    .replace(/(?:โรงเรียน|ร\.ร\.)\s*[^\n\t\r]+/g, ' ')
    .replace(/อัสสัมชัญ[\s\-]*ธนบุรี[^\n\t\r]*/gi, ' ')
    .replace(/Assumption\s*College[^\n\t\r]*/gi, ' ')
    .replace(/\s+(?:สวนกุหลาบ|เทพศิรินทร์|บดินทรเดชา|เตรียมอุดม|สามเสน|สตรีวิทยา|มหิดลวิทยานุสรณ์|กรุงเทพคริสเตียน|เซนต์คาเบรียล|เซนต์ดอมินิก|มาแตร์เดอี)[^\n\t\r]*/gi, ' ')
    // Remove leading numbers, ranks, student IDs (e.g., '7 31166', '1.', '1)', 'No. 1')
    .replace(/^(\d+[\.\)\-:]*|\(+\d+\)+|[-*•#]+|no\.?\s*\d+)\s*/i, '')
    .replace(/^\d{4,8}\s+/, '')
    .replace(/\s*-\s*.*$/, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip all title prefixes repeatedly in case of multiple prefixes
  let stripped = true;
  while (stripped) {
    stripped = false;
    for (const prefix of TITLE_PREFIXES) {
      const isThai = !/^[a-zA-Z]/.test(prefix);
      if (isThai) {
        if (name.startsWith(prefix)) {
          name = name.substring(prefix.length).trim();
          stripped = true;
          break;
        }
      } else {
        const regex = new RegExp(`^${prefix}\\s*`, 'i');
        if (regex.test(name)) {
          name = name.replace(regex, '').trim();
          stripped = true;
          break;
        }
      }
    }
  }

  // Remove non-letter symbols (keep Thai, English letters, and space)
  name = name.replace(/[^\u0E00-\u0E7Fa-zA-Z\s]/g, ' ');
  name = name.replace(/\s+/g, ' ').trim();

  return name;
}

/**
 * Extract consonant skeleton of Thai words (ignoring vowels, tones, punctuation, and digits for OCR error tolerance)
 */
export function stripThaiVowelsAndTones(str: string): string {
  if (!str) return '';
  return str.replace(/[\u0E30-\u0E3A\u0E47-\u0E4E\s\r\n\t\-_.,\/\\()\[\]{}|:;\"'0-9๐-๙]/g, '').toLowerCase();
}

/**
 * Extract split First Name and Last Name
 */
export function splitFirstAndLastName(name: string): { firstName: string; lastName: string } {
  const clean = cleanAndNormalizeThaiName(name);
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ')
  };
}

/**
 * Compare two Thai names based STRICTLY on First Name + Last Name (ชื่อ-สกุล)
 */
export function isNameMatch(dbName: string, queryName: string): boolean {
  if (!dbName || !queryName) return false;

  const cleanDb = cleanAndNormalizeThaiName(dbName).toLowerCase();
  const cleanQuery = cleanAndNormalizeThaiName(queryName).toLowerCase();

  if (!cleanDb || !cleanQuery) return false;

  // 1. Direct match on pure First Name + Last Name
  if (cleanDb === cleanQuery) return true;

  // 2. Spaceless match (handling Thai no-space formatting)
  const noSpaceDb = cleanDb.replace(/\s+/g, '');
  const noSpaceQuery = cleanQuery.replace(/\s+/g, '');
  if (noSpaceDb === noSpaceQuery) return true;

  // 3. Consonant skeleton match (ignoring OCR vowel/tone typos)
  const skelDb = stripThaiVowelsAndTones(cleanDb);
  const skelQuery = stripThaiVowelsAndTones(cleanQuery);
  if (skelDb.length >= 4 && skelQuery.length >= 4) {
    if (skelDb === skelQuery) return true;
    if (skelDb.includes(skelQuery) || skelQuery.includes(skelDb)) return true;
  }

  // 4. First name & Last name matching
  const dbParts = cleanDb.split(' ').filter(Boolean);
  const queryParts = cleanQuery.split(' ').filter(Boolean);

  if (dbParts.length >= 2 && queryParts.length >= 2) {
    const dbFirst = dbParts[0];
    const dbLast = dbParts[dbParts.length - 1];
    const queryFirst = queryParts[0];
    const queryLast = queryParts[queryParts.length - 1];

    const skelFirstDb = stripThaiVowelsAndTones(dbFirst);
    const skelFirstQuery = stripThaiVowelsAndTones(queryFirst);
    const skelLastDb = stripThaiVowelsAndTones(dbLast);
    const skelLastQuery = stripThaiVowelsAndTones(queryLast);

    if (skelFirstDb === skelFirstQuery) {
      if (skelLastDb === skelLastQuery || skelLastDb.startsWith(skelLastQuery) || skelLastQuery.startsWith(skelLastDb)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Find matching student from student roster by pure Name - Surname
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
 * Extract context info (subject / award)
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
 * Scan raw text against students database focusing on MATCHED students
 * Uses 3-layer matching:
 * 1) Full-document consonant skeleton & spaceless search (handles OCR line breaks, dropped vowels, Thai digits, broken spaces)
 * 2) Line-by-line precise First Name + Last Name matching
 * 3) Detection of school name rows (โรงเรียนอัสสัมชัญธนบุรี / อสธ. / ACT)
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
  const fullDocSkel = stripThaiVowelsAndTones(rawText);
  const fullDocNoSpace = rawText.replace(/\s+/g, '');

  // Global context detection from the whole document
  const defaultContext = extractContextInfo(rawText.slice(0, 500), lines.slice(0, 10));

  // Strategy 1: Scan student roster against document (Global Skeleton & Proximity Search)
  studentPool.forEach(student => {
    const cleanDbName = cleanAndNormalizeThaiName(student.name);
    const { firstName, lastName } = splitFirstAndLastName(student.name);
    const skelDbName = stripThaiVowelsAndTones(cleanDbName);
    const skelFirst = stripThaiVowelsAndTones(firstName);
    const skelLast = stripThaiVowelsAndTones(lastName);

    if (!cleanDbName || cleanDbName.length < 3) return;
    if (processedStudentIds.has(student.studentId)) return;

    let foundInText = false;
    let matchedLine = '';
    let lineIndex = -1;

    // 1. Direct or Spaceless text match in full document
    const studentNoSpace = (firstName + lastName).replace(/\s+/g, '');
    if (rawText.includes(cleanDbName) || (studentNoSpace.length >= 4 && fullDocNoSpace.includes(studentNoSpace))) {
      foundInText = true;
    }

    // 2. Global Consonant Skeleton match (handles OCR errors, dropped vowels, spacing artifacts)
    if (!foundInText && skelDbName.length >= 4 && fullDocSkel.includes(skelDbName)) {
      foundInText = true;
    }

    // 3. Proximity Skeleton match (first name and last name appearing within 50 characters of each other)
    if (!foundInText && skelFirst.length >= 3 && skelLast.length >= 3) {
      const firstIdx = fullDocSkel.indexOf(skelFirst);
      if (firstIdx !== -1) {
        const windowAfter = fullDocSkel.substring(firstIdx, firstIdx + skelFirst.length + 50);
        if (windowAfter.includes(skelLast)) {
          foundInText = true;
        }
      }
    }

    // Find the closest line for context if found
    if (foundInText) {
      for (let i = 0; i < lines.length; i++) {
        const lSkel = stripThaiVowelsAndTones(lines[i]);
        if (lSkel.includes(skelFirst) || lSkel.includes(skelLast)) {
          matchedLine = lines[i];
          lineIndex = i;
          break;
        }
      }

      const nearbyLines = lineIndex !== -1 
        ? lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4))
        : lines.slice(0, 10);

      const context = extractContextInfo(matchedLine || rawText.slice(0, 300), nearbyLines);

      results.push({
        name: cleanDbName,
        cleanName: cleanDbName,
        subject: context.subject || defaultContext.subject,
        award: context.award || defaultContext.award,
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

  // Strategy 2: Detect any lines that mention "โรงเรียนอัสสัมชัญธนบุรี" / "อัสสัมชัญ ธนบุรี"
  lines.forEach((line, index) => {
    if (ACT_SCHOOL_REGEX.test(line)) {
      let candidateName = cleanAndNormalizeThaiName(line);
      if (!candidateName || candidateName.length < 4) {
        if (index > 0) {
          candidateName = cleanAndNormalizeThaiName(lines[index - 1]);
        }
        if ((!candidateName || candidateName.length < 4) && index < lines.length - 1) {
          candidateName = cleanAndNormalizeThaiName(lines[index + 1]);
        }
      }

      if (!candidateName || candidateName.length < 4) return;
      if (processedNames.has(candidateName)) return;

      const matchedDb = findMatchingStudent(candidateName, studentPool);
      const nearbyLines = lines.slice(Math.max(0, index - 3), Math.min(lines.length, index + 4));
      const context = extractContextInfo(line, nearbyLines);

      if (matchedDb) {
        if (!processedStudentIds.has(matchedDb.studentId)) {
          results.push({
            name: cleanAndNormalizeThaiName(matchedDb.name),
            cleanName: candidateName,
            subject: context.subject || defaultContext.subject,
            award: context.award || defaultContext.award,
            isMatched: true,
            studentId: matchedDb.studentId,
            grade: matchedDb.grade,
            room: matchedDb.room,
            program: matchedDb.program,
            email: matchedDb.email || '',
            matchedStudent: matchedDb
          });
          processedStudentIds.add(matchedDb.studentId);
          processedNames.add(candidateName);
        }
      } else {
        // ACT Student found from school name in PDF
        results.push({
          name: candidateName,
          cleanName: candidateName,
          subject: context.subject || defaultContext.subject,
          award: context.award || defaultContext.award,
          isMatched: true,
          studentId: "รอระบุรหัส (อสธ.)",
          grade: "ม.5",
          room: "1",
          program: "Normal",
          email: ""
        });
        processedNames.add(candidateName);
      }
    }
  });

  return results;
}
