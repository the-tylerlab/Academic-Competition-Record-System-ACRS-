import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, X } from 'lucide-react';

interface CalendarEvent {
  id: string;
  title: string;
  department: string;
  date_text: string;
}

export default function AcademicCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [dateText, setDateText] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('created_at', { ascending: true });
        
      if (error) {
        // Table might not exist yet
        console.warn('Could not fetch calendar events, table might not exist.');
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const newEvent = {
        title,
        department,
        date_text: dateText
      };
      const { data, error } = await supabase.from('calendar_events').insert([newEvent]).select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setEvents([...events, data[0]]);
      } else {
        await fetchEvents();
      }
      
      // Reset form
      setTitle('');
      setDepartment('');
      setDateText('');
      setShowAddForm(false);
    } catch (err: any) {
      alert("เพิ่มกิจกรรมไม่สำเร็จ: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('คุณต้องการลบกิจกรรมนี้ใช่หรือไม่?')) {
      try {
        const { error } = await supabase.from('calendar_events').delete().eq('id', id);
        if (error) throw error;
        setEvents(events.filter(e => e.id !== id));
      } catch (err: any) {
        alert("ลบกิจกรรมไม่สำเร็จ: " + err.message);
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 lg:col-span-5 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] relative overflow-hidden">
      <div className="flex justify-between items-center mb-5">
        <h4 className="text-base font-bold text-slate-900">
          ปฏิทินปฏิบัติงานวิชาการ (2569)
        </h4>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 p-1.5 rounded-md transition-colors cursor-pointer"
          title="เพิ่มกิจกรรม"
        >
          {showAddForm ? <X size={16} strokeWidth={2.5} /> : <Plus size={16} strokeWidth={2.5} />}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEvent} className="mb-5 p-4 bg-slate-50 border border-slate-100 rounded-lg animate-fade-in space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อกิจกรรม</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-slate-900 bg-white" placeholder="เช่น ส่งรายงานผลสอบ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">ฝ่าย/ผู้รับผิดชอบ</label>
              <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-slate-900 bg-white" placeholder="เช่น ฝ่ายวิชาการ" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">กำหนดการ (Text)</label>
              <input type="text" required value={dateText} onChange={(e) => setDateText(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm outline-none focus:border-slate-900 bg-white" placeholder="เช่น 31 ต.ค. 69" />
            </div>
          </div>
          <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white text-sm font-semibold py-2 rounded-md hover:bg-slate-800 transition-colors mt-2 active:scale-[0.98] cursor-pointer shadow-sm">
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกกิจกรรม'}
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="py-4 text-center text-sm text-slate-500 font-medium">กำลังโหลดข้อมูล...</div>
      ) : events.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-500 bg-slate-50 rounded-lg border border-slate-100 border-dashed font-medium">
          ยังไม่มีกิจกรรมในปฏิทิน
        </div>
      ) : (
        <ul className="flex flex-col gap-4 text-base font-medium text-slate-700">
          {events.map((event, index) => (
            <li key={event.id || index} className="flex justify-between items-start border-b border-slate-100 pb-3 group">
              <div>
                <p className="font-bold text-slate-900 text-base flex items-center gap-2">
                  {event.title}
                  <button 
                    onClick={() => handleDelete(event.id)}
                    className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-600 transition-opacity p-1 cursor-pointer"
                    title="ลบ"
                  >
                    <Trash2 size={14} strokeWidth={2.5} />
                  </button>
                </p>
                <p className="text-sm text-slate-500 mt-0.5">{event.department}</p>
              </div>
              <span className="bg-slate-50 text-slate-800 text-sm px-2.5 py-1 rounded-md font-bold whitespace-nowrap border border-slate-200 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                {event.date_text}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
