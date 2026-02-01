
import React, { useState, useRef } from 'react';
import { Lock, User as UserIcon, AlertCircle, Zap, Info, RotateCcw, ShieldCheck, Database, Cloud } from 'lucide-react';
import { Language } from '../types';
import { APP_NAME, STORAGE_KEY, DEPLOY_NODE } from '../constants';

interface LoginProps {
  onLogin: (username: string, password: string) => boolean;
  language: Language;
  t: (key: string) => string;
}

export const Login: React.FC<LoginProps> = ({ onLogin, t }) => {
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState(''); 
  const [error, setError] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError('');
    
    // 极致清理：去除所有不可见字符和首尾空格
    const cleanInput = (val: string) => val.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    const finalU = cleanInput(userRef.current?.value || username);
    const finalP = cleanInput(passRef.current?.value || password);

    setTimeout(() => {
      if (onLogin(finalU, finalP)) {
        setError('');
      } else {
        setError('Login sequence failed: Identity or Key mismatch');
      }
      setIsConnecting(false);
    }, 600);
  };

  const forceResetData = () => {
    if (confirm("⚠️ SYSTEM DATA RESET. This will wipe the local cache and restore default settings. Cloud data remains on Supabase. Proceed?")) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#0F172A] flex items-center justify-center p-3 sm:p-6 relative overflow-auto font-['Inter']">
      {/* 视觉背景特效 */}
      <div className="absolute top-1/4 left-1/4 w-[200px] sm:w-[500px] h-[200px] sm:h-[500px] bg-[#A3E635]/5 rounded-full blur-[80px] sm:blur-[120px] -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[200px] sm:w-[500px] h-[200px] sm:h-[500px] bg-[#818CF8]/5 rounded-full blur-[80px] sm:blur-[120px] -z-10"></div>

      <div className="premium-card w-full max-w-md p-4 sm:p-8 lg:p-10 space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-700 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative my-auto">
        {/* 部署节点标签 */}
        <div className="absolute top-3 right-4 sm:top-5 sm:right-6 flex items-center gap-2 opacity-30">
          <Database size={10} className="text-slate-500 shrink-0" />
          <span className="text-[7px] sm:text-[8px] font-black text-slate-500 tracking-widest uppercase truncate">{DEPLOY_NODE}</span>
        </div>

        <div className="flex flex-col items-center text-center pt-1">
          <div className="bg-[#A3E635] p-2.5 sm:p-4 rounded-xl sm:rounded-3xl shadow-[0_0_40px_rgba(163,230,53,0.3)] mb-3 sm:mb-5">
            <Zap className={`w-5 h-5 sm:w-7 sm:h-7 text-slate-950 ${isConnecting ? 'animate-pulse' : ''}`} />
          </div>
          <h1 className="text-xl sm:text-4xl font-black text-white tracking-tighter uppercase leading-none">{APP_NAME}</h1>
          <p className="text-[6px] sm:text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1 sm:mt-2 italic">Autonomous Protocol Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-3 sm:space-y-5" noValidate>
          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('identifier')}</label>
            <div className="relative group">
              <UserIcon className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-600 group-focus-within:text-[#A3E635] transition-colors shrink-0" />
              <input 
                ref={userRef}
                name="auth_user"
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                className="w-full bg-slate-900/80 border border-white/5 rounded-xl sm:rounded-2xl pl-11 sm:pl-14 pr-4 py-3 sm:py-4 text-[11px] sm:text-xs font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 shadow-inner transition-all" 
                placeholder="USERNAME" 
                required 
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('security_key')}</label>
            <div className="relative group">
              <Lock className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 w-3.5 sm:w-4 h-3.5 sm:h-4 text-slate-600 group-focus-within:text-[#A3E635] transition-colors shrink-0" />
              <input 
                ref={passRef}
                name="auth_key"
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full bg-slate-900/80 border border-white/5 rounded-xl sm:rounded-2xl pl-11 sm:pl-14 pr-4 py-3 sm:py-4 text-[11px] sm:text-xs font-black uppercase tracking-widest text-white outline-none focus:border-[#A3E635]/40 shadow-inner transition-all" 
                placeholder="••••••" 
                required 
                autoComplete="current-password"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 text-red-400 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex flex-col gap-2 text-[7px] sm:text-[8px] font-black border border-red-500/20 animate-in fade-in zoom-in-95 uppercase tracking-widest shadow-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <AlertCircle size={11} className="shrink-0 sm:w-3 sm:h-3" />
                <span className="break-words">{error}</span>
              </div>
            </div>
          )}

          <div className="bg-white/5 p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/5">
             <div className="flex items-start gap-2 sm:gap-3">
                <Cloud size={11} className="text-[#A3E635] mt-0.5 shrink-0" />
                <p className="text-[6px] sm:text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
                  CLOUD SYNC ACTIVE: Supabase Cloud Infrastructure.
                </p>
             </div>
          </div>

          <button 
            type="submit" 
            disabled={isConnecting}
            className={`w-full bg-white text-slate-950 font-black py-3.5 sm:py-5 rounded-xl sm:rounded-2xl shadow-2xl hover:bg-[#A3E635] transform active:scale-[0.98] transition-all uppercase text-[10px] sm:text-[11px] tracking-[0.3em] ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isConnecting ? 'Validating Token...' : t('connection_established')}
          </button>
        </form>

        <div className="pt-4 sm:pt-6 border-t border-white/5 flex flex-col gap-2 px-2 items-center">
           <p className="text-[7px] sm:text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center">
              DESIGN BY <span className="text-white">ALEX</span> &copy; 2026
           </p>
           <button type="button" onClick={forceResetData} className="text-slate-800 hover:text-red-900 transition-colors p-1 -mb-1" title="Hard Reset Cache">
              <RotateCcw size={10} />
           </button>
        </div>
      </div>
    </div>
  );
};
