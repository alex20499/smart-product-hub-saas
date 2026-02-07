
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { getAuthToken, isSessionTimeoutError } from './lib/authToken';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProductInventory } from './components/ProductInventory';
import { Settings } from './components/Settings';
import { UserManagement } from './components/UserManagement';
import { Login } from './components/Login';
import { AppState, Category, User, Language } from './types';
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
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
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
  const saveInProgressRef = useRef(false);
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
    const SYNC_TIMEOUT_MS = 25_000;
    const timeoutId = setTimeout(() => {
      setIsSyncing(false);
      console.warn('🔄 同步超时，已取消「同步中」状态');
    }, SYNC_TIMEOUT_MS);
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

      // 转换产品数据，合并固定字段和 attributes（Supabase 有时返回 JSONB 为字符串，需解析）
      const productsWithAttributes = cloudProds.map((p: any) => {
        let attributes = p.attributes;
        if (typeof attributes === 'string') {
          try {
            attributes = JSON.parse(attributes || '{}');
          } catch {
            attributes = {};
          }
        }
        attributes = attributes || {};
        const createdMs = p.created_at ? new Date(p.created_at).getTime() : 0;
        const updatedMs = p.updated_at ? new Date(p.updated_at).getTime() : undefined;
        // 先展开 attributes，再用 DB 固定列覆盖，确保云端数据优先
        // 销量/价格：优先用表字段，没有则从 attributes 取，保证仪表盘三块版块能联动
        const monthlySalesVal = p.monthly_sales ?? (attributes as any)?.monthly_sales ?? (attributes as any)?.monthlySales ?? (attributes as any)?.销量;
        const priceVal = p.price ?? (attributes as any)?.price ?? (attributes as any)?.价格;
        const actualPriceVal = p.actual_price ?? (attributes as any)?.actual_price ?? (attributes as any)?.actualPrice ?? (attributes as any)?.到手价;
        return {
          ...attributes,
          id: p.id,
          categoryId: p.category_id,
          createdAt: createdMs,
          updatedAt: updatedMs,
          updatedBy: p.updated_by,
          brand: p.brand || (attributes as any)?.brand || '',
          model: p.model || (attributes as any)?.model || '',
          price: Number(priceVal || 0),
          monthlySales: Number(monthlySalesVal || 0),
          rating: Math.round(Math.min(5, Math.max(0, Number(p.rating || (attributes as any)?.rating || 0))) * 100) / 100,
          mainImage: p.main_image || '',
          linkUrl: p.link_url || (attributes as any)?.link_url || '',
          channel: p.channel || (attributes as any)?.channel || '',
          shopName: p.shop_name || '',
          actualPrice: actualPriceVal != null && actualPriceVal !== '' ? Number(actualPriceVal) : undefined,
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
      if (!silent) setToast({ message: tRef.current('toast_sync_done'), type: 'success' });
    } catch (err: any) {
      console.error("Cloud Sync Process Error:", err);
      // 防崩溃：即使同步失败也不影响页面显示
      setDiagnostic({ msg: err?.message || tRef.current('sync_failed'), code: 'SYNC_ERROR' });
    } finally {
      clearTimeout(timeoutId);
      setIsSyncing(false);
    }
  }, []);

  // Supabase Auth 会话恢复 + 获取用户角色（带超时保护）
  const restoreSession = useCallback(async () => {
    const SESSION_TIMEOUT_MS = 30000; // 30秒，适配远区（如孟买）高延迟
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('SESSION_TIMEOUT')), SESSION_TIMEOUT_MS);
    });
    
    try {
      const sessionResult = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]) as any;
      
      const { data: { session }, error: sessionError } = sessionResult || {};
      if (sessionError) {
        console.warn('获取会话失败:', sessionError);
        setAuthChecked(true);
        return;
      }
      if (!session?.user) {
        setState((prev) => ({ ...prev, currentUser: null }));
        setAuthChecked(true);
        return;
      }
      
      // 获取用户信息也加超时保护
      const profileResult = await Promise.race([
        supabase.from('users').select('id, username, email, role').eq('auth_user_id', session.user.id).single(),
        timeoutPromise
      ]) as any;
      
      const { data: profile, error: profileError } = profileResult || {};
      if (profileError) {
        console.warn('获取用户信息失败:', profileError);
        setState((prev) => ({ ...prev, currentUser: null }));
      } else if (profile) {
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
    } catch (err: any) {
      console.error('恢复会话异常:', err);
      // 超时或其他错误时，仍然设置 authChecked 为 true，避免一直 loading
      setState((prev) => ({ ...prev, currentUser: null }));
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session: Session | null) => {
      try {
        if (!session?.user) {
          setState((prev) => ({ ...prev, currentUser: null }));
          return;
        }
        const { data: profile, error } = await supabase
          .from('users')
          .select('id, username, email, role')
          .eq('auth_user_id', session.user.id)
          .single();
        if (error) {
          console.warn('获取用户信息失败:', error);
          setState((prev) => ({ ...prev, currentUser: null }));
        } else if (profile) {
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
      } catch (err) {
        console.error('Auth 状态变更处理异常:', err);
        setState((prev) => ({ ...prev, currentUser: null }));
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    const uid = state.currentUser?.id ?? null;
    if (uid && uid !== prevUserIdRef.current) {
      prevUserIdRef.current = uid;
      setTimeout(() => {
        fetchFromCloud().catch((err) => {
          console.warn('初始数据同步失败（不影响页面显示）:', err);
        });
      }, 100);
    }
    if (!uid) prevUserIdRef.current = null;
  }, [state.currentUser?.id, fetchFromCloud]);

  const handleProductAdd = async (data: any) => {
    setIsSyncing(true);
    console.log('[Product Add] 开始');
    try {
      const { categoryId, ...restData } = data;
      // 先取 token，整次流程只调一次 getSession，避免上传后再取导致超时
      let token: string;
      try {
        token = await getAuthToken({ timeoutMs: 20000, retryOnce: true });
      } catch (e: any) {
        if (e?.message?.includes?.('获取登录状态超时')) {
          console.error('[Product Add] getSession 超时');
          setDiagnostic({ msg: e.message, code: 'SESSION_TIMEOUT' });
        }
        throw e;
      }
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
      } else if (mainImage.startsWith('http://') || mainImage.startsWith('https://') || mainImage.startsWith('//')) {
        try {
          const { uploadImageToStorage } = await import('./utils/uploadImage');
          const UPLOAD_TIMEOUT_MS = 30000;
          mainImage = await Promise.race([
            uploadImageToStorage(mainImage),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error(t('save_timeout'))), UPLOAD_TIMEOUT_MS)),
          ]);
        } catch (e) {
          console.warn('主图 URL 上传失败:', e);
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
        rating: Math.round(Math.min(5, Math.max(0, Number(restData.rating || 0))) * 100) / 100,
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
      console.log('[Product Add] payload 已构建, categoryId:', categoryId);

      console.log('[Product Add] 请求 /api/create-product');
      const API_TIMEOUT_MS = 95000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch('/api/create-product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ payload }),
        signal: controller.signal,
      });
      } finally {
        clearTimeout(timeoutId);
      }
      console.log('[Product Add] 响应 status=', res.status);
      const json = await res.json().catch(() => ({}));
      const error = res.ok ? null : { message: json?.error?.message || t('add_product_failed'), code: json?.error?.code || 'ADD_ERROR' };
      if (error) {
        console.error('[Product Add] API 失败:', res.status, error.message);
        setDiagnostic({ msg: error.message, code: error.code });
        throw new Error(error.message);
      }
      console.log('[Product Add] 成功');
      setToast({ message: t('toast_saved'), type: 'success' });
      // 立即拉取最新列表，让产品管理页看到新加的产品
      await fetchFromCloud(false);
    } catch (err: any) {
      console.error('[Product Add] 异常:', err?.name, err?.message);
      const msg = err?.name === 'AbortError' ? t('save_timeout') : (err?.message || t('add_product_failed'));
      const code = isSessionTimeoutError(err) ? 'SESSION_TIMEOUT' : 'ADD_ERROR';
      setDiagnostic({ msg, code });
      throw new Error(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleProductUpdate = async (id: string, data: any) => {
    saveInProgressRef.current = true;
    setIsSyncing(true);
    try {
      const { categoryId, ...restData } = data;
      let mainImage = restData.mainImage || '';
      // 只处理 base64 图片上传，不支持外部 URL（避免 token 超时问题）
      if (mainImage && mainImage.trim() && mainImage.startsWith('data:image/')) {
        // base64 图片：上传到 Storage
        try {
          const { uploadImageToStorage } = await import('./utils/uploadImage');
          const UPLOAD_TIMEOUT_MS = 45000;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
          try {
            mainImage = await uploadImageToStorage(mainImage, { signal: controller.signal });
          } catch (e: any) {
            if (e?.message === 'upload_timeout' || controller.signal.aborted) {
              throw new Error('图片上传超时，请检查网络或稍后重试');
            }
            throw e;
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (e) {
          console.warn('主图 base64 上传失败:', e);
          const errorMsg = (e as Error)?.message || t('upload_failed');
          setDiagnostic({ msg: errorMsg, code: 'UPLOAD_ERROR' });
          throw new Error(errorMsg);
        }
      }
      // 保留已有的 http/https 主图（例如已上传的 Storage URL 或原有链接），不清空
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
        rating: Math.round(Math.min(5, Math.max(0, Number(restData.rating || 0))) * 100) / 100,
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
      const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
      const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
      if (!supabaseUrl || !anonKey) {
        setDiagnostic({ msg: '缺少 Supabase 配置', code: 'CONFIG_ERROR' });
        throw new Error('缺少 Supabase 配置');
      }
      // 获取 token：优先使用缓存，失败则直接读取 localStorage，最后才调用 getSession
      let token: string = '';
      try {
        // 方法1：尝试使用 getAuthToken 缓存（快速，5秒超时，不重试）
        try {
          token = await getAuthToken({ timeoutMs: 5000, retryOnce: false });
        } catch {
          // 缓存未命中，尝试方法2：直接从 localStorage 读取
          const projectRef = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)?.[1] || '';
          const supabaseSessionKey = projectRef ? `sb-${projectRef}-auth-token` : 'supabase.auth.token';
          const stored = localStorage.getItem(supabaseSessionKey) || localStorage.getItem('supabase.auth.token');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              token = parsed?.access_token || parsed?.currentSession?.access_token || parsed?.session?.access_token || '';
            } catch {}
          }
          // 方法3：如果 localStorage 也没有，最后尝试 getSession（25 秒超时）
          if (!token) {
            let sessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
            try {
              const result = await Promise.race([
                supabase.auth.getSession(),
                new Promise<never>((_, reject) => {
                  sessionTimeoutId = setTimeout(() => reject(new Error('SESSION_TIMEOUT')), 25000);
                })
              ]) as any;
              const { data: { session }, error: sessionError } = result;
              if (sessionError) throw new Error('获取登录状态失败');
              token = session?.access_token || '';
            } finally {
              if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
            }
          }
          if (!token) {
            throw new Error('请先登录');
          }
        }
      } catch (e: any) {
        const msg = e?.message === 'SESSION_TIMEOUT' || e?.name === 'AbortError'
          ? '获取登录状态超时，请检查网络或刷新重试'
          : (e?.message || '获取登录状态失败，请检查网络或刷新重试');
        setDiagnostic({ msg, code: 'AUTH_ERROR' });
        throw new Error(msg);
      }
      let lastError: any = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), UPDATE_TIMEOUT_MS);
        try {
          const res = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': anonKey,
              'Authorization': `Bearer ${token}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            const errMsg = (errBody as any)?.message || errBody?.error_description || res.statusText || `HTTP ${res.status}`;
            lastError = new Error(errMsg);
            continue;
          }
          lastError = null;
          setToast({ message: t('toast_saved'), type: 'success' });
          break;
        } catch (err: any) {
          clearTimeout(timeoutId);
          lastError = err?.name === 'AbortError' ? new Error(t('save_timeout')) : err;
        }
        if (attempt === 1 && lastError) {
          const msg = lastError?.message || t('update_product_failed');
          setDiagnostic({ msg, code: 'UPDATE_ERROR' });
          throw new Error(msg);
        }
      }
      // 约 1 秒后拉取最新列表，让产品管理页看到修改，且错峰避免与下次保存抢连接
      setTimeout(() => {
        if (!saveInProgressRef.current) fetchFromCloud(false);
      }, 1000);
    } catch (err: any) {
      console.error('Product update error:', err);
      setDiagnostic({ msg: err?.message || t('update_product_failed'), code: 'UPDATE_ERROR' });
      throw err;
    } finally {
      saveInProgressRef.current = false;
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
      await fetchFromCloud(false);
      setToast({ message: t('toast_deleted'), type: 'success' });
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

      // 2. 将 fields 同步到 category_templates 表（遇错即停，避免部分成功部分失败）
      for (const cat of newCategories) {
        const fields = cat.fields || [];
        const keepKeys = fields.map((f) => f.id);
        const { data: existing, error: listErr } = await supabase
          .from('category_templates')
          .select('id, field_key')
          .eq('category_id', cat.id);
        if (listErr) {
          setDiagnostic({ msg: listErr.message, code: listErr.code });
          setIsSyncing(false);
          return;
        }
        if (existing?.length) {
          const toDelete = existing.filter((t) => !keepKeys.includes(t.field_key)).map((t) => t.id);
          for (const id of toDelete) {
            const { error: delErr } = await supabase.from('category_templates').delete().eq('id', id);
            if (delErr) {
              setDiagnostic({ msg: delErr.message, code: delErr.code });
              setIsSyncing(false);
              return;
            }
          }
        }
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
          const { error: upsertErr } = await supabase.from('category_templates').upsert(templateRow, {
            onConflict: 'category_id,field_key'
          });
          if (upsertErr) {
            setDiagnostic({ msg: upsertErr.message, code: upsertErr.code });
            setIsSyncing(false);
            return;
          }
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
        throw new Error(t('auth_expired'));
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
        const msg = data?.error?.message || `创建失败: ${res.status}`;
        setDiagnostic({ msg, code: data?.code });
        throw new Error(msg);
      }
      await fetchFromCloud(true);
    } catch (err: any) {
      setDiagnostic({ msg: err?.message || t('create_user_failed'), code: 'CREATE_USER_ERR' });
      throw err instanceof Error ? err : new Error(err?.message || t('create_user_failed'));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUserUpdate = async (user: User) => {
    setIsSyncing(true);
    try {
      // users 表无 avatar 列，只更新 DB 存在的字段；密码为空则不更新密码
      const payload: Record<string, unknown> = { username: user.username, role: user.role };
      if (user.password && user.password.trim()) payload.password = user.password.trim();
      if (user.email !== undefined) payload.email = user.email || null;
      const { error } = await supabase.from('users').update(payload).eq('id', user.id);
      if (error) {
        setDiagnostic({ msg: error.message, code: error.code });
        throw new Error(error.message);
      }
      await fetchFromCloud(true);
    } finally {
      setIsSyncing(false);
    }
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

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

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
        {toast && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className={`px-6 py-3 rounded-2xl shadow-2xl border text-sm font-bold uppercase tracking-widest ${toast.type === 'success' ? 'bg-[#A3E635] text-slate-950 border-[#A3E635]' : 'bg-red-500/90 text-white border-red-500'}`}>
              {toast.message}
            </div>
          </div>
        )}
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
