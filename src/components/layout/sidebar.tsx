'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, UserCircle, Calendar, CreditCard,
  AlertCircle, BarChart3, Settings, LogOut, Heart, ClipboardList,
  DollarSign, TrendingUp, Shield, Inbox, Moon, Sun, Building2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { UserRole } from '@/types/database'
import { useState } from 'react'

interface NavItem {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

interface NavGroup {
  label?: string
  roles?: UserRole[]
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'coordinator'] },
      { href: '/my-dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['professional'] },
      { href: '/my-agenda', label: 'Mi agenda', icon: Calendar, roles: ['professional', 'super_admin', 'admin', 'coordinator'] },
      { href: '/admissions', label: 'Admisiones', icon: Inbox, roles: ['super_admin', 'admin', 'coordinator'] },
    ],
  },
  {
    label: 'Clínica',
    roles: ['super_admin', 'admin', 'coordinator'],
    items: [
      { href: '/patients', label: 'Pacientes', icon: UserCircle, roles: ['super_admin', 'admin', 'coordinator'] },
      { href: '/professionals', label: 'Profesionales', icon: Users, roles: ['super_admin', 'admin', 'coordinator'] },
      { href: '/appointments', label: 'Agenda', icon: Calendar, roles: ['super_admin', 'admin', 'coordinator'] },
      { href: '/schedule', label: 'Consultorios', icon: Building2, roles: ['super_admin', 'admin', 'coordinator'] },
    ],
  },
  {
    label: 'Pacientes',
    roles: ['professional'],
    items: [
      { href: '/patients', label: 'Pacientes', icon: UserCircle, roles: ['professional'] },
    ],
  },
  {
    label: 'Finanzas',
    roles: ['super_admin', 'admin'],
    items: [
      { href: '/payments', label: 'Pagos', icon: CreditCard, roles: ['super_admin', 'admin'] },
      { href: '/debts', label: 'Deudas', icon: AlertCircle, roles: ['super_admin', 'admin'] },
      { href: '/settlements', label: 'Liquidaciones', icon: DollarSign, roles: ['super_admin', 'admin'] },
      { href: '/cash', label: 'Caja', icon: TrendingUp, roles: ['super_admin', 'admin'] },
      { href: '/reports', label: 'Reportes', icon: BarChart3, roles: ['super_admin', 'admin', 'coordinator'] },
    ],
  },
  {
    label: 'Sistema',
    roles: ['super_admin', 'admin'],
    items: [
      { href: '/users', label: 'Usuarios', icon: Shield, roles: ['super_admin'] },
      { href: '/audit', label: 'Auditoría', icon: ClipboardList, roles: ['super_admin'] },
      { href: '/settings', label: 'Configuración', icon: Settings, roles: ['super_admin', 'admin'] },
    ],
  },
]

interface SidebarProps {
  userRole?: UserRole
  userName?: string
  collapsed?: boolean
}

export function Sidebar({ userRole = 'admin', userName, collapsed = false }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isDark, setIsDark] = useState(false)

  function toggleDark() {
    document.documentElement.classList.toggle('dark')
    setIsDark(prev => !prev)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Sesión cerrada')
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-teal-900 text-white transition-all duration-300',
      collapsed ? 'w-16' : 'w-56'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-teal-800">
        <Heart className="h-6 w-6 text-teal-300 fill-teal-500 shrink-0" />
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">La Casita Helenium</p>
            <p className="text-[11px] text-teal-400 truncate">Sistema de Gestión</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navGroups.map((group, gi) => {
          // Filter items visible to this role
          const visibleItems = group.items.filter(item =>
            !item.roles || item.roles.includes(userRole)
          )
          // Hide entire group if no visible items or group role doesn't match
          if (visibleItems.length === 0) return null
          if (group.roles && !group.roles.includes(userRole)) return null

          return (
            <div key={gi} className={gi > 0 ? 'pt-3' : ''}>
              {group.label && !collapsed && (
                <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-teal-500">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && <div className="border-t border-teal-800 my-1 mx-1" />}
              <div className="space-y-0.5">
                {visibleItems.map(item => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors',
                        isActive
                          ? 'bg-teal-700 text-white'
                          : 'text-teal-200 hover:bg-teal-800 hover:text-white'
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-teal-800 p-3 space-y-1.5">
        {!collapsed && userName && (
          <div className="px-2 pb-1">
            <p className="text-[11px] text-teal-400">Conectado como</p>
            <p className="text-xs font-medium text-white truncate">{userName}</p>
            <p className="text-[11px] text-teal-400 capitalize">{userRole?.replace('_', ' ')}</p>
          </div>
        )}
        <button
          onClick={toggleDark}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-[13px] text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
          {!collapsed && <span>{isDark ? 'Modo claro' : 'Modo oscuro'}</span>}
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-md text-[13px] text-teal-200 hover:bg-teal-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  )
}
