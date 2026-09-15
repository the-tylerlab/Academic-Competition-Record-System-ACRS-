import { useState, useRef, useEffect } from 'react';
import { Upload, ChevronDown, CheckCircle2, AlertCircle, Plus, FileText, Globe, RefreshCw, Sparkles, BookOpen, Key, Bot } from 'lucide-react';
import { MOCK_SOURCES, DEFAULT_STUDENTS } from '../mockData';
import { extractTextFromPdf } from '../lib/pdfExtractor';
import { extractAndMatchStudentsFromText, findMatchingStudent, cleanAndNormalizeThaiName } from '../lib/nameMatcher';
import { scanDocumentWithGemini, type GeminiScanResult } from '../lib/geminiScanner';

interface SearcherProps {
  students: any[];
  onSaveRecord: (record: any) => Promise<void>;
  role: string;
}

export default function Searcher({ students, onSaveRecord, role }: SearcherProps) {
  const activeStudentsPool = students && students.length > 0 ? students : DEFAULT_STUDENTS;

  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [inputType, setInputType] = useState<'file' | 'url'>('file');
  const [customUrl, setCustomUrl] = useState('');
  
  // AI Scan Engine Mode
  const [scanEngine, setScanEngine] = useState<'gemini' | 'offline'>('gemini');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('acrs_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);

  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [uploadedFileObj, setUploadedFileObj] = useState<File | null>(null);
  
  // Real scanned text from file or user input
  const [scannedText, setScannedText] = useState('');
  const [foundStudentsList, setFoundStudentsList] = useState<any[]>([]);

  const [isFileReading, setIsFileReading] = useState(false);
  const [readingStatus, setReadingStatus] = useState({ message: '', percent: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [recordMeta, setRecordMeta] = useState({
    competitionName: "การแข่งขันโอลิมปิกวิชาการ สอวน. ประจำปีการศึกษา 2569",
    academicYear: "2569",
    notes: ""
  });

  // Re-run matching automatically whenever students database finishes loading from Supabase
  useEffect(() => {
    if (scannedText && scannedText.trim() && students && students.length > 0) {
      const processedList = extractAndMatchStudentsFromText(scannedText, students);
      setFoundStudentsList(processedList);
      setSearchCompleted(true);
    }
  }, [students]);

  const saveGeminiApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('acrs_gemini_api_key', key);
    setShowApiKeyModal(false);
  };

  // Perform Gemini AI Scan on File or Text
  const handleExecuteGeminiScan = async (targetFile?: File | null, textContent?: string) => {
    const fileToScan = targetFile || uploadedFileObj;
    const textToScan = textContent || scannedText;

    if (!fileToScan && (!textToScan || !textToScan.trim())) {
      alert("กรุณาเลือกไฟล์ PDF หรือวางข้อความประกาศผลก่อนเริ่มสแกนด้วย AI");
      return;
    }

    if (!geminiApiKey) {
      setShowApiKeyModal(true);
      return;
    }

    setIsProcessing(true);
    setSearchCompleted(false);
    setReadingStatus({ message: 'กำลังเชื่อมต่อ Google Gemini 1.5 Flash Vision AI...', percent: 20 });

    try {
      const result: GeminiScanResult = await scanDocumentWithGemini(
        fileToScan || textToScan,
        geminiApiKey,
        (statusMsg) => setReadingStatus({ message: statusMsg, percent: 60 })
      );

      setReadingStatus({ message: 'จับคู่รายชื่อกับฐานข้อมูลนักเรียน (5,721 คน)...', percent: 90 });

      if (result.competitionName) {
        setRecordMeta(prev => ({
          ...prev,
          competitionName: result.competitionName || prev.competitionName,
          academicYear: result.academicYear || prev.academicYear
        }));
      }

      // Match extracted students against database (5,721 students)
      const pool = students && students.length > 0 ? students : DEFAULT_STUDENTS;
      const matchedList: any[] = [];
      const seenIds = new Set<string>();

      if (result.students && Array.isArray(result.students)) {
        for (const st of result.students) {
          const schoolName = (st.school || '').trim();
          // Filter out candidates from other Assumption schools (e.g., อัสสัมชัญ บางรัก, อัสสัมชัญสมุทรปราการ)
          if (schoolName && schoolName.includes('อัสสัมชัญ') && !schoolName.includes('ธนบุรี') && !schoolName.includes('ACT') && !schoolName.includes('อสธ')) {
            console.log('Skipping non-ACT student from other school:', st.name, schoolName);
            continue;
          }

          const dbStudent = findMatchingStudent(st.name, pool);
          if (dbStudent && !seenIds.has(dbStudent.studentId)) {
            seenIds.add(dbStudent.studentId);
            matchedList.push({
              name: cleanAndNormalizeThaiName(dbStudent.name),
              cleanName: cleanAndNormalizeThaiName(dbStudent.name),
              subject: st.subject || 'ชีววิทยา (สอวน.)',
              award: st.award || 'ผ่านการคัดเลือก',
              isMatched: true,
              studentId: dbStudent.studentId,
              grade: dbStudent.grade,
              room: dbStudent.room,
              program: dbStudent.program,
              email: dbStudent.email || ''
            });
          } else if (!dbStudent && (!schoolName || schoolName.includes('ธนบุรี') || schoolName.includes('ACT') || schoolName.includes('อสธ'))) {
            // Include unmatched ACT candidate if school explicitly matches ACT
            matchedList.push({
              name: st.name,
              cleanName: st.name,
              subject: st.subject || 'ชีววิทยา (สอวน.)',
              award: st.award || 'ผ่านการคัดเลือก',
              isMatched: false,
              studentId: '',
              grade: st.grade || 'ม.5',
              room: '',
              program: 'Normal',
              email: ''
            });
          }
        }
      }

      setFoundStudentsList(matchedList);
      
      const summaryText = result.rawSummary ? `[สรุปผลจาก AI]: ${result.rawSummary}\n\n` : '';
      const jsonText = JSON.stringify(result, null, 2);
      if (!scannedText || scannedText.startsWith('[ไฟล์แนบ:')) {
        setScannedText(`${summaryText}รายชื่อที่ AI ตรวจพบ:\n${jsonText}`);
      }

      setSearchCompleted(true);
    } catch (err: any) {
      console.error('Gemini Scan Error:', err);
      alert('เกิดข้อผิดพลาดในการสแกนด้วย Gemini AI:\n' + err.message);
      if (err.message?.includes('API Key') || err.message?.includes('API_KEY')) {
        setShowApiKeyModal(true);
      }
    } finally {
      setIsProcessing(false);
      setIsFileReading(false);
    }
  };

  // Handle Real File Upload (PDF, TXT, CSV, Images)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadedFileObj(file);
      setIsFileReading(true);
      setSearchCompleted(false);

      if (scanEngine === 'gemini') {
        if (!geminiApiKey) {
          setShowApiKeyModal(true);
          setIsFileReading(false);
          return;
        }
        await handleExecuteGeminiScan(file);
        return;
      }

      // Fallback offline parser
      setReadingStatus({ message: 'กำลังอ่านไฟล์ ' + file.name + '...', percent: 15 });
      setScannedText('');

      try {
        let extracted = '';
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const arrayBuffer = await file.arrayBuffer();
          extracted = await extractTextFromPdf(arrayBuffer, (msg, pct) => {
            setReadingStatus({ message: msg, percent: pct });
          });
        } else if (file.type.startsWith('text/') || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.csv')) {
          extracted = await file.text();
        } else {
          extracted = `[ไฟล์แนบ: ${file.name}]\nสามารถพิมพ์หรือวางข้อความประกาศผลในช่องข้อความดิบด้านล่างเพื่อประมวลผลทันที`;
        }

        const source = {
          id: 'uploaded-file',
          name: file.name,
          fileName: file.name,
          rawText: extracted,
          description: extracted ? `สกัดข้อความสำเร็จ (${extracted.length} ตัวอักษร)` : 'อัปโหลดเรียบร้อย'
        };

        setSelectedSource(source);
        setScannedText(extracted);

        if (extracted) {
          if (extracted.includes('ชีววิทยา') && extracted.includes('สอวน')) {
            setRecordMeta(prev => ({ ...prev, competitionName: "การสอบคัดเลือกโอลิมปิกวิชาการค่ายที่ 1 สาขาวิชาชีววิทยา สอวน. ปีการศึกษา 2569" }));
          } else if (extracted.includes('โอลิมปิกวิชาการ') || extracted.includes('สอวน')) {
            setRecordMeta(prev => ({ ...prev, competitionName: "การแข่งขันคัดเลือกโอลิมปิกวิชาการ สอวน. ประจำปีการศึกษา 2569" }));
          }

          const pool = students && students.length > 0 ? students : DEFAULT_STUDENTS;
          const processedList = extractAndMatchStudentsFromText(extracted, pool);
          setFoundStudentsList(processedList);
          setSearchCompleted(true);
        }
      } catch (err: any) {
        console.error('File read error:', err);
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ PDF: ' + err.message);
      } finally {
        setIsFileReading(false);
      }
    }
  };

  // Load sample mock dataset for testing
  const handleLoadMockSource = (mockIndex: number) => {
    const mock = MOCK_SOURCES[mockIndex];
    setSelectedSource(mock);
    setScannedText(mock.rawText);
    
    if (mockIndex === 0) {
      setRecordMeta(prev => ({ ...prev, competitionName: "การแข่งขันคัดเลือกโอลิมปิกวิชาการ สอวน. ประจำปีการศึกษา 2569" }));
    } else if (mockIndex === 1) {
      setRecordMeta(prev => ({ ...prev, competitionName: "การประกวดสุนทรพจน์ภาษาอังกฤษระดับมัธยมศึกษา 2026" }));
    } else {
      setRecordMeta(prev => ({ ...prev, competitionName: "การพิจารณาทุนการเรียนดีเด่น ประจำปีการศึกษา 2569" }));
    }

    const pool = students && students.length > 0 ? students : DEFAULT_STUDENTS;
    const processedList = extractAndMatchStudentsFromText(mock.rawText, pool);
    setFoundStudentsList(processedList);
    setSearchCompleted(true);
  };

  const handleIdSearchAndExtract = () => {
    if (!scannedText || !scannedText.trim()) {
      alert("กรุณาอัปโหลดไฟล์ PDF หรือวางข้อความประกาศผลในกล่องข้อความดิบก่อนเริ่มประมวลผล");
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);
    setSearchCompleted(false);

    const textToProcess = scannedText;

    const interval = setInterval(() => {
      setProcessProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setSearchCompleted(true);

          // SMART MATCHING: ONLY RETURN MATCHED STUDENTS FROM DATABASE
          let processedList = extractAndMatchStudentsFromText(textToProcess, activeStudentsPool);

          // If activeSource had mock parsed students, match them strictly
          if (selectedSource?.parsedStudents && Array.isArray(selectedSource.parsedStudents)) {
            const existingStudentIds = new Set(processedList.map(s => s.studentId));

            selectedSource.parsedStudents.forEach((parsed: any) => {
              const dbStudent = findMatchingStudent(parsed.name, activeStudentsPool);
              if (dbStudent && !existingStudentIds.has(dbStudent.studentId)) {
                processedList.push({
                  name: cleanAndNormalizeThaiName(dbStudent.name),
                  cleanName: cleanAndNormalizeThaiName(dbStudent.name),
                  subject: parsed.subject || 'ชีววิทยา (สอวน.)',
                  award: parsed.award || 'ผ่านการคัดเลือก',
                  isMatched: true,
                  studentId: dbStudent.studentId,
                  grade: dbStudent.grade,
                  room: dbStudent.room,
                  program: dbStudent.program,
                  email: dbStudent.email || ''
                });
                existingStudentIds.add(dbStudent.studentId);
              }
            });
          }

          setFoundStudentsList(processedList);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleSaveSearchRecord = async () => {
    if (foundStudentsList.length === 0) {
      alert("ไม่พบรายการนักเรียนสำหรับบันทึก กรุณาเพิ่มหรือประมวลผลข้อมูลก่อน");
      return;
    }

    const newRecord = {
      title: recordMeta.competitionName,
      year: recordMeta.academicYear,
      notes: recordMeta.notes,
      sourceType: inputType,
      sourceName: inputType === 'url' ? (customUrl || selectedSource?.webUrl || 'เว็บไซต์ประกาศ') : (selectedSource?.fileName || selectedSource?.name || 'ไฟล์ประกาศ PDF'),
      recordedBy: role === 'academic' ? 'ฝ่ายวิชาการ' : 'ครูผู้ส่งผลงาน',
      students: foundStudentsList,
      status: "รออนุมัติจัดเก็บ"
    };

    await onSaveRecord(newRecord);
  };

  const editTemporaryItem = (index: number, field: string, value: string) => {
    const updated = [...foundStudentsList];
    updated[index][field] = value;

    // If studentId edited, attempt auto-match by ID
    if (field === 'studentId') {
      const match = activeStudentsPool.find(s => s.studentId === value.trim());
      if (match) {
        updated[index] = {
          ...updated[index],
          isMatched: true,
          name: cleanAndNormalizeThaiName(match.name),
          grade: match.grade,
          room: match.room,
          program: match.program,
          email: match.email || ''
        };
      }
    }

    // If name edited, attempt auto-match by Name
    if (field === 'name') {
      const match = findMatchingStudent(value, activeStudentsPool);
      if (match) {
        updated[index] = {
          ...updated[index],
          isMatched: true,
          name: cleanAndNormalizeThaiName(match.name),
          studentId: match.studentId,
          grade: match.grade,
          room: match.room,
          program: match.program,
          email: match.email || ''
        };
      }
    }

    setFoundStudentsList(updated);
  };

  const deleteTemporaryItem = (index: number) => {
    setFoundStudentsList(foundStudentsList.filter((_, i) => i !== index));
  };

  const addNewStudentRow = () => {
    const newItem = {
      name: "",
      subject: "ชีววิทยา (สอวน.)",
      award: "ผ่านการคัดเลือก ค่าย 1",
      isMatched: true,
      studentId: "",
      grade: "ม.4",
      room: "1",
      program: "Normal",
      email: ""
    };
    setFoundStudentsList([newItem, ...foundStudentsList]);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-900">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-2xs">
        
        <div className="mb-6 border-b border-slate-100 pb-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <span>ค้นหาและจับคู่นักเรียนในฐานข้อมูลโรงเรียน</span>
            </h3>
            <p className="text-base text-slate-500 mt-1">
              สแกนรายชื่อจากเอกสารประกาศผล และแสดงเฉพาะนักเรียนที่ตรงกับฐานข้อมูลของโรงเรียน ({activeStudentsPool.length} คน)
            </p>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            {/* Engine Selector */}
            <div className="bg-slate-100 p-1 rounded-lg border border-slate-200 flex items-center gap-1 shadow-3xs text-xs font-bold">
              <button
                type="button"
                onClick={() => setScanEngine('gemini')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  scanEngine === 'gemini' 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Bot size={14} />
                <span>Google Gemini 1.5 Flash AI</span>
                <span className="bg-amber-400 text-slate-900 text-[10px] px-1 py-0.2 rounded font-extrabold uppercase">แม่นยำ</span>
              </button>

              <button
                type="button"
                onClick={() => setScanEngine('offline')}
                className={`px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  scanEngine === 'offline' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Offline OCR</span>
              </button>
            </div>

            {/* API Key Config Button */}
            <button
              type="button"
              onClick={() => { setTempApiKey(geminiApiKey); setShowApiKeyModal(true); }}
              className={`text-xs px-2.5 py-1.5 rounded-lg border font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                geminiApiKey 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100 animate-pulse'
              }`}
              title="ตั้งค่า Gemini API Key"
            >
              <Key size={13} />
              <span>{geminiApiKey ? 'API Key พร้อมใช้' : 'ตั้งค่า API Key'}</span>
            </button>

            <div className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              ฐานข้อมูล: <strong className="text-slate-900">{activeStudentsPool.length} คน</strong>
            </div>
          </div>
        </div>

        {/* Stepper Header */}
        <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4 shadow-3xs">
          <span className="text-sm font-extrabold text-slate-400 uppercase tracking-wider">กระบวนการวิเคราะห์ผลงาน:</span>
          <div className="flex items-center gap-2 text-sm font-bold">
            <span className={`px-2.5 py-1 rounded transition-colors ${!searchCompleted && !isProcessing ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
              1. นำเข้าเอกสารประกาศ
            </span>
            <span className="text-slate-300">&rarr;</span>
            <span className={`px-2.5 py-1 rounded transition-colors ${isProcessing ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>
              2. ประมวลผลชื่อ-สกุล
            </span>
            <span className="text-slate-300">&rarr;</span>
            <span className={`px-2.5 py-1 rounded transition-colors ${searchCompleted ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
              3. ตรวจสอบรายชื่อที่พบ
            </span>
            <span className="text-slate-300">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-500">
              4. บันทึกผลงาน
            </span>
          </div>
        </div>

        {/* RECORD TITLE & YEAR META */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-8">
          <div className="md:col-span-6">
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">หัวข้อผลงาน / รายการประกวดที่ค้นพบ</label>
            <input 
              type="text" 
              value={recordMeta.competitionName}
              onChange={(e) => setRecordMeta({...recordMeta, competitionName: e.target.value})}
              className="w-full h-[42px] px-4 py-2 border border-slate-200 bg-transparent rounded-lg text-base focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
              placeholder="เช่น การสอบคัดเลือกโอลิมปิกวิชาการ สอวน."
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">ปีการศึกษา</label>
            <div className="relative">
              <select 
                value={recordMeta.academicYear}
                onChange={(e) => setRecordMeta({...recordMeta, academicYear: e.target.value})}
                className="appearance-none w-full h-[42px] px-4 pr-10 py-2 border border-slate-200 bg-white rounded-lg text-base focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-bold text-slate-700 cursor-pointer"
              >
                <option value="2569">2569 (ปีปัจจุบัน)</option>
                <option value="2568">2568</option>
                <option value="2567">2567</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
            </div>
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">หมายเหตุรายงานเพิ่มเติม</label>
            <input 
              type="text" 
              placeholder="ระบุข้อความ..."
              value={recordMeta.notes}
              onChange={(e) => setRecordMeta({...recordMeta, notes: e.target.value})}
              className="w-full h-[42px] px-4 py-2 border border-slate-200 bg-transparent rounded-lg text-base focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* FILE VS URL SELECTION TAB */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-3">
            <label className="block text-sm font-bold text-slate-500 uppercase tracking-wider">ช่องทางนำเข้าข้อมูลผลรางวัล</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">หรือทดลองข้อมูลตัวอย่าง:</span>
              <button
                onClick={() => handleLoadMockSource(0)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold transition border border-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles size={12} className="text-indigo-600" /> สอวน. ตัวอย่าง
              </button>
              <button
                onClick={() => handleLoadMockSource(1)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded font-bold transition border border-slate-200 flex items-center gap-1 cursor-pointer"
              >
                <BookOpen size={12} className="text-indigo-600" /> สุนทรพจน์
              </button>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-5 border border-slate-200 shadow-3xs">
            <button
              onClick={() => { setInputType('file'); setSearchCompleted(false); }}
              className={"px-5 py-1.5 rounded-md text-base font-bold transition-all cursor-pointer flex items-center gap-2 " + (inputType === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900')}
            >
              <FileText size={16} />
              อัปโหลดไฟล์ประกาศ (PDF, TXT, รูปภาพ)
            </button>
            <button
              onClick={() => { setInputType('url'); setSearchCompleted(false); }}
              className={"px-5 py-1.5 rounded-md text-base font-bold transition-all cursor-pointer flex items-center gap-2 " + (inputType === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900')}
            >
              <Globe size={16} />
              ระบุลิงก์เว็บไซต์ประกาศผล
            </button>
          </div>

          {inputType === 'file' ? (
            <div>
              <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100/80 transition-colors cursor-pointer relative">
                <input 
                  ref={fileInputRef}
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  accept=".pdf,text/plain,text/csv,image/*"
                  onChange={handleFileUpload}
                  disabled={isFileReading}
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                    {isFileReading ? (
                      <RefreshCw size={24} className="text-indigo-600 animate-spin" />
                    ) : (
                      <Upload size={24} className="text-indigo-600" />
                    )}
                  </div>
                  
                  {isFileReading ? (
                    <div className="flex flex-col items-center max-w-sm w-full gap-2">
                      <p className="text-base font-bold text-slate-900">{readingStatus.message}</p>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${readingStatus.percent}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-base font-bold text-slate-900 mb-1">
                        {selectedSource?.id === 'uploaded-file' ? selectedSource.name : 'คลิกเพื่อเลือกไฟล์ PDF ประกาศ หรือลากไฟล์มาวางที่นี่'}
                      </p>
                      <p className="text-sm text-slate-500 font-medium">
                        {selectedSource?.id === 'uploaded-file' 
                          ? `อ่านไฟล์สำเร็จ (${scannedText.length} ตัวอักษร) พร้อมทำการประมวลผล` 
                          : 'รองรับไฟล์ PDF (ระบบสกัดข้อความภาษาไทยและตารางทุกหน้า), TXT, CSV'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-5">
                <label className="block text-sm text-slate-500 font-bold uppercase tracking-wider mb-2">ระบุลิงก์ประกาศผลจากสมาคม หรือโรงเรียน:</label>
                <input 
                  type="text" 
                  placeholder="https://example.com/results"
                  value={customUrl}
                  onChange={(e) => { setCustomUrl(e.target.value); setSearchCompleted(false); }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-base focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* SCANNING WORKSPACE & RAW TEXT INSPECTOR */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-8 bg-white shadow-2xs">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex flex-wrap justify-between items-center gap-3">
            <span className="text-sm font-extrabold text-slate-600 uppercase tracking-widest flex items-center gap-2">
              <FileText size={16} className="text-slate-500" />
              ข้อความที่สกัดได้จากเอกสาร (RAW TEXT)
            </span>
            <div className="flex items-center flex-wrap gap-2">
              {/* Primary: Gemini AI Scan Button */}
              <button 
                onClick={() => handleExecuteGeminiScan()}
                disabled={isProcessing || isFileReading || (!uploadedFileObj && !scannedText.trim())}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm flex items-center gap-1.5"
                title="ใช้ Google Gemini 1.5 Flash Vision AI สแกนตารางและรายชื่อ ร.ร.อัสสัมชัญธนบุรี โดยตรง"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Gemini กำลังอ่านไฟล์...</span>
                  </>
                ) : (
                  <>
                    <Bot size={16} />
                    <span>สแกนด้วย Gemini AI</span>
                    <Sparkles size={14} className="text-amber-300" />
                  </>
                )}
              </button>

              {/* Secondary: Local Process Button */}
              <button 
                onClick={handleIdSearchAndExtract}
                disabled={isProcessing || isFileReading || !scannedText.trim()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-sm font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <span>เทียบชื่อธรรมดา (Local)</span>
              </button>
            </div>
          </div>

          <div className="p-6 bg-slate-50/40">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* RAW TEXT BOX */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    ข้อความดิบจากไฟล์ PDF (สามารถแก้ไข ลบ หรือวางข้อความเพิ่มได้)
                  </label>
                  <span className="text-xs font-semibold text-slate-400">
                    {scannedText.length} ตัวอักษร
                  </span>
                </div>
                <textarea 
                  value={scannedText}
                  onChange={(e) => {
                    setScannedText(e.target.value);
                    setSearchCompleted(false);
                  }}
                  placeholder="เมื่อเลือกไฟล์ PDF ข้อความจากเอกสารจะปรากฏที่นี่ หรือสามารถคัดลอกข้อความประกาศผลมาวางในช่องนี้ได้โดยตรง..."
                  rows={9}
                  className="w-full text-sm text-slate-800 bg-white p-3.5 border border-slate-200 rounded-lg font-mono focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-inner resize-y leading-relaxed"
                />
              </div>

              {/* LIVE CLASSIFICATION PREVIEW */}
              <div className="lg:col-span-6 flex flex-col">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    ผลการจำแนกเฉพาะนักเรียนที่ตรงกับฐานข้อมูล
                  </label>
                  {searchCompleted && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
                      พบในโรงเรียน {foundStudentsList.length} คน
                    </span>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg h-[210px] overflow-y-auto shadow-inner divide-y divide-slate-100 p-2">
                  {isProcessing && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-3">
                      <div className="flex justify-between w-full max-w-xs text-sm font-bold text-slate-700">
                        <span>กำลังเทียบชื่อ-สกุลกับฐานข้อมูล...</span>
                        <span>{processProgress}%</span>
                      </div>
                      <div className="w-full max-w-xs bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-slate-900 h-full transition-all duration-300" style={{ width: `${processProgress}%` }}></div>
                      </div>
                    </div>
                  )}

                  {!isProcessing && !searchCompleted && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                      <p className="text-sm font-bold text-slate-600">กดปุ่ม "เริ่มประมวลผลจากชื่อ" ด้านบน</p>
                      <p className="text-xs text-slate-500 mt-1">ระบบจะค้นหาเฉพาะชื่อ-สกุลนักเรียนที่มีอยู่ในฐานข้อมูลของโรงเรียน ({activeStudentsPool.length} คน)</p>
                    </div>
                  )}

                  {!isProcessing && searchCompleted && foundStudentsList.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                      <p className="text-sm font-bold text-slate-800">ไม่พบรายชื่อนักเรียนของโรงเรียนในเอกสารนี้</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        ไม่มีชื่อ-สกุลใดในเอกสารตรงกับฐานข้อมูลนักเรียน ({activeStudentsPool.length} คน) สามารถคลิก "เพิ่มรายชื่อ" ด้านล่างหากต้องการบันทึกด้วยตนเอง
                      </p>
                    </div>
                  )}

                  {!isProcessing && searchCompleted && foundStudentsList.length > 0 && (
                    foundStudentsList.map((st, idx) => (
                      <div key={idx} className="p-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{st.name}</p>
                            <p className="text-xs text-slate-500 truncate">{st.subject || st.award || 'ชีววิทยา (สอวน.)'}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="bg-slate-100 text-slate-800 font-mono text-xs px-2 py-0.5 rounded font-bold border border-slate-200">
                            {st.studentId}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            st.program === 'EP' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {st.program === 'EP' ? 'EP' : 'ปกติ'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS TABLE (Editable before Save) */}
        {searchCompleted && (
          <div className="animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">ตรวจทานและแก้ไขรายชื่อก่อนบันทึก</h4>
                <p className="text-sm text-slate-500 font-medium mt-0.5">
                  แสดงเฉพาะนักเรียนที่ตรงกับฐานข้อมูลโรงเรียน ({foundStudentsList.length} คน)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={addNewStudentRow}
                  className="px-3.5 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Plus size={16} />
                  เพิ่มรายชื่อ
                </button>
                <button 
                  onClick={handleSaveSearchRecord}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"
                >
                  บันทึกผลงานลงระบบ ({foundStudentsList.length})
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left text-base whitespace-nowrap">
                <thead className="bg-slate-50 text-sm font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3.5">สถานะ</th>
                    <th className="px-4 py-3.5">ชื่อ-สกุล (จากประกาศ/ค้นหา)</th>
                    <th className="px-4 py-3.5">รหัสประจำตัว / ห้อง</th>
                    <th className="px-4 py-3.5">หลักสูตร (Program)</th>
                    <th className="px-4 py-3.5">สาขา / รางวัล</th>
                    <th className="px-4 py-3.5 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {foundStudentsList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                        ไม่พบนักเรียนของโรงเรียนในเอกสารนี้ หากต้องการเพิ่มรายชื่อนักเรียนด้วยตนเอง คลิกปุ่ม "เพิ่มรายชื่อ"
                      </td>
                    </tr>
                  ) : (
                    foundStudentsList.map((st, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">
                            ✓ พบในฐานข้อมูล
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={st.name} 
                            placeholder="ระบุชื่อ-สกุลนักเรียน..."
                            onChange={(e) => editTemporaryItem(index, 'name', e.target.value)}
                            className="w-full min-w-[220px] px-3 py-1.5 border border-slate-200 hover:border-slate-300 focus-visible:border-slate-600 rounded-md focus-visible:outline-hidden transition bg-white text-base text-slate-900 font-semibold"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="text" 
                              value={st.studentId} 
                              placeholder="รหัส..."
                              onChange={(e) => editTemporaryItem(index, 'studentId', e.target.value)}
                              className="w-24 px-2 py-1.5 border border-slate-200 bg-slate-50 text-slate-900 rounded-md focus-visible:outline-hidden transition text-base font-bold text-center"
                            />
                            <span className="text-slate-300">/</span>
                            <input 
                              type="text" 
                              value={st.room || ''} 
                              placeholder="ห้อง"
                              onChange={(e) => editTemporaryItem(index, 'room', e.target.value)}
                              className="w-14 px-2 py-1.5 border border-slate-200 hover:border-slate-300 rounded-md focus-visible:outline-hidden transition bg-white text-base text-center text-slate-700 font-semibold"
                            />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={st.program || 'Normal'}
                            onChange={(e) => editTemporaryItem(index, 'program', e.target.value)}
                            className={"px-3 py-1.5 rounded-md border text-sm font-bold focus-visible:outline-hidden cursor-pointer " + (
                              st.program === 'EP' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 
                              st.program === 'Normal' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                            )}
                          >
                            <option value="Normal">Normal (ภาคปกติ)</option>
                            <option value="EP">EP (หลักสูตรอังกฤษ)</option>
                            <option value="Unknown">Unknown</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="text" 
                            value={st.subject || st.award || ''} 
                            placeholder="สาขา / รางวัล..."
                            onChange={(e) => editTemporaryItem(index, 'subject', e.target.value)}
                            className="w-full min-w-[140px] px-3 py-1.5 border border-slate-200 hover:border-slate-300 rounded-md focus-visible:outline-hidden transition bg-white text-base text-slate-700 font-medium"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button 
                            onClick={() => deleteTemporaryItem(index)}
                            className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer rounded hover:bg-rose-50"
                            title="ลบรายการนี้"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* GEMINI API KEY CONFIG MODAL */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">ตั้งค่า Google Gemini API Key</h3>
                  <p className="text-xs text-slate-500">สำหรับระบบสแกนเอกสาร PDF และรูปภาพด้วย Vision AI</p>
                </div>
              </div>
              <button 
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <Sparkles size={14} className="text-amber-600" />
                Google Gemini API ให้ใช้งานฟรี 1,500 ครั้ง/วัน
              </p>
              <p className="text-slate-600 leading-relaxed">
                คุณสามารถสร้าง API Key ฟรีได้จาก <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline hover:text-indigo-800">Google AI Studio (คลิกที่นี่)</a> ด้วยบัญชี Google
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                ระบุ Google Gemini API Key:
              </label>
              <div className="relative">
                <input 
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-xl font-mono text-sm focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-hidden text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                API Key จะถูกบันทึกไว้อย่างปลอดภัยในเบราว์เซอร์ของคุณ (LocalStorage)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowApiKeyModal(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  saveGeminiApiKey(tempApiKey.trim());
                  if (tempApiKey.trim() && uploadedFileObj) {
                    handleExecuteGeminiScan(uploadedFileObj);
                  }
                }}
                disabled={!tempApiKey.trim()}
                className="px-5 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
              >
                บันทึก API Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
