import { useState } from 'react';
import { Upload } from 'lucide-react';
import { MOCK_SOURCES } from '../mockData';

interface SearcherProps {
  students: any[];
  onSaveRecord: (record: any) => Promise<void>;
  role: string;
}

export default function Searcher({ students, onSaveRecord, role }: SearcherProps) {
  const [selectedSource, setSelectedSource] = useState<any>(MOCK_SOURCES[0]);
  const [inputType, setInputType] = useState('file'); // 'file' or 'url'
  const [customUrl, setCustomUrl] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [searchCompleted, setSearchCompleted] = useState(false);
  
  const [scannedText, setScannedText] = useState('');
  const [foundStudentsList, setFoundStudentsList] = useState<any[]>([]);
  
  const [recordMeta, setRecordMeta] = useState({
    competitionName: "การแข่งขันทักษะทางวิชาการปีการศึกษา 2569",
    academicYear: "2569",
    notes: ""
  });

  const handleIdSearchAndExtract = () => {
    setIsProcessing(true);
    setProcessProgress(0);
    setSearchCompleted(false);

    let activeSource = selectedSource;
    if (inputType === 'url' && customUrl.trim() !== '') {
      const matchedSource = MOCK_SOURCES.find(s => s.sourceType === 'url');
      if (matchedSource) {
        activeSource = matchedSource;
      }
    }

    const interval = setInterval(() => {
      setProcessProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsProcessing(false);
          setSearchCompleted(true);
          setScannedText(activeSource.rawText);

          // MATCHING & CURRICULUM CLASSIFICATION PROCESS
          const processedList = activeSource.parsedStudents.map((parsed: any) => {
            const dbStudent = students.find(s => 
              s.name.includes(parsed.name) || parsed.name.includes(s.name)
            );

            if (dbStudent) {
              return {
                ...parsed,
                isMatched: true,
                studentId: dbStudent.studentId,
                grade: dbStudent.grade,
                room: dbStudent.room,
                program: dbStudent.program, 
                email: dbStudent.email
              };
            } else {
              return {
                ...parsed,
                isMatched: false,
                studentId: "ไม่พบข้อมูล",
                grade: "N/A",
                room: "N/A",
                program: "Unknown",
                email: "N/A"
              };
            }
          });

          setFoundStudentsList(processedList);
          return 100;
        }
        return prev + 25;
      });
    }, 200);
  };

  const handleSaveSearchRecord = async () => {
    const newRecord = {
      title: recordMeta.competitionName,
      year: recordMeta.academicYear,
      notes: recordMeta.notes,
      sourceType: inputType,
      sourceName: inputType === 'url' ? (customUrl || selectedSource.webUrl) : selectedSource.fileName,
      recordedBy: role === 'academic' ? 'ฝ่ายวิชาการ' : 'ครูผู้ส่งผลงาน',
      students: foundStudentsList,
      status: "รออนุมัติจัดเก็บ"
    };

    await onSaveRecord(newRecord);
  };

  const editTemporaryItem = (index: number, field: string, value: string) => {
    const updated = [...foundStudentsList];
    updated[index][field] = value;

    if (field === 'studentId') {
      const match = students.find(s => s.studentId === value);
      if (match) {
        updated[index] = {
          ...updated[index],
          isMatched: true,
          name: match.name,
          grade: match.grade,
          room: match.room,
          program: match.program,
          email: match.email
        };
      }
    }
    setFoundStudentsList(updated);
  };

  const deleteTemporaryItem = (index: number) => {
    setFoundStudentsList(foundStudentsList.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-900">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-2xs">
        
        <div className="mb-6 border-b border-slate-100 pb-5">
          <h3 className="text-lg font-bold text-slate-900">ค้นหาเลขประจำตัวและจัดแยกหลักสูตร</h3>
          <p className="text-sm text-slate-500 mt-1">สแกนชื่อนักเรียนจากรูปภาพ ไฟล์เอกสาร หรือลิงก์ประกาศผลลัพธ์เพื่อเทียบหาเลขประจำตัวและห้องเรียนทันที</p>
        </div>

        {/* Stepper Header for Scanned Searcher */}
        <div className="mb-8 bg-slate-50 border border-slate-200 rounded-lg p-4 flex items-center justify-between flex-wrap gap-4 shadow-3xs">
          <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">กระบวนการวิเคราะห์ผลงาน:</span>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`px-2.5 py-1 rounded transition-colors ${!searchCompleted && !isProcessing ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>1. ตั้งค่าแหล่งข้อมูล</span>
            <span className="text-slate-300">&rarr;</span>
            <span className={`px-2.5 py-1 rounded transition-colors ${isProcessing ? 'bg-slate-900 text-white animate-pulse' : 'bg-slate-200 text-slate-500'}`}>2. ค้นหาคำรหัส</span>
            <span className="text-slate-300">&rarr;</span>
            <span className={`px-2.5 py-1 rounded transition-colors ${searchCompleted ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>3. จับคู่ &amp; ตรวจทาน</span>
            <span className="text-slate-300">&rarr;</span>
            <span className="px-2.5 py-1 rounded bg-slate-200 text-slate-500">4. บันทึกผลสำเร็จ</span>
          </div>
        </div>

        {/* RECORD TITLE & YEAR META */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">หัวข้อผลงาน / รายการประกวดที่ค้นพบ</label>
            <input 
              type="text" 
              value={recordMeta.competitionName}
              onChange={(e) => setRecordMeta({...recordMeta, competitionName: e.target.value})}
              className="w-full h-[42px] px-4 py-2 border border-slate-200 bg-transparent rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">ปีการศึกษา</label>
            <select 
              value={recordMeta.academicYear}
              onChange={(e) => setRecordMeta({...recordMeta, academicYear: e.target.value})}
              className="w-full h-[42px] px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-bold text-slate-700 cursor-pointer"
            >
              <option value="2569">2569 (ปีปัจจุบัน)</option>
              <option value="2568">2568</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">หมายเหตุรายงานเพิ่มเติม (ทางเลือก)</label>
            <input 
              type="text" 
              placeholder="ระบุข้อความ..."
              value={recordMeta.notes}
              onChange={(e) => setRecordMeta({...recordMeta, notes: e.target.value})}
              className="w-full h-[42px] px-4 py-2 border border-slate-200 bg-transparent rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
            />
          </div>
        </div>

        {/* FILE VS URL SELECTION TAB */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">ช่องทางนำเข้าข้อมูลผลรางวัล</label>
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit mb-5 border border-slate-200 shadow-3xs">
            <button
              onClick={() => { setInputType('file'); setSearchCompleted(false); }}
              className={"px-5 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer " + (inputType === 'file' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900')}
            >
              อัปโหลดไฟล์ประกาศ
            </button>
            <button
              onClick={() => { setInputType('url'); setSearchCompleted(false); }}
              className={"px-5 py-1.5 rounded-md text-sm font-bold transition-all cursor-pointer " + (inputType === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-900')}
            >
              ระบุลิงก์เว็บไซต์ประกาศผล
            </button>
          </div>

          {inputType === 'file' ? (
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">อัปโหลดไฟล์ประกาศผล (PDF, JPG, PNG):</p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      const file = e.target.files[0];
                      // Use mock source 0 but override the filename
                      const source = { ...MOCK_SOURCES[0], id: 'uploaded-file', name: file.name, fileName: file.name, description: 'อัปโหลดสำเร็จ พร้อมทำการสแกน' };
                      setSelectedSource(source);
                      setSearchCompleted(false);
                    }
                  }}
                />
                <div className="flex flex-col items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                    <Upload size={24} className="text-indigo-600" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1">
                    {selectedSource.id === 'uploaded-file' ? selectedSource.name : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    {selectedSource.id === 'uploaded-file' ? 'ไฟล์ถูกอัปโหลดเรียบร้อยแล้ว' : 'รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-5">
                <label className="block text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">ระบุลิงก์ประกาศผลจากสมาคม หรือโรงเรียน:</label>
                <input 
                  type="text" 
                  placeholder="ระบุ URL..."
                  value={customUrl}
                  onChange={(e) => { setCustomUrl(e.target.value); setSearchCompleted(false); }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-2xs outline-none font-semibold text-slate-800"
                />
              </div>
            </div>
          )}
        </div>

        {/* SCANNING WORKSPACE */}
        <div className="border border-slate-200 rounded-xl overflow-hidden mb-8 bg-white shadow-2xs">
          <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">
              {inputType === 'file' ? 'ระบบประมวลผลและสกัดข้อมูลจากเอกสาร' : 'ระบบประมวลผลและดึงข้อมูลจากลิงก์เว็บ'}
            </span>
            <button 
              onClick={handleIdSearchAndExtract}
              disabled={isProcessing}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-900/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {isProcessing ? 'กำลังวิเคราะห์ผล...' : 'เริ่มประมวลคำรหัส'}
            </button>
          </div>

          <div className="p-8 min-h-[200px] flex flex-col items-center justify-center relative bg-slate-50/30">
            {!isProcessing && !searchCompleted && (
              <div className="text-center">
                <p className="text-sm font-bold text-slate-600">พร้อมประมวลผลข้อมูล</p>
                <p className="text-xs text-slate-500 mt-2 font-semibold">
                  {inputType === 'file' 
                    ? `เอกสาร: ${selectedSource.fileName}` 
                    : `ลิงก์เป้าหมาย: ${customUrl || selectedSource.webUrl}`
                  }
                </p>
              </div>
            )}

            {isProcessing && (
              <div className="text-center w-full max-w-md flex flex-col gap-3">
                <div className="flex justify-between text-sm font-bold text-slate-700">
                  <span>กำลังดึงชื่อพร้อมค้นหาข้อมูลรหัสในทำเนียบ...</span>
                  <span>{processProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                  <div className="bg-slate-900 h-full transition-all" style={{ width: (processProgress) + "%" }}></div>
                </div>
              </div>
            )}

            {searchCompleted && (
              <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-3">ข้อความดิบที่แยกได้ (RAW TEXT)</h4>
                  <pre className="text-xs text-slate-700 bg-white p-4 border border-slate-200 rounded-lg h-[240px] overflow-y-auto whitespace-pre-wrap font-mono shadow-inner">
                    {scannedText}
                  </pre>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest">จำแนกเป้าหมายหลักสูตร</h4>
                    <span className="text-xs bg-slate-900 text-white px-2.5 py-1 rounded-md font-bold">{foundStudentsList.length} รายการ</span>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-lg h-[240px] overflow-y-auto shadow-inner divide-y divide-slate-100">
                    {foundStudentsList.map((st, idx) => (
                      <div key={idx} className="p-3.5 hover:bg-slate-50 transition-colors flex gap-3">
                        <div className="pt-0.5">
                          {st.isMatched ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center border border-emerald-200 text-xs font-bold">✓</div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center border border-rose-200 text-xs font-bold">!</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{st.name}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2 font-medium">
                            {st.isMatched ? (
                              <>
                                <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs border border-slate-200">{st.studentId}</span>
                                <span className={"px-2 py-0.5 rounded-md text-xs border " + (
                                  st.program === 'EP' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}>
                                  {st.program === 'EP' ? 'EP (หลักสูตรอังกฤษ)' : 'Normal (ภาคปกติ)'}
                                </span>
                              </>
                            ) : (
                              <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md text-xs border border-rose-200">ไม่พบในฐานข้อมูล</span>
                            )}
                            <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded-md text-xs border border-slate-200 truncate max-w-[150px]">{st.subject || st.award}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RESULTS TABLE (Editable before Save) */}
        {searchCompleted && foundStudentsList.length > 0 && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h4 className="text-base font-bold text-slate-900">ตรวจทานและแก้ไขก่อนบันทึก</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">คุณสามารถแก้ไขรหัสประจำตัว แผนการเรียน หรือลบรายการที่ไม่ต้องการได้</p>
              </div>
              <button 
                onClick={handleSaveSearchRecord}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-900/90 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"
              >
                บันทึกผลงานลงระบบ
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-x-auto bg-white shadow-2xs">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-4">สถานะค้นหา</th>
                    <th className="px-5 py-4">ชื่อ-สกุล (จากประกาศ)</th>
                    <th className="px-5 py-4">รหัสประจำตัว / ห้อง</th>
                    <th className="px-5 py-4">หลักสูตร (Program)</th>
                    <th className="px-5 py-4">สาขา / รางวัล</th>
                    <th className="px-5 py-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {foundStudentsList.map((st, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        {st.isMatched ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-bold border border-emerald-200">
                            ✓ พบข้อมูล
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md text-xs font-bold border border-rose-200">
                            ! ไม่พบข้อมูล
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <input 
                          type="text" 
                          value={st.name} 
                          onChange={(e) => editTemporaryItem(index, 'name', e.target.value)}
                          className="w-full px-3 py-1.5 border border-transparent hover:border-slate-200 focus-visible:border-slate-400 rounded-md focus-visible:outline-hidden transition bg-transparent focus-visible:bg-white text-sm text-slate-900"
                        />
                      </td>
                      <td className="px-5 py-3 flex items-center gap-1.5">
                        <input 
                          type="text" 
                          value={st.studentId} 
                          onChange={(e) => editTemporaryItem(index, 'studentId', e.target.value)}
                          className={"w-24 px-2 py-1.5 border rounded-md focus-visible:outline-hidden transition text-sm font-bold text-center " + (
                            st.isMatched ? 'border-transparent hover:border-slate-200 bg-transparent focus-visible:bg-white text-slate-900' : 'border-rose-200 bg-rose-50 text-rose-700'
                          )}
                        />
                        <span className="py-1.5 text-slate-300">/</span>
                        <input 
                          type="text" 
                          value={st.room} 
                          onChange={(e) => editTemporaryItem(index, 'room', e.target.value)}
                          className="w-14 px-2 py-1.5 border border-transparent hover:border-slate-200 focus-visible:border-slate-400 rounded-md focus-visible:outline-hidden transition bg-transparent focus-visible:bg-white text-sm text-center text-slate-700"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={st.program}
                          onChange={(e) => editTemporaryItem(index, 'program', e.target.value)}
                          className={"px-3 py-1.5 rounded-md border text-xs font-bold focus-visible:outline-hidden cursor-pointer " + (
                            st.program === 'EP' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 
                            st.program === 'Normal' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-600'
                          )}
                        >
                          <option value="Normal">Normal</option>
                          <option value="EP">EP</option>
                          <option value="Unknown">Unknown</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <input 
                          type="text" 
                          value={st.subject || st.award || ''} 
                          onChange={(e) => editTemporaryItem(index, 'subject', e.target.value)}
                          className="w-full min-w-[140px] px-3 py-1.5 border border-transparent hover:border-slate-200 focus-visible:border-slate-400 rounded-md focus-visible:outline-hidden transition bg-transparent focus-visible:bg-white text-sm text-slate-700"
                        />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button 
                          onClick={() => deleteTemporaryItem(index)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 cursor-pointer"
                          title="ลบรายการนี้"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
