// src/components/layout/app-shell.tsx
'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './sidebar';
import { BottomNav } from './bottom-nav';
import { TopHeader } from './top-header';
import { SupabaseAuthService } from '@/lib/supabase/auth-service';
import { CloudSyncService } from '@/lib/supabase/sync-service';
import { isLiveSupabaseConfigured } from '@/lib/supabase/client';
import { RefreshCw } from 'lucide-react';
import { PawIcon } from '@/components/ui/paw-icon';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const isStandalone =
    pathname === '/login' ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/confirmar-toma');

  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      if (!isLiveSupabaseConfigured()) {
        if (isMounted) {
          setIsAuthenticated(true);
          setCheckingAuth(false);
        }
        return;
      }

      try {
        const user = await SupabaseAuthService.getUser();
        if (!isMounted) return;

        if (!user) {
          setIsAuthenticated(false);
          setCheckingAuth(false);
          if (!isStandalone) {
            router.replace('/login');
          }
        } else {
          setIsAuthenticated(true);
          setCheckingAuth(false);
          // Initial cloud sync
          CloudSyncService.syncFromCloud().catch(console.warn);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setCheckingAuth(false);
          if (!isStandalone) {
            router.replace('/login');
          }
        }
      }
    }

    checkAuth();

    const handleSynced = () => {
      SupabaseAuthService.getUser().then((u) => {
        if (isMounted) {
          setIsAuthenticated(Boolean(u));
          if (!u && !isStandalone) {
            router.replace('/login');
          }
        }
      });
    };

    window.addEventListener('pawcare_synced', handleSynced);
    return () => {
      isMounted = false;
      window.removeEventListener('pawcare_synced', handleSynced);
    };
  }, [pathname, isStandalone, router]);

  if (isStandalone) {
    return <main className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950">{children}</main>;
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] dark:bg-stone-950 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 animate-in fade-in">
          <div className="w-12 h-12 rounded-2xl bg-[#E9EFEA] dark:bg-emerald-950/50 text-[#3E5A4D] dark:text-emerald-400 flex items-center justify-center shadow-xs">
            <PawIcon className="w-6 h-6 fill-current animate-pulse" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#606763] dark:text-stone-400">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#3E5A4D] dark:text-emerald-400" />
            <span>Verificando sesión en PawCare...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Redirecting to /login
  }

  return (
    <div className="flex min-h-screen bg-[#FAF8F5] dark:bg-stone-950">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <TopHeader />
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
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
