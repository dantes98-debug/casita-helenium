import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  color?: 'teal' | 'blue' | 'amber' | 'emerald' | 'indigo' | 'purple' | 'orange' | 'green' | 'yellow' | 'red'
  alert?: boolean
  subtitle?: string
}

const colorMap = {
  teal: 'bg-teal-50 border-teal-100',
  blue: 'bg-blue-50 border-blue-100',
  amber: 'bg-amber-50 border-amber-100',
  emerald: 'bg-emerald-50 border-emerald-100',
  indigo: 'bg-indigo-50 border-indigo-100',
  purple: 'bg-purple-50 border-purple-100',
  orange: 'bg-orange-50 border-orange-100',
  green: 'bg-green-50 border-green-100',
  yellow: 'bg-yellow-50 border-yellow-100',
  red: 'bg-red-50 border-red-100',
}

export function KPICard({ title, value, icon, color = 'teal', alert, subtitle }: KPICardProps) {
  return (
    <Card className={cn('border', colorMap[color], alert && 'ring-2 ring-red-200')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div className="shrink-0 ml-2">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
