
import React, { useState } from 'react';
import { 
  Plus, Trash2, GripVertical, Edit3, ChevronLeft, 
  LayoutGrid, Database, Save, X, Settings2, ChevronDown,
  ArrowUp, ArrowDown, Package
} from 'lucide-react';
import { Category, ProductField, FieldType, ProductData } from '../types';
import { CATEGORY_SPECIFIC_FIELDS } from '../constants';

interface SettingsProps {
  categories: Category[];
  onUpdateCategories: (categories: Category[]) => void;
  onDeleteCategory: (id: string) => void;
  isAdmin: boolean;
  allData: {
    categories: Category[];
    products: ProductData[];
    users: any[];
  };
  t: (key: string) => string;
}

export const Settings: React.FC<SettingsProps> = ({ categories, onUpdateCategories, onDeleteCategory, isAdmin: canEdit, t }) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCatName, setNewCatName] = useState('');
  
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState('');
  const [editFieldType, setEditFieldType] = useState<FieldType>(FieldType.TEXT);
  const [editFieldOptions, setEditFieldOptions] = useState('');

  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState<FieldType>(FieldType.TEXT);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

  const addCategory = () => {
    if (!canEdit || !newCatName.trim()) return;
    const newCat: Category = { 
      id: 'cat_' + Math.random().toString(36).substr(2, 9), 
      name: newCatName.toUpperCase(), 
      fields: JSON.parse(JSON.stringify(CATEGORY_SPECIFIC_FIELDS)) // 只包含品类特定字段，排除核心字段
    };
    onUpdateCategories([...categories, newCat]); 
    setNewCatName('');
  };

  const handleAddField = () => {
    if (!canEdit || !selectedCategory || !newFieldName.trim()) return;
    const isOptionType = newFieldType === FieldType.SELECT || newFieldType === FieldType.MULTI_SELECT_QUANTITY;
    const newField: ProductField = { 
      id: 'f_' + Math.random().toString(36).substr(2, 9), 
      name: newFieldName.trim(), 
      type: newFieldType, 
      required: false, 
      options: isOptionType ? newFieldOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined 
    };
    onUpdateCategories(categories.map(c => c.id === selectedCategoryId ? { ...c, fields: [...(c.fields ?? []), newField] } : c));
    setNewFieldName(''); 
    setNewFieldOptions(''); 
    setNewFieldType(FieldType.TEXT);
  };

  const startEditField = (field: ProductField) => { 
    if(!canEdit) return;
    setIsEditing(field.id); 
    setEditFieldName(field.name); 
    setEditFieldType(field.type); 
    setEditFieldOptions(field.options?.join(', ') || ''); 
  };

  const saveEditField = () => {
    if (!canEdit || !selectedCategory || !isEditing) return;
    const isOptionType = editFieldType === FieldType.SELECT || editFieldType === FieldType.MULTI_SELECT_QUANTITY;
    onUpdateCategories(categories.map(c => c.id === selectedCategoryId ? { ...c, fields: (c.fields ?? []).map(f => f.id === isEditing ? { 
      ...f, 
      name: editFieldName, 
      type: editFieldType, 
      options: isOptionType ? editFieldOptions.split(',').map(s => s.trim()).filter(Boolean) : undefined 
    } : f) } : c));
    setIsEditing(null);
  };

  // 精准按钮排序逻辑
  const moveField = (index: number, direction: 'up' | 'down') => {
    if (!selectedCategory) return;
    const newFields = [...selectedCategory.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    
    // 互换位置
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    
    onUpdateCategories(categories.map(c => c.id === selectedCategoryId ? { ...c, fields: newFields } : c));
  };

  // 拖拽逻辑实现 (保留并优化)
  const onDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newFields = [...(selectedCategory?.fields || [])];
    const draggedItem = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onUpdateCategories(categories.map(c => c.id === selectedCategoryId ? { ...c, fields: newFields } : c));
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
  };

  const requiresOptions = (type: FieldType) => type === FieldType.SELECT || type === FieldType.MULTI_SELECT_QUANTITY;

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-12 animate-in fade-in duration-700 pb-24 sm:pb-40">
      <div className="premium-card p-4 sm:p-6 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-10 border-white/5">
        <div className="flex items-center gap-4 sm:gap-6 text-left w-full">
          <div className="bg-[#818CF8]/20 p-3 sm:p-5 rounded-xl sm:rounded-[2rem] text-[#818CF8] border border-[#818CF8]/20 shrink-0"><Database className="w-6 h-6 sm:w-8 sm:h-8" /></div>
          <div>
            <h1 className="text-xl sm:text-3xl font-black text-white tracking-tighter uppercase leading-tight">{t('settings')}</h1>
            <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1">Research Matrix Architect</p>
          </div>
        </div>
      </div>

      {!selectedCategoryId ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {categories.map(cat => (
            <div key={cat.id} className="premium-card group p-5 sm:p-8 lg:p-10 flex flex-col border-white/5 bg-slate-900/40 relative">
               <div className="flex items-center justify-between mb-4 sm:mb-8">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-slate-950 rounded-2xl sm:rounded-3xl flex items-center justify-center text-slate-700 group-hover:bg-[#A3E635] group-hover:text-slate-950 transition-all shadow-inner"><LayoutGrid size={24} className="sm:w-8 sm:h-8" /></div>
                  {canEdit && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); if(confirm(t('delete_confirm'))) onDeleteCategory(cat.id); }} 
                      className="p-3 text-red-500/50 hover:text-red-500 bg-red-500/5 rounded-xl border border-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={22} />
                    </button>
                  )}
               </div>
               <h3 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight mb-4 sm:mb-6">{cat.name}</h3>
               <button onClick={() => setSelectedCategoryId(cat.id)} className="w-full mt-auto py-4 sm:py-5 bg-slate-800/50 text-slate-400 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] group-hover:bg-white group-hover:text-slate-950 transition-all flex items-center justify-center gap-3 border border-white/5">
                 <Settings2 size={14} className="sm:w-4 sm:h-4 shrink-0" /> {t('edit')}
               </button>
            </div>
          ))}
          
          {canEdit && (
            <div className="premium-card p-5 sm:p-8 lg:p-10 border-dashed border-white/10 flex flex-col items-center justify-center gap-4 sm:gap-6 bg-slate-900/20">
              <input placeholder="NEW CATEGORY NAME..." className="bg-slate-900 border border-white/5 rounded-xl sm:rounded-2xl px-4 sm:px-8 py-3.5 sm:py-5 text-[10px] sm:text-[11px] font-black uppercase w-full text-white tracking-widest outline-none focus:border-[#A3E635]/30" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
              <button onClick={addCategory} className="w-full py-4 sm:py-5 bg-[#A3E635] text-slate-950 rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Plus size={14} className="sm:w-4 sm:h-4 shrink-0" /> {t('new_entry')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 sm:space-y-10 animate-in slide-in-from-right-10 duration-500">
          <div className="flex items-center gap-4 sm:gap-6">
            <button onClick={() => setSelectedCategoryId(null)} className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 text-slate-400 hover:text-white rounded-xl sm:rounded-2xl border border-white/5 flex items-center justify-center transition-all active:scale-90 shadow-xl shrink-0"><ChevronLeft size={24} className="sm:w-7 sm:h-7" /></button>
            <div className="text-left min-w-0">
              <h2 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tighter truncate">{selectedCategory?.name}</h2>
              <p className="text-[9px] sm:text-[10px] font-black text-[#A3E635] uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1">{t('node_definition_mode')}</p>
            </div>
          </div>
          
          <div className="premium-card overflow-hidden flex flex-col border-white/5 bg-slate-900/30">
             <div className="p-4 sm:p-6 lg:p-8 border-b border-white/5">
                <div className="flex items-center gap-4 mb-6">
                   <div className="size-10 bg-[#A3E635]/10 rounded-xl flex items-center justify-center">
                      <Package size={20} className="text-[#A3E635]" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">核心字段</h4>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">所有品类共有，不可编辑</p>
                   </div>
                </div>
                
                {/* 显示核心字段列表，但不可编辑 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {['brand', 'model', 'linkUrl', 'channel', 'price', 'monthlySales', 'rating', 'mainImage'].map((fieldId, index) => {
                      const fieldNames: Record<string, string> = {
                        brand: '品牌',
                        model: '产品名/型号',
                        linkUrl: '产品链接',
                        channel: '渠道/平台',
                        price: '价格',
                        monthlySales: '月销量',
                        rating: '评分',
                        mainImage: '主图'
                      };
                      return (
                        <div key={fieldId} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl border border-white/5">
                           <div className="size-8 bg-slate-900 rounded-lg flex items-center justify-center">
                              <Database size={14} className="text-slate-600" />
                           </div>
                           <div className="flex-1">
                              <p className="text-[10px] font-black text-white uppercase tracking-widest">{fieldNames[fieldId]}</p>
                              <p className="text-[8px] text-slate-500 uppercase tracking-widest">{fieldId}</p>
                           </div>
                           <div className="px-2 py-1 bg-[#A3E635]/10 border border-[#A3E635]/20 rounded-md">
                              <span className="text-[8px] font-black text-[#A3E635] uppercase">固定</span>
                           </div>
                        </div>
                      );
                   })}
                </div>
             </div>
             
             <div className="divide-y divide-white/5 p-4 sm:p-6 lg:p-8 max-h-[50vh] sm:max-h-[600px] overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-4 mb-6">
                   <div className="size-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <Settings2 size={20} className="text-indigo-400" />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-widest">品类参数</h4>
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{selectedCategory?.name} 特有属性</p>
                   </div>
                </div>
               {(selectedCategory?.fields ?? []).map((field, index) => (
                 <div 
                   key={field.id} 
                   draggable={!isEditing}
                   onDragStart={() => onDragStart(index)}
                   onDragOver={(e) => onDragOver(e, index)}
                   onDragEnd={onDragEnd}
                   className={`group draggable-item flex flex-col md:flex-row md:items-center justify-between py-4 sm:py-6 px-4 sm:px-6 rounded-2xl sm:rounded-3xl hover:bg-white/5 transition-all gap-4 sm:gap-6 ${draggedIndex === index ? 'dragging' : ''}`}
                 >
                   <div className="flex items-center gap-6 flex-1 text-left">
                     {/* 排序控制组 */}
                     <div className="flex flex-col gap-1 items-center shrink-0">
                        <div className="text-slate-800 hover:text-[#A3E635] transition-colors p-2 -ml-2 cursor-grab">
                            <GripVertical size={20} className="hidden md:block" />
                        </div>
                        {canEdit && !isEditing && (
                          <div className="flex flex-col gap-1">
                             <button 
                               onClick={() => moveField(index, 'up')} 
                               disabled={index === 0}
                               className={`p-1 rounded-md transition-all ${index === 0 ? 'text-slate-900 cursor-not-allowed' : 'text-slate-600 hover:text-[#A3E635] hover:bg-white/5'}`}
                             >
                               <ArrowUp size={14} />
                             </button>
                             <button 
                               onClick={() => moveField(index, 'down')} 
                               disabled={index === ((selectedCategory?.fields ?? []).length - 1)}
                               className={`p-1 rounded-md transition-all ${index === ((selectedCategory?.fields ?? []).length - 1) ? 'text-slate-900 cursor-not-allowed' : 'text-slate-600 hover:text-[#A3E635] hover:bg-white/5'}`}
                             >
                               <ArrowDown size={14} />
                             </button>
                          </div>
                        )}
                     </div>

                     {isEditing === field.id ? (
                        <div className="flex-1 space-y-4 animate-in slide-in-from-left-4 w-full">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-600 uppercase ml-1">{t('field_name')}</label>
                                <input value={editFieldName} onChange={e => setEditFieldName(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-white outline-none focus:border-[#A3E635]" />
                              </div>
                              <div className="space-y-1 relative">
                                <label className="text-[8px] font-black text-slate-600 uppercase ml-1">{t('field_type')}</label>
                                <div className="relative">
                                  <select value={editFieldType} onChange={e => setEditFieldType(e.target.value as FieldType)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-white outline-none appearance-none pr-10">
                                    {Object.values(FieldType).map(f => <option key={f} value={f} className="bg-slate-900">{t(`field_types.${f}`)}</option>)}
                                  </select>
                                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                                </div>
                              </div>
                           </div>
                           {requiresOptions(editFieldType) && (
                             <div className="space-y-1 text-left">
                                <label className="text-[8px] font-black text-[#A3E635] uppercase ml-1">{t('options_config')}</label>
                                <input value={editFieldOptions} onChange={e => setEditFieldOptions(e.target.value)} placeholder="Opt1, Opt2, Opt3..." className="w-full bg-slate-950 border border-[#A3E635]/20 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-[#A3E635] outline-none" />
                             </div>
                           )}
                           <div className="flex gap-4 pt-2">
                             <button onClick={saveEditField} className="flex-1 py-3 bg-[#A3E635] text-slate-950 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg"><Save size={14} /> {t('save_node')}</button>
                             <button onClick={() => setIsEditing(null)} className="px-6 py-3 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase"><X size={14} /></button>
                           </div>
                        </div>
                     ) : (
                        <div className="flex-1">
                          <p className="font-black text-white uppercase text-sm tracking-widest">{field.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-black uppercase text-[#818CF8] tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">{t(`field_types.${field.type}`)}</span>
                            {field.options && field.options.length > 0 && (
                              <span className="text-[8px] font-black uppercase text-slate-500 truncate max-w-[200px]">Opts: {field.options.join(', ')}</span>
                            )}
                          </div>
                        </div>
                     )}
                   </div>
                   
                   {canEdit && !isEditing && (
                      <div className="flex items-center gap-2 opacity-100 transition-opacity justify-end">
                        <button onClick={() => startEditField(field)} className="p-3 text-slate-500 hover:text-[#A3E635] bg-slate-800/50 rounded-xl border border-white/5 transition-all"><Edit3 size={18} /></button>
                        <button onClick={() => confirm(t('delete_confirm')) && onUpdateCategories(categories.map(c => c.id === selectedCategoryId ? { ...c, fields: (c.fields ?? []).filter(f => f.id !== field.id) } : c))} className="p-3 text-slate-500 hover:text-red-400 bg-slate-800/50 rounded-xl border border-white/5 transition-all"><Trash2 size={18} /></button>
                      </div>
                   )}
                 </div>
               ))}
             </div>
             
             {canEdit && (
               <div className="p-4 sm:p-6 lg:p-14 bg-slate-950/40 border-t border-white/5 space-y-6 sm:space-y-10">
                  <div className="flex items-center gap-3">
                    <Plus size={16} className="text-[#A3E635]" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{t('add_node')}</h4>
                  </div>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                       <div className="space-y-2">
                         <label className="text-[9px] font-black text-slate-600 uppercase ml-1 tracking-widest">{t('field_name')}</label>
                         <input placeholder="NODE IDENTIFIER..." className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-4 text-xs font-black uppercase text-white tracking-widest outline-none focus:border-[#A3E635]/40" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} />
                       </div>
                       <div className="space-y-2 relative">
                         <label className="text-[9px] font-black text-slate-600 uppercase ml-1 tracking-widest">{t('field_type')}</label>
                         <div className="relative">
                           <select className="w-full h-[58px] bg-slate-900 border border-white/5 rounded-2xl px-6 text-xs font-black uppercase text-white outline-none appearance-none pr-12" value={newFieldType} onChange={e => setNewFieldType(e.target.value as FieldType)}>
                             {Object.values(FieldType).map(f => <option key={f} value={f} className="bg-slate-900">{t(`field_types.${f}`)}</option>)}
                           </select>
                           <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                         </div>
                       </div>
                    </div>
                    {requiresOptions(newFieldType) && (
                      <div className="space-y-2 text-left animate-in slide-in-from-top-2">
                        <label className="text-[9px] font-black text-[#A3E635] uppercase ml-1 tracking-widest">{t('options_config')}</label>
                        <input placeholder="CSV Format: High, Medium, Low..." className="w-full bg-slate-900 border border-[#A3E635]/20 rounded-2xl px-6 py-4 text-xs font-black uppercase text-[#A3E635] tracking-widest outline-none" value={newFieldOptions} onChange={e => setNewFieldOptions(e.target.value)} />
                      </div>
                    )}
                    <button onClick={handleAddField} className="w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] hover:bg-[#A3E635] transition-all shadow-2xl active:scale-[0.98]">{t('add_node')}</button>
                  </div>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
