// src/lib/supabase/service.ts
import { createClient } from '@supabase/supabase-js';

/**
 * Returns a Supabase client with the service role key.
 * Strictly for server-side endpoints (Meta webhooks, scheduled background cron)
 * and NEVER exposed to client-side code.
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'dev-service-role-placeholder';

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
