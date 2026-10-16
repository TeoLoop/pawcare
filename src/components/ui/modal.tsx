// src/components/ui/modal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  headerAction?: React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  headerAction,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-white dark:bg-[#1C1E1D] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#E5E1D6] dark:border-stone-800 shadow-2xl w-full ${maxWidth} max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200`}
      >
        {/* Mobile handle pull bar */}
        <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mt-2.5 sm:hidden" />

        <div className="flex items-center justify-between px-5 pt-3.5 pb-3 sm:p-5 border-b border-[#EFECE5] dark:border-stone-800">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="text-base sm:text-lg font-bold text-[#222624] dark:text-stone-100 tracking-tight truncate">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-[#606763] dark:text-stone-400 mt-0.5 truncate">
                {description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-[#8E9490] hover:text-[#222624] hover:bg-[#FAF8F5] dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 pb-8 sm:pb-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
