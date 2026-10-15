// src/app/confirmar-toma/[token]/page.tsx
import React, { Suspense } from 'react';
import { ConfirmarClient } from './confirmar-client';

async function TokenResolver({ params }: { params: Promise<{ token: string }> }) {
  const resolved = await params;
  return <ConfirmarClient token={resolved.token} />;
}

export default function ConfirmarTomaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
          <div className="text-center text-[#606763]">
            <div className="w-10 h-10 border-3 border-[#3E5A4D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium">Cargando verificación segura de toma...</p>
          </div>
        </div>
      }
    >
      <TokenResolver params={params} />
    </Suspense>
  );
}
