import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verificar que el usuario actual es super_admin o admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { email, password, role, full_name, profession } = await req.json()
  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  // Crear usuario con service role key
  const adminClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  const { data: newUser, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || email },
  })

  if (error) {
    console.error('[users/create] auth.admin.createUser error:', JSON.stringify(error))
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Asignar rol
  await adminClient.from('profiles').update({ role, full_name: full_name || email }).eq('id', newUser.user.id)

  // Si es profesional, crear su ficha automáticamente
  if (role === 'professional') {
    const nameParts = (full_name || '').trim().split(' ')
    const lastName = nameParts.length > 1 ? nameParts.pop()! : ''
    const firstName = nameParts.join(' ') || email

    const { error: profError } = await adminClient.from('professionals').insert({
      user_id: newUser.user.id,
      email,
      first_name: firstName,
      last_name: lastName,
      profession: profession || 'Profesional',
      status: 'active',
      type: 'internal',
      dni: '',
    })
    if (profError) {
      console.error('[users/create] professionals.insert error:', JSON.stringify(profError))
      // No falla el request — el usuario se creó igual, el admin puede completar la ficha
    }
  }

  return NextResponse.json({ ok: true, id: newUser.user.id })
}
