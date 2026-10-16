// src/app/loading.tsx
import React from 'react';

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[50vh] p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#E9EFEA] flex items-center justify-center text-[#3E5A4D] shadow-xs animate-pulse">
          🐾
        </div>
        <p className="text-xs font-semibold text-[#606763]">Cargando PawCare...</p>
      </div>
    </div>
  );
}
