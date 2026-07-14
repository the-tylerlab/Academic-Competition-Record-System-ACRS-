import { useState } from 'react';
import { Lock, User, X, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (status: boolean) => void;
  onClose: () => void;
}

export default function Login({ onLogin, onClose }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      onLogin(true);
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 selection:bg-slate-900 selection:text-white animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-slate-200 overflow-hidden transform transition-all relative animate-modal-in">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 z-20 text-slate-400 hover:text-slate-900 transition-colors bg-white hover:bg-slate-100 p-1.5 rounded-full cursor-pointer"
        >
          <X size={20} strokeWidth={2.5} />
        </button>
        
        <div className="px-8 pt-10 pb-6 text-center border-b border-slate-100">
          <div className="mx-auto w-12 h-12 bg-slate-900 rounded-xl flex flex-col items-center justify-center mb-5">
            <span className="text-white text-lg font-black leading-none tracking-widest">ACRS</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">เข้าสู่ระบบผู้ดูแล</h2>
          <p className="text-slate-500 text-sm mt-1.5 font-medium">Academic Competition Record System</p>
        </div>
        
        <div className="p-8 bg-slate-50/50">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-white text-slate-800 text-sm font-medium p-3.5 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                <AlertCircle size={18} className="text-rose-500" strokeWidth={2.5} />
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">ชื่อผู้ใช้งาน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} strokeWidth={2} />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-colors font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">รหัสผ่าน</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} strokeWidth={2} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-base focus:bg-white focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-colors font-medium text-slate-900 placeholder:text-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 px-4 rounded-xl transition-all active:scale-[0.98] text-base mt-2 flex justify-center items-center shadow-sm"
            >
              เข้าสู่ระบบ
            </button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400 font-medium">เฉพาะเจ้าหน้าที่ฝ่ายวิชาการเท่านั้นที่มีสิทธิ์เข้าถึงข้อมูล</p>
          </div>
        </div>
      </div>
    </div>
  );
}
