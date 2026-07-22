import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Cliente Supabase para uso em Client Components.
 * Usa cookies (via @supabase/ssr) em vez de localStorage, para que a sessão
 * seja visível também no servidor (Server Components, Server Actions e proxy.ts).
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
