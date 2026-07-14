import AcademicCalendar from './AcademicCalendar';

interface DashboardProps {
  stats: {
    totalStudents: number;
    epCount: number;
    normalCount: number;
    totalRecords: number;
    pendingCount: number;
  };
  setActiveTab: (tab: string) => void;
  setShowImportModal: (show: boolean) => void;
  role: string;
}

export default function Dashboard({ stats, setActiveTab, setShowImportModal, role }: DashboardProps) {
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-900">
      {/* HEADER DESC */}
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-2xs">
        <div className="max-w-3xl">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">ภาพรวมระบบ ACRS</h2>
          <p className="mt-2 text-base text-slate-500 leading-relaxed font-medium">
            ยินดีต้อนรับเข้าสู่ระบบจัดการข้อมูลรางวัลและการแข่งขันทางวิชาการ ระบบจะช่วยค้นหา รวบรวม และประมวลผลข้อมูล
            การแข่งขันของนักเรียน พร้อมแยกประเภทหลักสูตร (Normal / EP) แบบอัตโนมัติจากการประมวลผลข้อความภายนอก
          </p>
        </div>
      </div>

      {/* STATS COUNT GRID - shadcn flat style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-350 transition-colors">
          <p className="text-sm text-slate-400 font-extrabold uppercase tracking-widest">ทำเนียบรายชื่อสะสม</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{stats.totalStudents} <span className="text-base text-slate-400 font-medium">รายชื่อ</span></p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-350 transition-colors">
          <p className="text-sm text-slate-400 font-extrabold uppercase tracking-widest">หลักสูตรปกติ (Normal)</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{stats.normalCount} <span className="text-base text-slate-400 font-medium">คน</span></p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-350 transition-colors">
          <p className="text-sm text-slate-400 font-extrabold uppercase tracking-widest">แผนภาษาอังกฤษ (EP)</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{stats.epCount} <span className="text-base text-slate-400 font-medium">คน</span></p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-350 transition-colors">
          <p className="text-sm text-slate-400 font-extrabold uppercase tracking-widest">ประวัติคัดแยกที่บันทึก</p>
          <p className="text-4xl font-bold text-slate-900 mt-2">{stats.totalRecords} <span className="text-base text-slate-400 font-medium">รายการ</span></p>
        </div>
      </div>

      {/* QUICK ACTION CARDS */}
      <div>
        <h4 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest mb-4">ทางลัดจัดการระบบ (Quick Actions)</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Action 1: Search & Match */}
          <div 
            onClick={() => setActiveTab('searcher')}
            className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer transition-colors flex flex-col justify-between min-h-[160px]"
          >
            <div>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold border border-slate-200 text-base">
                &deg;
              </div>
              <h5 className="font-bold text-slate-900 text-base mt-4">เครื่องมือสแกนหาเลขรหัส</h5>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">สแกนชื่อนักเรียนจากเอกสาร หรือลิงก์เว็บผลรางวัล เพื่อเทียบค้นหาเลขประจำตัวและห้องเรียนทันที</p>
            </div>
            <span className="text-sm font-bold text-slate-800 mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              เข้าหน้าสแกน &rarr;
            </span>
          </div>

          {/* Admin Only Actions */}
          {role === 'academic' && (
            <>
              {/* Action 2: Import Files */}
              <div 
                onClick={() => setShowImportModal(true)}
                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer transition-colors flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold border border-slate-200 text-base">
                    &uarr;
                  </div>
                  <h5 className="font-bold text-slate-900 text-base mt-4">นำเข้าทะเบียนนักเรียนล่วงหน้า</h5>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">อัปโหลดไฟล์ Excel/CSV ข้อมูลทำเนียบล่วงหน้าเพื่อความถูกต้องในการจับคู่และคัดแยกรายชื่อ</p>
                </div>
                <span className="text-sm font-bold text-slate-800 mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  นำเข้าไฟล์ &rarr;
                </span>
              </div>

              {/* Action 3: Manage Database */}
              <div 
                onClick={() => setActiveTab('students')}
                className="group bg-white p-6 rounded-xl border border-slate-200 shadow-2xs hover:border-slate-400 cursor-pointer transition-colors flex flex-col justify-between min-h-[160px]"
              >
                <div>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center font-bold border border-slate-200 text-base">
                    &equiv;
                  </div>
                  <h5 className="font-bold text-slate-900 text-base mt-4">จัดการทำเนียบรายชื่อ</h5>
                  <p className="text-sm text-slate-500 mt-1.5 leading-relaxed font-medium">จัดการฐานข้อมูลรายชื่อนักเรียนที่มีประวัติ ค้นหา ลบ แก้ไขแผนการเรียนเพื่อป้องกันความซ้ำซ้อน</p>
                </div>
                <span className="text-sm font-bold text-slate-800 mt-4 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  เข้าหน้าทำเนียบ &rarr;
                </span>
              </div>
            </>
          )}

        </div>
      </div>

      {/* STATISTICAL REPORT AND GUIDELINES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Visual Ratio Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 lg:col-span-7 flex flex-col justify-between shadow-2xs">
          <div>
            <h4 className="text-base font-bold text-slate-900 mb-5">
              สัดส่วนนักเรียนแยกตามโครงการแผนการเรียน
            </h4>
            
            <div className="flex flex-col gap-5">
              <div>
                <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>ภาคปกติ (Normal Program)</span>
                  <span>{stats.normalCount} คน ({stats.totalStudents ? Math.round((stats.normalCount / stats.totalStudents) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-slate-900 h-full w-full transition-transform duration-300 origin-left" style={{ transform: `scaleX(${stats.totalStudents ? (stats.normalCount / stats.totalStudents) : 0})` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                  <span>หลักสูตรภาษาอังกฤษ (English Program - EP)</span>
                  <span>{stats.epCount} คน ({stats.totalStudents ? Math.round((stats.epCount / stats.totalStudents) * 100) : 0}%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200">
                  <div className="bg-slate-500 h-full w-full transition-transform duration-300 origin-left" style={{ transform: `scaleX(${stats.totalStudents ? (stats.epCount / stats.totalStudents) : 0})` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600 leading-relaxed border border-slate-200 font-medium">
            <strong className="text-slate-800">ข้อสังเกตเชิงนโยบาย:</strong> ข้อมูลสัดส่วนนี้จะช่วยให้ฝ่ายวิชาการสามารถประเมินสถิติการส่งโครงการและสัดส่วนนักเรียนระหว่าง ปกติ/EP เพื่อสนับสนุนงบจัดกิจกรรมสะสมพอร์ตได้เต็มประสิทธิภาพ
          </div>
        </div>

        {/* Guidelines & Deadlines Card */}
        <AcademicCalendar />

      </div>

    </div>
  );
}
