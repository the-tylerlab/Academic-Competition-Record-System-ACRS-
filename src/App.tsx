import { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import Searcher from './components/Searcher';
import StudentManager from './components/StudentManager';
import { supabase } from './lib/supabase';
import { 
  BarChart, 
  Search, 
  Users,
  LogOut,
  Upload,
  X
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [role, setRole] = useState('academic'); // academic or teacher
  
  // Database states
  const [students, setStudents] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<null | 'uploading' | 'success'>(null);

  useEffect(() => {
    fetchStudents();
    fetchRecords();
  }, []);

  const fetchStudents = async () => {
    const { data, error } = await supabase.from('students').select('*');
    if (error) {
      console.error('Error fetching students:', error);
    } else {
      const mappedStudents = data.map(d => ({
        studentId: d.student_id,
        name: d.name,
        grade: d.grade,
        room: d.room,
        program: d.program,
        email: d.email,
        id: d.id
      }));
      setStudents(mappedStudents);
    }
  };

  const fetchRecords = async () => {
    const { data, error } = await supabase.from('records').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching records:', error);
    } else {
      setRecords(data || []);
    }
  };

  const stats = {
    totalStudents: students.length,
    epCount: students.filter(s => s.program === 'EP').length,
    normalCount: students.filter(s => s.program === 'Normal').length,
    totalRecords: records.length,
    pendingCount: records.filter(r => r.status === 'รออนุมัติจัดเก็บ').length,
  };

  const handleSaveRecord = async (newRecord: any) => {
    const dbRecord = {
      title: newRecord.title,
      year: newRecord.year,
      notes: newRecord.notes,
      source_type: newRecord.sourceType,
      source_name: newRecord.sourceName,
      recorded_by: newRecord.recordedBy,
      students: newRecord.students,
      status: newRecord.status
    };

    const { data, error } = await supabase.from('records').insert([dbRecord]).select();
    
    if (error) {
      console.error("Error saving record:", error);
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } else {
      if (data && data.length > 0) {
        setRecords([...records, data[0]]);
      } else {
        fetchRecords(); // Fallback if insert doesn't return data
      }
      alert("บันทึกข้อมูลผลงานลงฐานข้อมูลเรียบร้อยแล้ว");
      setActiveTab('dashboard');
    }
  };

  const handleSimulateImport = () => {
    setImportStatus('uploading');
    setTimeout(() => {
      setImportStatus('success');
      setTimeout(() => {
        setImportStatus(null);
        setShowImportModal(false);
      }, 1500);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-slate-900 selection:text-white text-base">
      
      {/* TOP NAVIGATION */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-6 py-4 flex justify-between items-center shadow-3xs">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-900 rounded-md flex flex-col items-center justify-center shadow-sm">
            <span className="text-white text-xs font-black leading-none tracking-widest">ACRS</span>
            <span className="text-slate-400 text-[8px] font-bold leading-none tracking-widest mt-0.5">SYSTEM</span>
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-lg tracking-tight leading-tight">ระบบจัดเก็บและคัดแยก<br/>ผลงานทางวิชาการ</h1>
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-full p-1.5 border border-slate-200">
            <button 
              onClick={() => {
                setRole('academic');
              }}
              className={"px-4 py-1.5 rounded-full text-xs font-bold transition-all " + (role === 'academic' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800')}
            >
              ฝ่ายวิชาการ (Admin)
            </button>
            <button 
              onClick={() => {
                setRole('teacher');
                if (activeTab === 'students') setActiveTab('searcher');
              }}
              className={"px-4 py-1.5 rounded-full text-xs font-bold transition-all " + (role === 'teacher' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800')}
            >
              ครูผู้สอน
            </button>
          </div>
          <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
          <button className="text-slate-400 hover:text-rose-600 transition-colors flex items-center gap-2">
            <LogOut size={18} strokeWidth={2.5} />
            <span className="text-sm font-bold hidden md:inline">ออกจากระบบ</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="flex h-[calc(100vh-72px)]">
        
        {/* SIDEBAR NAVIGATION - Increased width to md:w-64 */}
        <aside className="w-16 md:w-64 bg-white border-r border-slate-200 flex flex-col justify-between py-6 sticky top-[72px] h-full shadow-3xs z-30">
          <div className="px-4 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={"flex items-center gap-3 px-4 py-3 rounded-md transition-all group " + (
                activeTab === 'dashboard' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <BarChart size={18} strokeWidth={2.5} className={activeTab === 'dashboard' ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
              <span className="text-sm font-bold hidden md:block">ภาพรวมระบบ</span>
            </button>
            <button 
              onClick={() => setActiveTab('searcher')}
              className={"flex items-center gap-3 px-4 py-3 rounded-md transition-all group " + (
                activeTab === 'searcher' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
              )}
            >
              <Search size={18} strokeWidth={2.5} className={activeTab === 'searcher' ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
              <span className="text-sm font-bold hidden md:block">เครื่องมือสแกนหาเลขรหัส</span>
            </button>
            {role === 'academic' && (
              <button 
                onClick={() => setActiveTab('students')}
                className={"flex items-center gap-3 px-4 py-3 rounded-md transition-all group " + (
                  activeTab === 'students' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <Users size={18} strokeWidth={2.5} className={activeTab === 'students' ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'} />
                <span className="text-sm font-bold hidden md:block">ทำเนียบรายชื่อฐานข้อมูล</span>
              </button>
            )}
          </div>
          
          <div className="px-6 hidden md:block">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 shadow-inner">
              <p className="text-xs font-bold text-slate-500 mb-1.5">สิทธิ์การใช้งาน:</p>
              <p className="text-sm font-extrabold text-indigo-700 bg-indigo-50 inline-block px-2.5 py-1 rounded border border-indigo-100">
                {role === 'academic' ? 'ผู้ดูแลระบบ (Admin)' : 'ผู้บันทึกข้อมูล'}
              </p>
            </div>
          </div>
        </aside>

        {/* WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          
          <div className="max-w-6xl mx-auto">
            {activeTab === 'dashboard' && <Dashboard stats={stats} setActiveTab={setActiveTab} setShowImportModal={setShowImportModal} role={role} />}
            {activeTab === 'searcher' && <Searcher students={students} onSaveRecord={handleSaveRecord} role={role} />}
            {activeTab === 'students' && role === 'academic' && <StudentManager students={students} setStudents={setStudents} setShowImportModal={setShowImportModal} />}
          </div>

          {/* IMPORT MODAL */}
          {showImportModal && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-900 text-base">นำเข้าทำเนียบนักเรียน (Excel/CSV)</h3>
                  <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-900 transition p-1">
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </div>
                
                <div className="p-8">
                  {importStatus === 'success' ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <p className="font-bold text-slate-900 text-lg">อัปโหลดสำเร็จ</p>
                      <p className="text-sm text-slate-500 mt-2">อัปเดตฐานข้อมูลทำเนียบเรียบร้อยแล้ว</p>
                    </div>
                  ) : (
                    <>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center hover:border-slate-400 transition-colors bg-slate-50 cursor-pointer mb-6">
                        <Upload size={32} className="mx-auto text-slate-400 mb-4" />
                        <p className="text-sm font-bold text-slate-700">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                        <p className="text-xs text-slate-500 mt-2 font-medium">รองรับไฟล์ .xlsx, .csv (ขนาดไม่เกิน 5MB)</p>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-xs text-blue-800 leading-relaxed font-medium mb-6">
                        <strong className="font-bold text-sm block mb-1">คำแนะนำ:</strong> ไฟล์ควรมีคอลัมน์ เลขประจำตัว, ชื่อ-สกุล, ระดับชั้น, ห้อง, และแผนการเรียน (Normal/EP) เพื่อความแม่นยำในการคัดแยก
                      </div>

                      <button 
                        onClick={handleSimulateImport}
                        disabled={importStatus === 'uploading'}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-900/90 text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                      >
                        {importStatus === 'uploading' ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            กำลังประมวลผลไฟล์...
                          </>
                        ) : 'อัปโหลดและอัปเดตข้อมูล'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}