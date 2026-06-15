'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Calendar, Users, FileText, Building2, Heart,
  ChevronRight, ChevronLeft, CheckCircle2, X, Sparkles,
  ClipboardList, Clock, ArrowRight
} from 'lucide-react'

interface Step {
  icon: React.ReactNode
  color: string
  title: string
  description: string
  detail: string
  action?: { label: string; href: string }
  visual: React.ReactNode
}

const steps: Step[] = [
  {
    icon: <Heart className="h-8 w-8" />,
    color: 'from-teal-500 to-emerald-500',
    title: '¡Bienvenido/a a La Casita Helenium!',
    description: 'Este es tu sistema de gestión. En 4 pasos te mostramos todo lo que podés hacer.',
    detail: 'Navegá a tu ritmo. Podés cerrar este tutorial en cualquier momento y volver a él desde el menú.',
    visual: (
      <div className="flex items-center justify-center h-40">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center animate-pulse">
            <Heart className="h-12 w-12 text-teal-500 fill-teal-200" />
          </div>
          <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-400 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: <Calendar className="h-8 w-8" />,
    color: 'from-blue-500 to-indigo-500',
    title: 'Tus turnos',
    description: 'En Agenda vas a ver todos tus turnos del día, la semana y el mes.',
    detail: 'Podés ver qué paciente tenés en cada horario, el estado del turno y registrar si se realizó o no.',
    action: { label: 'Ir a mi agenda', href: '/appointments' },
    visual: (
      <div className="bg-white rounded-xl border border-blue-100 p-3 shadow-sm">
        {[
          { hora: '09:00', pac: 'García, Ana', estado: 'Confirmado', color: 'bg-green-100 text-green-700' },
          { hora: '10:30', pac: 'López, Carlos', estado: 'Por confirmar', color: 'bg-yellow-100 text-yellow-700' },
          { hora: '12:00', pac: 'Martínez, Sofía', estado: 'Confirmado', color: 'bg-green-100 text-green-700' },
        ].map((t, i) => (
          <div key={i} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <span className="text-xs font-mono text-gray-400 w-10">{t.hora}</span>
            <span className="text-sm font-medium text-gray-700 flex-1">{t.pac}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${t.color}`}>{t.estado}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <FileText className="h-8 w-8" />,
    color: 'from-violet-500 to-purple-500',
    title: 'Tus pacientes e historias clínicas',
    description: 'Accedé a la ficha completa de cada paciente y registrá evoluciones.',
    detail: 'Tus notas clínicas son privadas — solo vos y los super administradores pueden verlas.',
    action: { label: 'Ver mis pacientes', href: '/patients' },
    visual: (
      <div className="bg-white rounded-xl border border-violet-100 p-3 shadow-sm space-y-2">
        <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-sm font-bold text-violet-600">GA</div>
          <div>
            <p className="text-sm font-medium text-gray-700">García, Ana</p>
            <p className="text-xs text-gray-400">Activa · 14 sesiones</p>
          </div>
        </div>
        <div className="bg-violet-50 rounded-lg p-2">
          <p className="text-xs text-violet-700 font-medium mb-1 flex items-center gap-1"><ClipboardList className="h-3 w-3" /> Última evolución</p>
          <p className="text-xs text-gray-500">Sesión 14 — Se trabajó sobre patrones de evitación...</p>
        </div>
      </div>
    ),
  },
  {
    icon: <Building2 className="h-8 w-8" />,
    color: 'from-amber-500 to-orange-500',
    title: 'Reservar un consultorio',
    description: 'Reservá el espacio que necesitás directamente desde la agenda de consultorios.',
    detail: 'El sistema evita automáticamente superposiciones. Si el horario está tomado, te avisa al instante.',
    action: { label: 'Ver consultorios', href: '/rooms' },
    visual: (
      <div className="bg-white rounded-xl border border-amber-100 p-3 shadow-sm">
        <div className="grid grid-cols-3 gap-1 mb-2">
          {['Consultorio 1', 'Consultorio 2', 'Consultorio 3'].map((r, i) => (
            <div key={i} className="text-center">
              <div className="text-[10px] font-medium text-gray-500 mb-1">{r}</div>
              <div className={`h-8 rounded text-[10px] flex items-center justify-center font-medium ${i === 0 ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-gray-50 text-gray-400 border border-dashed border-gray-200'}`}>
                {i === 0 ? 'Reservado' : 'Libre'}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <Clock className="h-3 w-3" />
          <span>Lun 14 — 10:00 a 12:00</span>
        </div>
      </div>
    ),
  },
  {
    icon: <CheckCircle2 className="h-8 w-8" />,
    color: 'from-teal-500 to-green-500',
    title: '¡Todo listo!',
    description: 'Ya conocés lo principal. El sistema tiene mucho más para explorar.',
    detail: '¿Dudas? Contactá al administrador del centro. Que tengas una excelente jornada.',
    visual: (
      <div className="flex flex-col items-center justify-center h-40 gap-3">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
          </div>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-green-400 animate-bounce"
              style={{
                top: `${50 + 36 * Math.sin(i * Math.PI / 3)}%`,
                left: `${50 + 36 * Math.cos(i * Math.PI / 3)}%`,
                animationDelay: `${i * 100}ms`,
              }}
            />
          ))}
        </div>
        <p className="text-sm font-medium text-gray-600">¡Bienvenido/a al equipo!</p>
      </div>
    ),
  },
]

export function ProfessionalOnboarding({ userId, userName }: { userId: string; userName?: string | null }) {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const [closing, setClosing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Small delay so the page loads first, then the modal appears smoothly
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  async function complete() {
    const supabase = createClient()
    await supabase.from('profiles').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', userId)
    startClose()
  }

  function startClose() {
    setClosing(true)
    setTimeout(() => setVisible(false), 300)
  }

  function goTo(href: string) {
    complete()
    router.push(href)
  }

  if (!visible) return null

  const current = steps[step]
  const isLast = step === steps.length - 1
  const isFirst = step === 0
  const progress = ((step + 1) / steps.length) * 100

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.4)' }}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-all duration-300 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ transform: closing ? 'scale(0.95) translateY(20px)' : 'scale(1) translateY(0)' }}
      >
        {/* Header gradient */}
        <div className={`bg-gradient-to-r ${current.color} p-6 text-white relative`}>
          <button
            onClick={startClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="text-white/90">{current.icon}</div>
            {!isFirst && (
              <span className="text-white/70 text-xs font-medium uppercase tracking-wider">
                Paso {step} de {steps.length - 1}
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold leading-tight">
            {isFirst && userName ? `¡Hola, ${userName?.split(' ')[0]}! ` : ''}
            {current.title}
          </h2>
          <p className="text-white/80 text-sm mt-1">{current.description}</p>

          {/* Progress bar */}
          <div className="mt-4 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white/80 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Visual */}
          <div>{current.visual}</div>

          {/* Detail text */}
          <p className="text-sm text-gray-500 leading-relaxed">{current.detail}</p>

          {/* Step dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`transition-all duration-300 rounded-full ${i === step ? 'w-6 h-2 bg-teal-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'}`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(s => s - 1)}
              disabled={isFirst}
              className="text-gray-400"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>

            <div className="flex items-center gap-2">
              {current.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goTo(current.action!.href)}
                  className="text-teal-600 border-teal-200 hover:bg-teal-50"
                >
                  {current.action.label}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              )}
              {isLast ? (
                <Button onClick={complete} className="bg-teal-600 hover:bg-teal-700">
                  <CheckCircle2 className="h-4 w-4 mr-2" />¡Empezar!
                </Button>
              ) : (
                <Button onClick={() => setStep(s => s + 1)} className="bg-teal-600 hover:bg-teal-700">
                  Siguiente<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          {/* Skip */}
          {!isLast && (
            <div className="text-center">
              <button onClick={complete} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Saltar tutorial
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
