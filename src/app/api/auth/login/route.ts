import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 })
  }

  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Check rate limit: max 5 failed attempts per IP in last 15 minutes
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count } = await supabaseAdmin
    .from('login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('success', false)
    .gte('created_at', windowStart)

  if ((count ?? 0) >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: `Demasiados intentos fallidos. Esperá ${WINDOW_MINUTES} minutos antes de intentar nuevamente.` },
      { status: 429 }
    )
  }

  // Attempt login via Supabase Auth REST (server-side)
  const authRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
    body: JSON.stringify({ email, password }),
  })

  const success = authRes.ok

  // Record attempt
  await supabaseAdmin.from('login_attempts').insert({ ip_address: ip, email, success })

  if (!success) {
    const remaining = MAX_ATTEMPTS - (count ?? 0) - 1
    const body = await authRes.json()
    const msg = remaining <= 2 && remaining > 0
      ? `Credenciales incorrectas. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`
      : (body?.error_description ?? body?.msg ?? 'Credenciales incorrectas')
    return NextResponse.json({ error: msg }, { status: 401 })
  }

  // Return tokens to client so it can set the session
  const tokens = await authRes.json()
  return NextResponse.json({ access_token: tokens.access_token, refresh_token: tokens.refresh_token })
}
