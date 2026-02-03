
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProductInventory } from './components/ProductInventory';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { AppState, Category, ProductData, User, Language } from './types';
import { DEFAULT_CATEGORIES, STORAGE_KEY, MOCK_PRODUCTS, TRANSLATIONS } from './constants';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', password: 'password', role: 'admin', avatar: 'https://picsum.photos/seed/admin/32/32' }
];

const App: React.FC = () => {
  const [lastSaved, setLastSaved] = useState<string>('Initializing...');
  const [isSyncing, setIsSyncing] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [diagnostic, setDiagnostic] = useState<{msg: string, code?: string} | null>(null);
  
  const [state, setState] = useState<AppState>(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          categories: parsed.categories || DEFAULT_CATEGORIES,
          products: parsed.products || MOCK_PRODUCTS,
          users: parsed.users || INITIAL_USERS,
          currentUser: parsed.currentUser || null,
          view: parsed.view || 'dashboard',
          language: parsed.language || 'zh',
          isSyncing: false,
          cloudConnected: true
        };
      } catch (e) { console.error(e); }
    }
    return {
      categories: DEFAULT_CATEGORIES,
      products: MOCK_PRODUCTS,
      users: INITIAL_USERS,
      currentUser: null,
      view: 'dashboard',
      language: 'zh',
      isSyncing: false,
      cloudConnected: true
    };
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const tRef = useRef<(k: string, r?: Record<string, string | number>) => string>(() => '');
  const t = (key: string, replacements?: Record<string, string | number>) => {
    const lang = TRANSLATIONS[state.language];
    let s: string;
    if (key.includes('.')) {
      const parts = key.split('.');
      s = lang[parts[0]]?.[parts[1]] || key;
    } else {
      s = lang[key] ?? key;
    }
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => { s = s.replace(`{${k}}`, String(v)); });
    }
    return s;
  };
  tRef.current = t;

  const fetchFromCloud = useCallback(async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      console.log('🔄 开始同步数据...');
      
      // 采用更稳健的 Promise.allSettled 避免单一接口挂掉导致全局崩溃
      const results = await Promise.allSettled([
        supabase.from('categories').select('*'),
        supabase.from('products').select('*'),
        supabase.from('category_templates').select('*'),
        supabase.from('users').select('*')
      ]);

      let cloudCats: any[] = [];
      let cloudProds: any[] = [];
      let cloudTemplates: any[] = [];
      let cloudUsers: any[] = [];

      if (results[0].status === 'fulfilled' && !results[0].value.error) {
        cloudCats = results[0].value.data || [];
        console.log('📋 品类数据:', cloudCats.length, '条');
      }
      if (results[1].status === 'fulfilled' && !results[1].value.error) {
        cloudProds = results[1].value.data || [];
        console.log('📦 产品数据:', cloudProds.length, '条');
      }
      if (results[2].status === 'fulfilled' && !results[2].value.error) {
        cloudTemplates = results[2].value.data || [];
        console.log('🏷️ 模板数据:', cloudTemplates.length, '条');
      }
      if (results[3].status === 'fulfilled' && !results[3].value.error) {
        cloudUsers = results[3].value.data || [];
        console.log('👥 用户数据:', cloudUsers.length, '条');
      }

      // 将品类模板转换为前端需要的 Category.fields 格式
      const categoriesWithFields = cloudCats.map((cat: any) => {
        const templates = cloudTemplates.filter((t: any) => t.category_id === cat.id && t.is_active);
        const fields = templates
          .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((t: any) => ({
            id: t.field_key,
            name: t.field_name,
            type: t.field_type,
            required: t.is_required,
            options: Array.isArray(t.options) ? t.options : t.options ? Object.values(t.options) : undefined,
            isSystem: false
          }));
        console.log(`🏷️ 品类 ${cat.name}:`, fields.length, '个字段');
        return {
          ...cat,
          fields
        };
      });

      console.log('✅ 数据转换完成，品类数量:', categoriesWithFields.length);

      // 转换产品数据，合并固定字段和 attributes
      const productsWithAttributes = cloudProds.map((p: any) => {
        const attributes = p.attributes || {};
        const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
        const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : undefined;
        // 先展开 attributes，再用 DB 固定列覆盖，确保云端数据优先
        return {
          ...attributes,
          id: p.id,
          categoryId: p.category_id,
          createdAt: createdMs,
          updatedAt: updatedMs,
          updatedBy: p.updated_by,
          brand: p.brand || '',
          model: p.model || '',
          price: Number(p.price || 0),
          monthlySales: Number(p.monthly_sales || 0),
          rating: Number(p.rating || 0),
          mainImage: p.main_image || '',
          linkUrl: p.link_url || '',
          channel: p.channel || '',
          shopName: p.shop_name || '',
          actualPrice: p.actual_price ? Number(p.actual_price) : undefined,
          attributes
        };
      });

      setState(prev => ({
        ...prev,
        categories: categoriesWithFields.length > 0 ? categoriesWithFields : prev.categories,
        users: cloudUsers.length > 0 ? cloudUsers : prev.users,
        products: productsWithAttributes.length > 0 ? productsWithAttributes : prev.products
      }));
      setLastSaved(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Cloud Sync Process Error:", err);
      // 防崩溃：即使同步失败也不影响页面显示
      setDiagnostic({ msg: err?.message || tRef.current('sync_failed'), code: 'SYNC_ERROR' });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Supabase Auth 会话恢复 + 获取用户角色
  const restoreSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setState((prev) => ({ ...prev, currentUser: null }));
      setAuthChecked(true);
      return;
    }
    const { data: profile } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('auth_user_id', session.user.id)
      .single();
    if (profile) {
      setState((prev) => ({
        ...prev,
        currentUser: {
          id: profile.id,
          username: profile.username || profile.email || '',
          email: profile.email,
          role: profile.role
        }
      }));
    } else {
      setState((prev) => ({ ...prev, currentUser: null }));
    }
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      if (!session?.user) {
        setState((prev) => ({ ...prev, currentUser: null }));
        return;
      }
      const { data: profile } = await supabase
        .from('users')
        .select('id, username, email, role')
        .eq('auth_user_id', session.user.id)
        .single();
      if (profile) {
        setState((prev) => ({
          ...prev,
          currentUser: {
            id: profile.id,
            username: profile.username || profile.email || '',
            email: profile.email,
            role: profile.role
          }
        }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const uid = state.currentUser?.id ?? null;
    if (uid && uid !== prevUserIdRef.current) {
      prevUserIdRef.current = uid;
      fetchFromCloud();
    }
    if (!uid) prevUserIdRef.current = null;
  }, [state.currentUser?.id, fetchFromCloud]);

  const handleProductAdd = async (data: any) => {
    setIsSyncing(true);
    try {
      const { categoryId, ...restData } = data;
      let mainImage = restData.mainImage || '';
      if (mainImage.startsWith('data:image/')) {
        try {
          const { uploadImageToStorage } = await import('./utils/uploadImage');
          const UPLOAD_TIMEOUT_MS = 45000;
          mainImage = await Promise.race([
            uploadImageToStorage(mainImage),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error(t('save_timeout'))), UPLOAD_TIMEOUT_MS)),
          ]);
        } catch (e) {
          console.warn('主图 base64 上传失败，将尝试原样保存:', e);
          setDiagnostic({ msg: (e as Error)?.message || t('upload_failed'), code: 'UPLOAD_ERROR' });
          throw e;
        }
      }
      const now = new Date().toISOString();
      
      // 分离核心固定字段和动态字段
      const fixedFields = {
        category_id: categoryId,
        // 核心字段：所有品类共有
        brand: restData.brand || '',
        model: restData.model || '',
        link_url: restData.linkUrl || '',
        channel: restData.channel || '',
        shop_name: restData.shopName || '',
        price: Number(restData.price || 0),
        actual_price: restData.actualPrice != null && restData.actualPrice !== '' ? Number(restData.actualPrice) : null,
        monthly_sales: Number(restData.monthlySales || 0),
        rating: Number(restData.rating || 0),
        main_image: mainImage,
        // 时间戳 - PostgreSQL 需要 ISO 8601 字符串，不能是毫秒数
        created_at: now,
        updated_at: now,
        updated_by: (state.currentUser?.id && /^[0-9a-f-]{36}$/i.test(state.currentUser.id)) ? state.currentUser.id : null
      };
      
      // 动态字段放入 attributes (品类特定参数)
      const dynamicFields = { ...restData };
      delete dynamicFields.brand;
      delete dynamicFields.model;
      delete dynamicFields.linkUrl;
      delete dynamicFields.channel;
      delete dynamicFields.shopName;
      delete dynamicFields.price;
      delete dynamicFields.actualPrice;
      delete dynamicFields.monthlySales;
      delete dynamicFields.rating;
      delete dynamicFields.mainImage;
      delete dynamicFields.categoryId;

      const attributes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dynamicFields)) {
        if (k === 'categoryId' || v === undefined) continue;
        try {
          JSON.stringify(v);
          attributes[k] = v;
        } catch {
          attributes[k] = String(v);
        }
      }

      const payload = {
        ...fixedFields,
        attributes
      };

      const INSERT_TIMEOUT_MS = 60000;
      const insertPromise = supabase.from('products').insert([payload]);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t('save_timeout'))), INSERT_TIMEOUT_MS)
      );
      const { error } = await Promise.race([insertPromise, timeoutPromise]);
      if (error) {
        console.error('[Product Add] Supabase error:', error.code, error.message, payload);
        setDiagnostic({ msg: error.message, code: error.code });
        throw new Error(error.message);
      }
      // 同步列表在后台执行，避免长时间等待导致“请求超时”
      fetchFromCloud(true).catch(() => {});
    } catch (err: any) {
      console.error('Product add error:', err);
      setDiagnostic({ msg: err?.message || t('add_product_failed'), code: 'ADD_ERROR' });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductUpdate = async (id: string, data: any) => {
    setIsSyncing(true);
    try {
      const { categoryId, ...restData } = data;
      let mainImage = restData.mainImage || '';
      if (mainImage.startsWith('data:image/')) {
        try {
          const { uploadImageToStorage } = await import('./utils/uploadImage');
          const UPLOAD_TIMEOUT_MS = 45000;
          mainImage = await Promise.race([
            uploadImageToStorage(mainImage),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error(t('save_timeout'))), UPLOAD_TIMEOUT_MS)),
          ]);
        } catch (e) {
          console.warn('主图 base64 上传失败:', e);
          setDiagnostic({ msg: (e as Error)?.message || t('upload_failed'), code: 'UPLOAD_ERROR' });
          throw e;
        }
      }
      const now = new Date().toISOString();
      
      // 分离核心固定字段和动态字段
      const fixedFields = {
        category_id: categoryId,
        // 核心字段：所有品类共有
        brand: restData.brand || '',
        model: restData.model || '',
        link_url: restData.linkUrl || '',
        channel: restData.channel || '',
        shop_name: restData.shopName || '',
        price: Number(restData.price || 0),
        actual_price: restData.actualPrice != null && restData.actualPrice !== '' ? Number(restData.actualPrice) : null,
        monthly_sales: Number(restData.monthlySales || 0),
        rating: Number(restData.rating || 0),
        main_image: mainImage,
        // 时间戳 - PostgreSQL 需要 ISO 8601 字符串
        updated_at: now,
        updated_by: (state.currentUser?.id && /^[0-9a-f-]{36}$/i.test(state.currentUser.id)) ? state.currentUser.id : null
      };
      
      const dynamicFields = { ...restData };
      delete dynamicFields.brand;
      delete dynamicFields.model;
      delete dynamicFields.linkUrl;
      delete dynamicFields.channel;
      delete dynamicFields.shopName;
      delete dynamicFields.price;
      delete dynamicFields.actualPrice;
      delete dynamicFields.monthlySales;
      delete dynamicFields.rating;
      delete dynamicFields.mainImage;
      delete dynamicFields.categoryId;

      const attributes: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(dynamicFields)) {
        if (k === 'categoryId' || v === undefined) continue;
        try {
          JSON.stringify(v);
          attributes[k] = v;
        } catch {
          attributes[k] = String(v);
        }
      }

      const payload = {
        ...fixedFields,
        attributes
      };

      const UPDATE_TIMEOUT_MS = 60000;
      const updatePromise = supabase.from('products').update(payload).eq('id', id);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(t('save_timeout'))), UPDATE_TIMEOUT_MS)
      );
      const { error } = await Promise.race([updatePromise, timeoutPromise]);
      if (error) {
        setDiagnostic({ msg: error.message, code: error.code });
        throw new Error(error.message);
      }
      // 同步列表在后台执行，避免长时间等待导致“请求超时”
      fetchFromCloud(true).catch(() => {});
    } catch (err: any) {
      console.error('Product update error:', err);
      setDiagnostic({ msg: err?.message || t('update_product_failed'), code: 'UPDATE_ERROR' });
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductDelete = async (id: string) => {
    setIsSyncing(true);
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        setDiagnostic({ msg: error.message, code: error.code });
        throw new Error(error.message);
      }
      await fetchFromCloud(true);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateCategories = async (newCategories: Category[]) => {
    setIsSyncing(true);
    try {
      // 1. 仅同步品类基础数据到 categories 表（不含 fields，该列不存在）
      const categoryRows = newCategories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? null,
        icon: c.icon ?? null,
        sort_order: 0,
        is_active: true
      }));
      const { error: catError } = await supabase.from('categories').upsert(categoryRows, { onConflict: 'id' });
      if (catError) {
        setDiagnostic({ msg: catError.message, code: catError.code });
        setIsSyncing(false);
        return;
      }

      // 2. 将 fields 同步到 category_templates 表
      for (const cat of newCategories) {
        const fields = cat.fields || [];
        // 删除该品类下已不在新列表中的模板
        const keepKeys = fields.map((f) => f.id);
        const { data: existing } = await supabase
          .from('category_templates')
          .select('id, field_key')
          .eq('category_id', cat.id);
        if (existing?.length) {
          const toDelete = existing.filter((t) => !keepKeys.includes(t.field_key)).map((t) => t.id);
          for (const id of toDelete) {
            await supabase.from('category_templates').delete().eq('id', id);
          }
        }
        // 逐个 upsert 字段模板
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const templateRow = {
            category_id: cat.id,
            field_key: f.id,
            field_name: f.name,
            field_type: (f.type || 'text').toString().toLowerCase(),
            is_required: !!f.required,
            options: f.options && f.options.length > 0 ? f.options : null,
            sort_order: i,
            is_active: true
          };
          await supabase.from('category_templates').upsert(templateRow, {
            onConflict: 'category_id,field_key'
          });
        }
      }
      await fetchFromCloud(true);
    } catch (err: any) {
      console.error('handleUpdateCategories error:', err);
      setDiagnostic({ msg: err?.message || t('update_category_failed'), code: 'UPDATE_CAT_ERROR' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCategoryDelete = async (id: string) => {
    setIsSyncing(true);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) setDiagnostic({ msg: error.message, code: error.code });
    await fetchFromCloud(true);
  };

  const handleUserAdd = async (user: User) => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setDiagnostic({ msg: t('auth_expired'), code: 'AUTH_EXPIRED' });
        return;
      }
      const email = user.email || (user.username?.includes('@') ? user.username : null);
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          email: email || user.username,
          username: user.username,
          password: user.password || 'password',
          role: user.role
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDiagnostic({ msg: data?.error?.message || `创建失败: ${res.status}`, code: data?.code });
        return;
      }
      await fetchFromCloud(true);
    } catch (err: any) {
      setDiagnostic({ msg: err?.message || t('create_user_failed'), code: 'CREATE_USER_ERR' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUserUpdate = async (user: User) => {
    setIsSyncing(true);
    // users 表无 avatar 列，只更新 DB 存在的字段；密码为空则不更新密码
    const payload: Record<string, unknown> = { username: user.username, role: user.role };
    if (user.password && user.password.trim()) payload.password = user.password.trim();
    if (user.email !== undefined) payload.email = user.email || null;
    const { error } = await supabase.from('users').update(payload).eq('id', user.id);
    if (error) setDiagnostic({ msg: error.message, code: error.code });
    await fetchFromCloud(true);
  };

  const handleUserDelete = async (id: string) => {
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setDiagnostic({ msg: t('auth_expired'), code: 'AUTH_EXPIRED' });
        return;
      }
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId: id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDiagnostic({ msg: data?.error?.message || `删除失败: ${res.status}`, code: data?.code });
        return;
      }
      await fetchFromCloud(true);
    } catch (err: any) {
      setDiagnostic({ msg: err?.message || '删除用户失败', code: 'DELETE_USER_ERR' });
    } finally {
      setIsSyncing(false);
    }
  };

  const login = async (email: string, password: string): Promise<true | string> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid api key') || msg.includes('api key') && msg.includes('invalid')) return t('invalid_supabase_key');
      return error.message || t('login_failed');
    }
    if (!data.session?.user) return t('login_failed');
    const { data: profile } = await supabase
      .from('users')
      .select('id, username, email, role')
      .eq('auth_user_id', data.session.user.id)
      .single();
    if (!profile) return t('login_profile_not_found');
    setState((prev) => ({
      ...prev,
      currentUser: {
        id: profile.id,
        username: profile.username || profile.email || '',
        email: profile.email,
        role: profile.role
      }
    }));
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setState((prev) => ({ ...prev, currentUser: null, view: 'dashboard' }));
  };

  const setView = (view: AppState['view']) => {
    const role = state.currentUser?.role;
    if (view === 'users' && role !== 'admin') return;
    if (view === 'settings' && role !== 'admin' && role !== 'editor') return;
    setState((prev) => ({ ...prev, view }));
  };
  
  const setLanguage = (lang: Language) => setState(prev => ({ ...prev, language: lang }));

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);

  // 等 session 恢复完成后再决定显示登录页，避免有有效 session 时短暂闪出登录框
  if (!authChecked) {
    return (
      <div className="min-h-screen min-h-[100dvh] bg-[#0F172A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white/10 border-t-[#A3E635] rounded-full animate-spin" />
      </div>
    );
  }
  if (!state.currentUser) return <Login onLogin={login} language={state.language} t={t} />;


  return (
    <Layout 
      currentView={state.view} setView={setView} currentUser={state.currentUser} onLogout={logout}
      onAddTrigger={() => { setView('inventory'); setIsAddModalOpen(true); }}
      lastSaved={lastSaved} language={state.language} setLanguage={setLanguage} t={t}
      isSyncing={isSyncing}
    >
      <div className="h-full relative">
        {diagnostic && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 overflow-y-auto max-h-[100dvh] bg-black/60">
             <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 sm:gap-5 text-red-500">
                   <ShieldAlert size={22} className="sm:w-7 sm:h-7 shrink-0" />
                   <h3 className="text-base sm:text-xl font-black uppercase text-white truncate">{t('diagnostic_title')}</h3>
                </div>
                <div className="bg-black/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 font-mono text-[10px] sm:text-[11px] text-slate-300 break-words">
                   <p className="text-red-400">STATUS_CODE: {diagnostic.code}</p>
                   <p className="mt-2 break-all">MESSAGE: {diagnostic.msg}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button onClick={() => { setDiagnostic(null); fetchFromCloud(); }} className="flex-1 py-4 sm:py-5 bg-white text-slate-950 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <RefreshCw size={14} /> {t('resync_node')}
                  </button>
                  <button onClick={() => setDiagnostic(null)} className="px-6 sm:px-10 py-4 sm:py-5 bg-slate-800 text-slate-400 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest">{t('acknowledge')}</button>
                </div>
             </div>
          </div>
        )}
        
        {state.view === 'dashboard' && <Dashboard products={state.products} categories={state.categories} t={t} />}
        {state.view === 'inventory' && (
          <ProductInventory 
            products={state.products} categories={state.categories} 
            onAdd={handleProductAdd} onUpdate={handleProductUpdate} onDelete={handleProductDelete}
            currentUser={state.currentUser} isAddModalOpen={isAddModalOpen} setIsAddModalOpen={setIsAddModalOpen} t={t}
          />
        )}
        {state.view === 'settings' && (
          <Settings 
            categories={state.categories} onUpdateCategories={handleUpdateCategories} 
            onDeleteCategory={handleCategoryDelete}
            isAdmin={state.currentUser.role === 'admin'} t={t} 
          />
        )}
        {state.view === 'users' && (
          <UserManagement 
            users={state.users} 
            onAddUser={handleUserAdd} 
            onUpdateUser={handleUserUpdate} 
            onDeleteUser={handleUserDelete}
            currentUser={state.currentUser} t={t} 
          />
        )}
      </div>
    </Layout>
  );
};

export default App;
