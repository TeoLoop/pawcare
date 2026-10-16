// src/components/layout/app-shell.tsx
'use client';

import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TopHeader } from './top-header';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { createClient, isLiveSupabaseConfigured } from '@/lib/supabase/client';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const isStandalone =
    pathname === '/login' ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/confirmar-toma');

  useEffect(() => {
    if (!isLiveSupabaseConfigured() || isStandalone) return;

    SupabaseAuthService.getUser().then((user) => {
      if (!user) {
        router.replace('/login');
      }
    });

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user && !isStandalone) {
        router.replace('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [isStandalone, router]);

  if (isStandalone) {
    return <main className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950">{children}</main>;
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] dark:bg-stone-950">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-28 md:pb-8">
        <TopHeader />
        <main className="flex-1 max-w-5xl w-full mx-auto px-3.5 sm:px-6 lg:px-8 py-3.5 sm:py-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950" />}>
      <ShellInner>{children}</ShellInner>
    </Suspense>
  );
}
