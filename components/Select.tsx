import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string; label: string };

type Props = {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  'data-testid'?: string;
};

/**
 * 自定义下拉框：下拉列表用 DOM 渲染，在 Windows Chrome 等环境下与闭合框保持同一套深色 UI，避免原生 select 选项列表丢失样式。
 */
export const Select: React.FC<Props> = ({
  options,
  value,
  onChange,
  placeholder = '',
  className = '',
  leftIcon,
  rightIcon,
  'data-testid': dataTestId,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : placeholder;

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const baseClass =
    'w-full bg-slate-900/50 border border-white/5 rounded-xl pl-11 pr-10 py-3.5 text-[10px] font-black uppercase text-white outline-none cursor-pointer transition-all hover:border-white/10 focus:border-[#A3E635]/40';
  const listClass =
    'absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-xl py-1 custom-scrollbar';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        data-testid={dataTestId}
        onClick={() => setOpen((o) => !o)}
        className={`${baseClass} flex items-center justify-between gap-2 text-left ${className}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={currentLabel || placeholder}
      >
        <span className="flex items-center gap-2 min-w-0">
          {leftIcon && <span className="shrink-0 text-slate-500">{leftIcon}</span>}
          <span className="truncate">{currentLabel || placeholder}</span>
        </span>
        {rightIcon ?? <ChevronDown size={14} className="shrink-0 text-slate-600" />}
      </button>
      {open && (
        <ul
          role="listbox"
          className={listClass}
          style={{ minWidth: containerRef.current?.offsetWidth ?? undefined }}
        >
          {options.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`px-4 py-2.5 text-[10px] font-black uppercase cursor-pointer transition-colors ${
                value === opt.value
                  ? 'bg-[#A3E635]/20 text-[#A3E635]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
