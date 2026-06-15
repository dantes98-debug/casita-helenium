'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Search, User, UserCheck, Calendar, X, ArrowRight, Loader2 } from 'lucide-react'

interface Result {
  id: string
  type: 'patient' | 'professional' | 'appointment'
  title: string
  subtitle: string
  href: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const router = useRouter()

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Search
  useEffect(() => {
    if (!open || query.trim().length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      const supabase = createClient()
      const q = query.trim()

      const [{ data: patients }, { data: professionals }] = await Promise.all([
        supabase.from('patients')
          .select('id, first_name, last_name, status, primary_professional_id')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .is('deleted_at', null).limit(5),
        supabase.from('professionals')
          .select('id, first_name, last_name, profession')
          .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%`)
          .is('deleted_at', null).limit(4),
      ])

      const r: Result[] = [
        ...(patients ?? []).map(p => ({
          id: p.id,
          type: 'patient' as const,
          title: `${p.last_name}, ${p.first_name}`,
          subtitle: p.status === 'active' ? 'Paciente activo' : p.status === 'waiting_list' ? 'Lista de espera' : p.status ?? '',
          href: `/patients/${p.id}`,
        })),
        ...(professionals ?? []).map(p => ({
          id: p.id,
          type: 'professional' as const,
          title: `${p.last_name}, ${p.first_name}`,
          subtitle: p.profession ?? 'Profesional',
          href: `/professionals/${p.id}`,
        })),
      ]
      setResults(r)
      setSelected(0)
      setLoading(false)
    }, 200)
    return () => clearTimeout(timer)
  }, [query, open])

  const navigate = useCallback((href: string) => {
    router.push(href)
    setOpen(false)
    setQuery('')
    setResults([])
  }, [router])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
      if (e.key === 'Enter' && results[selected]) navigate(results[selected].href)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selected, navigate])

  if (!open) return null

  const icons = {
    patient: <User className="h-4 w-4 text-teal-500" />,
    professional: <UserCheck className="h-4 w-4 text-blue-500" />,
    appointment: <Calendar className="h-4 w-4 text-purple-500" />,
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {loading ? <Loader2 className="h-5 w-5 text-gray-400 animate-spin flex-shrink-0" /> : <Search className="h-5 w-5 text-gray-400 flex-shrink-0" />}
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar paciente, profesional..."
            className="flex-1 text-sm outline-none placeholder:text-gray-400"
          />
          {query && (
            <button onClick={() => { setQuery(''); setResults([]) }} className="text-gray-400 hover:text-gray-600">
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">Esc</kbd>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <ul className="max-h-72 overflow-y-auto py-2">
            {results.map((r, i) => (
              <li key={r.id}>
                <button
                  onMouseEnter={() => setSelected(i)}
                  onClick={() => navigate(r.href)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? 'bg-teal-50' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${i === selected ? 'bg-teal-100' : 'bg-gray-100'}`}>
                    {icons[r.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-xs text-gray-400">{r.subtitle}</p>
                  </div>
                  {i === selected && <ArrowRight className="h-4 w-4 text-teal-400 flex-shrink-0" />}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Empty state */}
        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            Sin resultados para <strong className="text-gray-600">"{query}"</strong>
          </div>
        )}

        {/* Hint */}
        {query.length < 2 && (
          <div className="px-4 py-4 flex flex-wrap gap-2">
            {[
              { label: 'Ir a pacientes', href: '/patients' },
              { label: 'Nueva cita', href: '/appointments/new' },
              { label: 'Ir a caja', href: '/cash' },
              { label: 'Consultorios', href: '/rooms' },
            ].map(s => (
              <button
                key={s.href}
                onClick={() => navigate(s.href)}
                className="text-xs text-gray-500 border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 transition-colors"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="border border-gray-200 rounded px-1">↑↓</kbd> navegar</span>
          <span><kbd className="border border-gray-200 rounded px-1">Enter</kbd> abrir</span>
          <span><kbd className="border border-gray-200 rounded px-1">Esc</kbd> cerrar</span>
        </div>
      </div>
    </div>
  )
}
