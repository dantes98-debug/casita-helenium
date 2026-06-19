import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MyProfileForm } from '@/components/professionals/my-profile-form'

export default async function MyProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let { data: professional } = await supabase
    .from('professionals')
    .select('id, first_name, last_name, profession, specialty, phone, email, address, dni, cuit, license_number, availability_notes, observations')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!professional && user.email) {
    const { data: byEmail } = await supabase
      .from('professionals')
      .select('id, first_name, last_name, profession, specialty, phone, email, address, dni, cuit, license_number, availability_notes, observations')
      .eq('email', user.email)
      .maybeSingle()
    professional = byEmail
  }

  if (!professional) redirect('/my-agenda')

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 text-sm">Tus datos de contacto y profesionales</p>
      </div>
      <MyProfileForm professional={professional} />
    </div>
  )
}
