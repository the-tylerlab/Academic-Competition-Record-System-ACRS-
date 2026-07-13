import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface StudentManagerProps {
  students: any[];
  setStudents: (students: any[]) => void;
  setShowImportModal: (show: boolean) => void;
}

export default function StudentManager({ students, setStudents, setShowImportModal }: StudentManagerProps) {
  const [filterProgram, setFilterProgram] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // States for Add/Edit Student
  const [showFormModal, setShowFormModal] = useState(false);
  const [formData, setFormData] = useState({ id: '', studentId: '', name: '', grade: 'ม.4', room: '1', program: 'Normal', email: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const filteredStudents = students.filter(s => {
    const matchProg = filterProgram === 'all' || s.program === filterProgram;
    const matchSearch = s.name.includes(searchTerm) || s.studentId.includes(searchTerm);
    return matchProg && matchSearch;
  });

  const handleDelete = async (id: string, dbId: string) => {
    if(confirm('ยืนยันการลบนักเรียนรหัส ' + id + ' ?')) {
      const { error } = await supabase.from('students').delete().eq('id', dbId);
      if (error) {
        alert("ลบข้อมูลไม่สำเร็จ: " + error.message);
      } else {
        setStudents(students.filter(s => s.studentId !== id));
      }
    }
  };

  const handleClearAll = async () => {
    if(confirm('⚠️ คำเตือน: ยืนยันการล้างข้อมูลนักเรียนทั้งหมดในระบบหรือไม่? (ข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้)')) {
      // Use neq on a dummy UUID to delete all rows safely in Supabase
      const { error } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        alert("ล้างข้อมูลไม่สำเร็จ: " + error.message);
      } else {
        setStudents([]);
      }
    }
  };

  const handleOpenAddForm = () => {
    setFormData({ id: '', studentId: '', name: '', grade: 'ม.4', room: '1', program: 'Normal', email: '' });
    setIsEditing(false);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (student: any) => {
    setFormData({ 
      id: student.id, 
      studentId: student.studentId, 
      name: student.name, 
      grade: student.grade, 
      room: student.room, 
      program: student.program, 
      email: student.email 
    });
    setIsEditing(true);
    setShowFormModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    const studentToSave = {
      student_id: formData.studentId,
      name: formData.name,
      grade: formData.grade,
      room: formData.room,
      program: formData.program,
      email: formData.email
    };

    if (isEditing) {
      // Update
      const { data, error } = await supabase.from('students').update(studentToSave).eq('id', formData.id).select();
      if (error) {
        alert("แก้ไขข้อมูลไม่สำเร็จ: " + error.message);
      } else if (data && data.length > 0) {
        const updatedStudent = { ...formData };
        setStudents(students.map(s => s.id === formData.id ? updatedStudent : s));
        setShowFormModal(false);
      }
    } else {
      // Insert
      const { data, error } = await supabase.from('students').insert([studentToSave]).select();
      if (error) {
        alert("เพิ่มข้อมูลไม่สำเร็จ: " + error.message);
      } else if (data && data.length > 0) {
        const newStudent = { ...formData, id: data[0].id };
        setStudents([...students, newStudent]);
        setShowFormModal(false);
      }
    }
    
    setIsSaving(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-900">
      <div className="bg-white p-6 md:p-8 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-5 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">ทำเนียบรายชื่อฐานข้อมูล</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">จัดการข้อมูลนักเรียนที่มีในระบบ (นำเข้าจากฝ่ายทะเบียน)</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={handleClearAll}
              className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-sm font-bold transition-colors cursor-pointer flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
              ล้างข้อมูล
            </button>
            <button 
              onClick={handleOpenAddForm}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              เพิ่มนักเรียน
            </button>
            <button 
              onClick={() => setShowImportModal(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-900/90 text-white rounded-lg text-sm font-bold transition-colors cursor-pointer shadow-sm flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
              นำเข้าไฟล์ข้อมูล
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              <input 
                type="text" 
                placeholder="ค้นหารหัสประจำตัว หรือ ชื่อ-สกุล..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden transition shadow-3xs outline-none bg-slate-50 focus-visible:bg-white font-medium text-slate-900"
              />
            </div>
          </div>
          <select
            value={filterProgram}
            onChange={(e) => setFilterProgram(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 bg-white focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-hidden shadow-3xs cursor-pointer"
          >
            <option value="all">ทุกแผนการเรียน</option>
            <option value="Normal">ภาคปกติ (Normal)</option>
            <option value="EP">ภาคภาษาอังกฤษ (EP)</option>
          </select>
        </div>

        {/* Table */}
        <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-xs font-extrabold text-slate-500 uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">รหัสประจำตัว</th>
                <th className="px-6 py-4">ชื่อ-นามสกุล</th>
                <th className="px-6 py-4">ห้องเรียน</th>
                <th className="px-6 py-4">แผนการเรียน</th>
                <th className="px-6 py-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700 bg-white">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <p className="font-bold text-sm">ไม่พบข้อมูลนักเรียน</p>
                    <p className="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือนำเข้าข้อมูลใหม่</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((st, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900">{st.studentId}</td>
                    <td className="px-6 py-4">{st.name}</td>
                    <td className="px-6 py-4">
                      {st.grade !== 'ไม่ระบุ' && !st.room.includes(st.grade) ? `${st.grade}/${st.room}` : st.room}
                    </td>
                    <td className="px-6 py-4">
                      <span className={"px-3 py-1 rounded-md text-xs font-bold border " + (
                        st.program === 'EP' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      )}>
                        {st.program === 'EP' ? 'EP' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleOpenEditForm(st)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 font-bold text-xs uppercase mr-2 tracking-wider cursor-pointer"
                      >
                        แก้ไข
                      </button>
                      <button 
                        onClick={() => handleDelete(st.studentId, st.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 font-bold text-xs uppercase tracking-wider cursor-pointer"
                      >
                        ลบ
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-xs font-bold text-slate-500">
            <span>แสดง {filteredStudents.length} จาก {students.length} รายการ</span>
            <div className="flex gap-1">
              <button className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-white transition-colors bg-slate-100 text-slate-400 cursor-not-allowed">ก่อนหน้า</button>
              <button className="px-3 py-1.5 border border-slate-200 rounded-md hover:bg-white transition-colors bg-white text-slate-900 shadow-3xs">ถัดไป</button>
            </div>
          </div>
        </div>

      </div>

      {/* Add/Edit Student Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 text-base">{isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มรายชื่อนักเรียน'}</h3>
              <button onClick={() => setShowFormModal(false)} className="text-slate-400 hover:text-slate-900 transition p-1 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <form onSubmit={handleSaveStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">รหัสประจำตัว</label>
                  <input type="text" required value={formData.studentId} onChange={(e) => setFormData({...formData, studentId: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น 10001" disabled={isEditing} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ชื่อ-นามสกุล</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น นายสมชาย ใจดี" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ระดับชั้น</label>
                    <input type="text" required value={formData.grade} onChange={(e) => setFormData({...formData, grade: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น ม.4" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">ห้อง</label>
                    <input type="text" required value={formData.room} onChange={(e) => setFormData({...formData, room: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="เช่น 1" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">แผนการเรียน</label>
                    <select value={formData.program} onChange={(e) => setFormData({...formData, program: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                      <option value="Normal">Normal</option>
                      <option value="EP">EP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">อีเมล</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="email@school.ac.th" />
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                  ยกเลิก
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 bg-slate-900 hover:bg-slate-900/90 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-sm">
                  {isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
