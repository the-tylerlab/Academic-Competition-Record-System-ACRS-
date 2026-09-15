import { useState } from 'react';
import { Lock, User, X } from 'lucide-react';

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
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    if (cleanUser === 'admin' && (cleanPass === 'act2026' || cleanPass === 'admin1234' || cleanPass === 'admin123' || cleanPass === 'admin')) {
      onLogin(true);
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง (รหัสเริ่มต้น: admin / act2026)');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 selection:bg-slate-900 selection:text-white animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden relative animate-modal-in">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-md cursor-pointer"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2} />
        </button>
        
        <div className="px-8 pt-10 pb-6 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-col items-start">
            <div className="w-12 h-12 bg-slate-900 rounded-lg flex flex-col items-center justify-center shadow-sm mb-6">
              <span className="text-white text-lg font-black leading-none tracking-widest">ACRS</span>
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">เข้าสู่ระบบผู้ดูแล</h2>
            <p className="text-slate-500 text-base mt-2 font-medium leading-snug">
              Academic Competition Record System
            </p>
          </div>
        </div>
        
        <div className="p-8 bg-white">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-rose-50 text-rose-700 text-sm font-bold p-4 rounded-lg border border-rose-200">
                {error}
              </div>
            )}
            
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">ชื่อผู้ใช้งาน</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={18} strokeWidth={2} />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-slate-900 outline-none transition-colors font-medium bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="กรอกชื่อผู้ใช้"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">รหัสผ่าน</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} strokeWidth={2} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg text-base focus:ring-2 focus:ring-slate-900 outline-none transition-colors font-medium bg-slate-50 focus:bg-white text-slate-900 placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold py-3.5 px-4 rounded-lg shadow-sm hover:shadow transition-colors text-base mt-2"
            >
              เข้าสู่ระบบ
            </button>
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-sm text-slate-500 font-medium">
              เฉพาะเจ้าหน้าที่ฝ่ายวิชาการเท่านั้นที่มีสิทธิ์เข้าถึงข้อมูล
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
