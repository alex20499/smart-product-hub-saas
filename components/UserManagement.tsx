
import React, { useState } from 'react';
import { UserPlus, Trash2, Key, ShieldAlert, Edit3, X, Check, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementProps {
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  currentUser: User;
  t: (key: string) => string;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users = [], onAddUser, onUpdateUser, onDeleteUser, currentUser, t }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('viewer');
  const [formError, setFormError] = useState<string | null>(null);

  const isAdmin = currentUser.role === 'admin';

  const addUser = (e: React.FormEvent) => {
    e.preventDefault(); 
    setFormError(null);

    const trimmedUsername = newUsername.trim();
    if (!trimmedUsername) return;

    // 修复：建立重名校验
    const isDuplicate = users.some(u => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (isDuplicate) {
      setFormError("USERNAME ALREADY EXISTS IN THIS NODE");
      return;
    }

    const newUser: User = { 
      id: 'u_' + Math.random().toString(36).substr(2, 9), 
      username: trimmedUsername, 
      password: newPassword || '111111', 
      role: newRole, 
      avatar: `https://picsum.photos/seed/${trimmedUsername}/100/100` 
    };
    
    onAddUser(newUser); 
    setIsAddModalOpen(false);
    setNewUsername('');
    setNewPassword('');
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setNewUsername(user.username);
    setNewPassword(user.password || '');
    setNewRole(user.role);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const updateExistingUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    
    const trimmedUsername = newUsername.trim();
    // 修改时同样校验重名（排除自身）
    const isDuplicate = users.some(u => u.id !== editingUserId && u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (isDuplicate) {
      setFormError("USERNAME ALREADY EXISTS IN THIS NODE");
      return;
    }

    onUpdateUser({ 
      id: editingUserId, 
      username: trimmedUsername, 
      password: newPassword, 
      role: newRole,
      avatar: `https://picsum.photos/seed/${trimmedUsername}/100/100`
    });
    setIsEditModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20 font-['Inter']">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 text-left">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">{t('users')}</h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mt-2">Team Security Configuration</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setIsAddModalOpen(true); setNewUsername(''); setNewPassword(''); setNewRole('viewer'); setFormError(null); }} 
            className="flex items-center gap-4 bg-[#38BDF8] text-slate-950 px-10 py-5 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] hover:brightness-110 shadow-2xl transition-all"
          >
            <UserPlus size={18} /> {t('provision_access')}
          </button>
        )}
      </div>

      <div className="premium-card overflow-hidden border-white/5 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/20 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] border-b border-white/5">
                <th className="px-10 py-8">Entity Identifier</th>
                <th className="px-10 py-8">{t('clearance')}</th>
                <th className="px-10 py-8">Security</th>
                <th className="px-10 py-8 text-right">Protocol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-6">
                      <img src={user.avatar} className="w-12 h-12 rounded-2xl border border-white/10 p-0.5" alt={user.username} />
                      <div className="text-left">
                        <p className="font-black text-white uppercase tracking-widest text-sm">{user.username}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">UID-{user.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-10 py-8">
                    {isAdmin && (
                      <button 
                        onClick={() => openEditModal(user)}
                        className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-[#38BDF8] transition-colors flex items-center gap-2 group/btn"
                      >
                        <Edit3 size={14} className="group-hover/btn:scale-110 transition-transform" /> {t('edit')}
                      </button>
                    )}
                  </td>
                  <td className="px-10 py-8 text-right">
                    {/* 修复删除：直接调用 onDeleteUser 函数以执行后端 DELETE 指令 */}
                    {isAdmin && user.id !== currentUser.id && (
                      <button 
                        onClick={() => confirm(t('delete_confirm')) && onDeleteUser(user.id)} 
                        className="p-3 rounded-xl transition-all text-slate-600 hover:text-red-500"
                      >
                        <Trash2 size={22} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="center-modal-overlay animate-in fade-in duration-300">
          <div className="center-modal-container p-12 space-y-10 animate-in zoom-in-95 duration-200 text-center relative">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-[#38BDF8]/20 text-[#38BDF8] rounded-3xl flex items-center justify-center border border-[#38BDF8]/20 shadow-2xl">
                <ShieldAlert size={40} />
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">New Clearance</h3>
            </div>
            <form onSubmit={addUser} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('identifier')}</label>
                <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="USERNAME" className={`w-full bg-slate-900 border rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest transition-all ${formError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#38BDF8]/50'}`} required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('security_key')}</label>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="PASSWORD" className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest focus:border-[#38BDF8]/50" required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('clearance')}</label>
                <select 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest focus:border-[#38BDF8]/50 appearance-none"
                >
                  <option value="viewer" className="bg-slate-900 text-white">Viewer</option>
                  <option value="editor" className="bg-slate-900 text-white">Editor</option>
                  <option value="admin" className="bg-slate-900 text-white">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-[8px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                   <AlertCircle size={14} /> {formError}
                </div>
              )}

              <button type="submit" className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-[#38BDF8] transition-all">
                {t('execute_provision')}
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="center-modal-overlay animate-in fade-in duration-300">
          <div className="center-modal-container p-12 space-y-10 animate-in zoom-in-95 duration-200 text-center relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 text-slate-600 hover:text-white transition-colors">
              <X size={24} />
            </button>
            <div className="flex flex-col items-center gap-6">
              <div className="w-20 h-20 bg-[#A3E635]/20 text-[#A3E635] rounded-3xl flex items-center justify-center border border-[#A3E635]/20 shadow-2xl">
                <Key size={40} />
              </div>
              <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{t('edit_user')}</h3>
            </div>
            <form onSubmit={updateExistingUser} className="space-y-6 text-left">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('identifier')}</label>
                <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="USERNAME" className={`w-full bg-slate-900 border rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest transition-all ${formError ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-[#A3E635]/50'}`} required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('security_key')}</label>
                <input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="PASSWORD" className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest focus:border-[#A3E635]/50" required />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{t('clearance')}</label>
                <select 
                  value={newRole} 
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-xs font-black uppercase text-white outline-none tracking-widest focus:border-[#A3E635]/50 appearance-none"
                  disabled={editingUserId === currentUser.id}
                >
                  <option value="viewer" className="bg-slate-900 text-white">Viewer</option>
                  <option value="editor" className="bg-slate-900 text-white">Editor</option>
                  <option value="admin" className="bg-slate-900 text-white">Admin</option>
                </select>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-center gap-3 text-red-500 text-[8px] font-black uppercase tracking-widest animate-in slide-in-from-top-2">
                   <AlertCircle size={14} /> {formError}
                </div>
              )}

              <button type="submit" className="w-full bg-white text-slate-950 py-6 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:bg-[#A3E635] transition-all">
                {t('save_changes')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
