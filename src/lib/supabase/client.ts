import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/**
 * Cliente Supabase para uso em Client Components e Server Actions.
 * A chave publishable (sb_publishable_…) é segura para expor no browser.
 */
export const supabase = createClient(supabaseUrl, supabaseKey)
