
import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProductInventory } from './components/ProductInventory';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { AppState, Category, ProductData, User, Language } from './types';
import { DEFAULT_CATEGORIES, STORAGE_KEY, MOCK_PRODUCTS, TRANSLATIONS } from './constants';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

const INITIAL_USERS: User[] = [
  { id: '1', username: 'admin', password: 'password', role: 'admin', avatar: 'https://picsum.photos/seed/admin/32/32' }
];

const App: React.FC = () => {
  const [lastSaved, setLastSaved] = useState<string>('Initializing...');
  const [isSyncing, setIsSyncing] = useState(false);
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
      setDiagnostic({ msg: err?.message || '数据同步失败', code: 'SYNC_ERROR' });
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchFromCloud();
  }, [fetchFromCloud]);

  const handleProductAdd = async (data: any) => {
    setIsSyncing(true);
    try {
      const { categoryId, ...restData } = data;
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
        monthly_sales: Number(restData.monthlySales || 0),
        rating: Number(restData.rating || 0),
        main_image: restData.mainImage || '',
        // 时间戳 - PostgreSQL 需要 ISO 8601 字符串，不能是毫秒数
        created_at: now,
        updated_at: now,
        updated_by: (state.currentUser?.id && /^[0-9a-f-]{36}$/i.test(state.currentUser.id)) ? state.currentUser.id : null
      };
      
      // 动态字段放入 attributes (品类特定参数)
      const dynamicFields = { ...restData };
      // 移除所有核心字段，只保留品类特定参数
      delete dynamicFields.brand;
      delete dynamicFields.model;
      delete dynamicFields.linkUrl;
      delete dynamicFields.channel;
      delete dynamicFields.shopName;
      delete dynamicFields.price;
      delete dynamicFields.monthlySales;
      delete dynamicFields.rating;
      delete dynamicFields.mainImage;
      delete dynamicFields.actualPrice;
      
      const payload = {
        ...fixedFields,
        attributes: dynamicFields
      };
      
      const { error } = await supabase.from('products').insert([payload]);
      if (error) setDiagnostic({ msg: error.message, code: error.code });
      await fetchFromCloud(true);
    } catch (err: any) {
      console.error('Product add error:', err);
      setDiagnostic({ msg: err?.message || '添加产品失败', code: 'ADD_ERROR' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductUpdate = async (id: string, data: any) => {
    setIsSyncing(true);
    try {
      const { categoryId, ...restData } = data;
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
        monthly_sales: Number(restData.monthlySales || 0),
        rating: Number(restData.rating || 0),
        main_image: restData.mainImage || '',
        // 时间戳 - PostgreSQL 需要 ISO 8601 字符串
        updated_at: now,
        updated_by: (state.currentUser?.id && /^[0-9a-f-]{36}$/i.test(state.currentUser.id)) ? state.currentUser.id : null
      };
      
      // 动态字段放入 attributes (品类特定参数)
      const dynamicFields = { ...restData };
      // 移除所有核心字段，只保留品类特定参数
      delete dynamicFields.brand;
      delete dynamicFields.model;
      delete dynamicFields.linkUrl;
      delete dynamicFields.channel;
      delete dynamicFields.shopName;
      delete dynamicFields.price;
      delete dynamicFields.monthlySales;
      delete dynamicFields.rating;
      delete dynamicFields.mainImage;
      delete dynamicFields.actualPrice;
      
      const payload = {
        ...fixedFields,
        attributes: dynamicFields
      };
      
      const { error } = await supabase.from('products').update(payload).eq('id', id);
      if (error) setDiagnostic({ msg: error.message, code: error.code });
      await fetchFromCloud(true);
    } catch (err: any) {
      console.error('Product update error:', err);
      setDiagnostic({ msg: err?.message || '更新产品失败', code: 'UPDATE_ERROR' });
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
      setDiagnostic({ msg: err?.message || '更新品类失败', code: 'UPDATE_CAT_ERROR' });
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
    // users 表无 avatar 列，只插入 DB 存在的字段
    const { error } = await supabase.from('users').insert([{
      id: user.id,
      username: user.username,
      password: user.password || '',
      role: user.role,
      email: null
    }]);
    if (error) setDiagnostic({ msg: error.message, code: error.code });
    await fetchFromCloud(true);
  };

  const handleUserUpdate = async (user: User) => {
    setIsSyncing(true);
    // users 表无 avatar 列，只更新 DB 存在的字段；密码为空则不更新密码
    const payload: Record<string, unknown> = { username: user.username, role: user.role };
    if (user.password && user.password.trim()) payload.password = user.password.trim();
    const { error } = await supabase.from('users').update(payload).eq('id', user.id);
    if (error) setDiagnostic({ msg: error.message, code: error.code });
    await fetchFromCloud(true);
  };

  const handleUserDelete = async (id: string) => {
    setIsSyncing(true);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) setDiagnostic({ msg: error.message, code: error.code });
    await fetchFromCloud(true);
  };

  const login = (username: string, password: string) => {
    const user = state.users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (user) {
      setState(prev => ({ ...prev, currentUser: { ...user } }));
      return true;
    }
    return false;
  };

  const logout = () => {
    setState(prev => ({ ...prev, currentUser: null, view: 'dashboard' }));
  };

  const setView = (view: AppState['view']) => {
    if ((view === 'users' || view === 'settings') && state.currentUser?.role !== 'admin') return;
    setState(prev => ({ ...prev, view }));
  };
  
  const setLanguage = (lang: Language) => setState(prev => ({ ...prev, language: lang }));

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);

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
                   <h3 className="text-base sm:text-xl font-black uppercase text-white truncate">System Protocol Diagnostic</h3>
                </div>
                <div className="bg-black/40 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/5 font-mono text-[10px] sm:text-[11px] text-slate-300 break-words">
                   <p className="text-red-400">STATUS_CODE: {diagnostic.code}</p>
                   <p className="mt-2 break-all">MESSAGE: {diagnostic.msg}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button onClick={() => { setDiagnostic(null); fetchFromCloud(); }} className="flex-1 py-4 sm:py-5 bg-white text-slate-950 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                    <RefreshCw size={14} /> Re-sync Node
                  </button>
                  <button onClick={() => setDiagnostic(null)} className="px-6 sm:px-10 py-4 sm:py-5 bg-slate-800 text-slate-400 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest">Acknowledge</button>
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
            isAdmin={state.currentUser.role === 'admin'} allData={state} t={t} 
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
