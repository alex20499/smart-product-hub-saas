
import React, { useState, useRef, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Settings as SettingsIcon, 
  Users as UsersIcon,
  LogOut,
  Menu,
  Zap,
  ChevronDown,
  User as UserIcon,
  Globe,
  Cloud,
  RefreshCw,
  X,
  ShieldCheck,
  Settings2,
  ChevronRight
} from 'lucide-react';
import { User, Language } from '../types';
import { APP_NAME } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: any) => void;
  currentUser: User;
  onLogout: () => void;
  onAddTrigger: () => void;
  lastSaved: string;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isSyncing?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentView, 
  setView, 
  currentUser, 
  onLogout,
  lastSaved,
  language,
  setLanguage,
  t,
  isSyncing = false
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser.role === 'admin';
  const isEditor = currentUser.role === 'editor';

  const navItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'inventory', label: t('inventory'), icon: Package },
  ];
  if (isAdmin || isEditor) {
    navItems.push({ id: 'settings', label: t('settings'), icon: SettingsIcon });
  }
  if (isAdmin) {
    navItems.push({ id: 'users', label: t('users'), icon: UsersIcon });
  }

  const langOptions = [
    { id: 'en', label: 'English' },
    { id: 'zh', label: '简体中文' },
    { id: 'ja', label: '日本語' },
  ];

  return (
    <div className="flex h-screen bg-[#0F172A] overflow-hidden relative selection:bg-[#A3E635] selection:text-slate-950">
      {(isSidebarOpen || isProfileOpen) && (
        <div 
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[155] animate-in fade-in duration-500"
          onClick={() => { setIsSidebarOpen(false); setIsProfileOpen(false); }}
        />
      )}

      <aside className={`
        fixed lg:relative inset-y-0 left-0 w-24 lg:w-28 glass-sidebar flex flex-col z-[160] transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]
        ${isSidebarOpen ? 'translate-x-0 shadow-[20px_0_100px_rgba(0,0,0,0.5)]' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-24 flex items-center justify-center shrink-0">
          <div className="bg-[#A3E635] p-3 rounded-2xl shadow-[0_0_30px_rgba(163,230,53,0.4)] relative">
            <Zap className="w-6 h-6 text-slate-950" />
            <div className="absolute -inset-1 bg-[#A3E635]/20 blur-md rounded-2xl -z-10 animate-pulse"></div>
          </div>
        </div>
        
        <div className="flex-1 py-6 flex flex-col items-center gap-6 lg:gap-8 overflow-y-auto no-scrollbar scroll-smooth">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setIsSidebarOpen(false); }}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all group relative shrink-0 active:scale-90 ${
                    isActive 
                      ? 'bg-[#A3E635] text-slate-950 shadow-[0_0_25px_rgba(163,230,53,0.3)]' 
                      : 'text-slate-500 hover:bg-slate-800/50 hover:text-white'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-6 h-6" />
                  {isActive && <div className="absolute -left-2 w-1.5 h-6 bg-[#A3E635] rounded-full"></div>}
                </button>
              );
            })}
        </div>

        <div className="p-6 flex flex-col items-center gap-6 mb-4">
           <button onClick={onLogout} className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-500 hover:text-red-400 transition-all border border-white/5 active:bg-red-500/10">
              <LogOut size={20} />
           </button>
        </div>
      </aside>

      <aside className={`
        fixed inset-y-0 right-0 w-[85vw] max-w-[320px] sm:w-80 lg:w-96 bg-[#0F172A] flex flex-col z-[170] transition-all duration-500 ease-[cubic-bezier(0.2,1,0.3,1)]
        ${isProfileOpen ? 'translate-x-0 shadow-[-50px_0_150px_rgba(0,0,0,0.8)]' : 'translate-x-full'}
        border-l border-white/10
      `}>
        <div className="h-20 lg:h-24 px-6 lg:px-8 flex items-center justify-between border-b border-white/5 bg-slate-900/40 text-left">
           <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.4em]">{t('profile_settings')}</h3>
           <button onClick={() => setIsProfileOpen(false)} className="size-10 flex items-center justify-center text-slate-500 hover:text-white transition-colors bg-white/5 rounded-xl"><X size={20} /></button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-10 text-left">
           <div className="flex flex-col items-center text-center space-y-6">
              <div className="relative group">
                <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username || 'U')}&background=A3E635&color=0F172A`} className="w-20 h-20 lg:w-24 lg:h-24 rounded-[2rem] lg:rounded-[2.5rem] border-2 border-[#A3E635]/30 p-1 shadow-2xl transition-transform group-hover:scale-105 duration-500" alt={currentUser.username} />
                <div className="absolute -bottom-1 -right-1 bg-[#A3E635] size-7 lg:size-8 rounded-full border-4 border-[#0F172A] flex items-center justify-center shadow-lg"><ShieldCheck size={12} className="text-slate-950" /></div>
              </div>
              <div>
                <h4 className="text-xl lg:text-2xl font-black text-white uppercase tracking-tight">{currentUser.username}</h4>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-2 leading-relaxed">{currentUser.role === 'admin' ? t('system_architect') : t('data_analyst')}</p>
              </div>
           </div>

           <div className="space-y-4">
              <div className="p-6 bg-slate-900/80 rounded-3xl border border-white/5 space-y-3">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('authenticated_entity')}</p>
                 <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-white uppercase">{currentUser.role}</span>
                    <ChevronRight size={16} className="text-slate-700" />
                 </div>
              </div>

              {(isAdmin || isEditor) && (
                <button 
                  onClick={() => { setView('settings'); setIsProfileOpen(false); }}
                  className="w-full flex items-center justify-between p-6 bg-white/5 hover:bg-[#A3E635]/10 rounded-3xl border border-white/5 transition-all group"
                >
                   <div className="flex items-center gap-4">
                      <Settings2 size={18} className="text-slate-500 group-hover:text-[#A3E635]" />
                      <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white tracking-widest">{t('settings')}</span>
                   </div>
                   <ChevronRight size={16} className="text-slate-700" />
                </button>
              )}

              <button onClick={onLogout} className="w-full flex items-center justify-between p-6 bg-red-500/5 hover:bg-red-500/10 rounded-3xl border border-red-500/10 transition-all group">
                 <div className="flex items-center gap-4">
                    <LogOut size={18} className="text-red-400" />
                    <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">{t('logout')}</span>
                 </div>
                 <ChevronRight size={16} className="text-red-900/40" />
              </button>
           </div>
        </div>

        <div className="p-8 lg:p-10 border-t border-white/5 bg-slate-950">
           <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest text-center">Version 6.3.0-STABLE | Cloud Node {lastSaved}</p>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-20 lg:h-24 px-4 lg:px-10 flex items-center justify-between shrink-0 z-[50] relative border-b border-white/5 bg-[#0F172A]/80 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="lg:hidden p-3 text-slate-400 bg-slate-800/50 rounded-xl active:bg-slate-700 transition-colors"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-3">
               <h1 className="text-sm lg:text-lg font-black text-white uppercase tracking-normal truncate max-w-[100px] sm:max-w-none">{APP_NAME}</h1>
               <div className="h-4 w-px bg-white/10 mx-2 hidden sm:block"></div>
               <div className="hidden sm:flex items-center gap-2">
                 <div className="flex items-center gap-1.5 px-3 py-1 bg-[#A3E635]/10 rounded-full border border-[#A3E635]/20">
                   {isSyncing ? (
                     <RefreshCw size={10} className="text-[#A3E635] animate-spin" />
                   ) : (
                     <Cloud size={10} className="text-[#A3E635]" />
                   )}
                   <span className="text-[7px] font-black text-[#A3E635] uppercase tracking-widest">
                     {isSyncing ? t('syncing') : t('cloud_active')}
                   </span>
                 </div>
               </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
             <div className="hidden lg:flex flex-col items-end gap-0.5">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Global Node Sync</span>
                <span className="text-[9px] font-black text-[#A3E635] font-num">{lastSaved}</span>
             </div>

             <div className="relative no-print" ref={langRef}>
                <button 
                  onClick={() => setIsLangOpen(!isLangOpen)}
                  className="flex items-center gap-3 px-4 py-2.5 bg-slate-800/50 border border-white/5 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all appearance-none pr-12 relative"
                >
                  <Globe size={14} className="text-[#A3E635]" />
                  <span className="hidden xs:inline">{langOptions.find(l => l.id === language)?.label}</span>
                  <ChevronDown size={14} className={`absolute right-4 text-slate-600 transition-transform ${isLangOpen ? 'rotate-180' : ''}`} />
                </button>
                {isLangOpen && (
                  <div className="absolute top-14 right-0 w-44 bg-[#111827] border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-2 z-[210] animate-in slide-in-from-top-2 duration-200">
                      {langOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => { setLanguage(opt.id as Language); setIsLangOpen(false); }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${language === opt.id ? 'bg-[#A3E635] text-slate-950' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                  </div>
                )}
             </div>
             
             <button 
               onClick={() => setIsProfileOpen(true)}
               className="flex items-center gap-3 group pl-2 lg:pl-6 border-l border-white/5 active:scale-95 transition-transform"
             >
                <div className="relative shrink-0">
                   <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.username || 'U')}&background=A3E635&color=0F172A`} className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl border border-white/10 group-hover:border-[#A3E635]/50 transition-all p-0.5 shadow-xl" alt={currentUser.username} />
                   <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#A3E635] rounded-full flex items-center justify-center border-2 border-[#0F172A]">
                      <ChevronDown size={8} className="text-slate-950" />
                   </div>
                </div>
             </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col z-[10]">
          <div className="flex-1 px-3 sm:px-6 lg:px-10 py-4 sm:py-8 lg:py-12">
            {children}
          </div>
          <footer className="w-full py-10 px-4 lg:px-10 border-t border-white/5 mt-auto bg-slate-950/20 backdrop-blur-sm text-center">
             <div className="space-y-1">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">
                   DESIGN & ENGINE ARCHITECTURE BY ALEX &copy; 2026
                </p>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">
                   PROPRIETARY CLOUD SYSTEM PROTOCOL | ALL RIGHTS RESERVED
                </p>
             </div>
          </footer>
        </div>
      </main>
    </div>
  );
};
