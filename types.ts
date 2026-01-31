
export enum FieldType {
  TEXT = 'text',
  NUMBER = 'number',
  URL = 'url',
  IMAGE = 'image',
  TEXTAREA = 'textarea',
  RATING = 'rating',
  SELECT = 'select',
  DATE = 'date',
  MULTI_SELECT_QUANTITY = 'multi_select_quantity'
}

export interface ProductField {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  isSystem?: boolean;
  options?: string[];
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  fields: ProductField[];
}

export interface ProductData {
  id: string;
  categoryId: string;
  createdAt: number;
  updatedAt?: number;
  updatedBy?: string;
  [key: string]: any;
}

export type UserRole = 'admin' | 'editor' | 'viewer';
export type Language = 'en' | 'zh' | 'ja';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  avatar?: string;
  isOnline?: boolean;
}

export interface AppState {
  categories: Category[];
  products: ProductData[];
  users: User[];
  currentUser: User | null;
  view: 'dashboard' | 'inventory' | 'settings' | 'users';
  language: Language;
  isSyncing: boolean;
  cloudConnected: boolean;
}
