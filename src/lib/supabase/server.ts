import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

if (typeof window !== 'undefined') {
  throw new Error('supabase/server imported in browser context — use supabase/client instead')
}

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - cookies can't be set
          }
        },
      },
    }
  )
}
