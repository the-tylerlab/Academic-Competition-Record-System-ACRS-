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
    .replace(/^(\d+[\.\)\-:]*|\(+\d+\)+|[-*•#]+|no\.?\s*\d+)\s*/i, '')
    .replace(/^\d{4,6}\s+/, '')
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
 * Extract consonant skeleton of Thai words (ignoring vowels and tone marks for OCR error tolerance)
 */
export function stripThaiVowelsAndTones(str: string): string {
  if (!str) return '';
  return str.replace(/[\u0E30-\u0E3A\u0E47-\u0E4E\s]/g, '').toLowerCase();
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
 * Scan raw text against students database focusing strictly on MATCHED students
 * ONLY returns students who exist in the database and appear in the document
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

  // Scan every student in our school roster against the document text (Matching strictly by First Name + Last Name)
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

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const cleanLine = cleanAndNormalizeThaiName(line);
      const skelLine = stripThaiVowelsAndTones(cleanLine);

      const lineNoSpace = line.replace(/\s+/g, '');
      const targetNoSpace = (firstName + lastName).replace(/\s+/g, '');
      const skelLineNoSpace = stripThaiVowelsAndTones(lineNoSpace);
      const skelTargetNoSpace = stripThaiVowelsAndTones(targetNoSpace);

      // Check full name without prefix
      if (
        line.includes(cleanDbName) ||
        cleanLine.includes(cleanDbName) ||
        lineNoSpace.includes(targetNoSpace) ||
        (skelDbName.length >= 4 && skelLine.includes(skelDbName)) ||
        (skelTargetNoSpace.length >= 4 && skelLineNoSpace.includes(skelTargetNoSpace)) ||
        isNameMatch(cleanDbName, cleanLine)
      ) {
        foundInText = true;
        matchedLine = line;
        lineIndex = i;
        break;
      }

      // Check both first name and last name appearing on the same line
      if (firstName.length >= 2 && lastName.length >= 2) {
        const hasFirst = cleanLine.includes(firstName) || (skelFirst.length >= 2 && skelLineNoSpace.includes(skelFirst));
        const hasLast = cleanLine.includes(lastName) || (skelLast.length >= 2 && skelLineNoSpace.includes(skelLast));
        if (hasFirst && hasLast) {
          foundInText = true;
          matchedLine = line;
          lineIndex = i;
          break;
        }
      }
    }

    if (foundInText) {
      const nearbyLines = lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 4));
      const { subject, award } = extractContextInfo(matchedLine, nearbyLines);

      results.push({
        name: cleanDbName, // Display clean First Name + Last Name
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

  return results;
}
