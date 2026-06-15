import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? req.headers.get('x-real-ip') ?? 'unknown'

    let email: string, password: string
    try {
      const body = await req.json()
      email = body.email
      password = body.password
    } catch {
      return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })
    }

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

    const authBody = await authRes.json()
    const success = authRes.ok

    // Record attempt (non-critical — ignore errors)
    try {
      await supabaseAdmin.from('login_attempts').insert({ ip_address: ip, email, success })
    } catch { /* ignore */ }

    if (!success) {
      const remaining = MAX_ATTEMPTS - (count ?? 0) - 1
      const msg = remaining <= 2 && remaining > 0
        ? `Credenciales incorrectas. Te quedan ${remaining} intento${remaining === 1 ? '' : 's'}.`
        : (authBody?.error_description ?? authBody?.msg ?? 'Credenciales incorrectas')
      return NextResponse.json({ error: msg }, { status: 401 })
    }

    return NextResponse.json({ access_token: authBody.access_token, refresh_token: authBody.refresh_token })
  } catch (err) {
    console.error('[login] unexpected error:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
