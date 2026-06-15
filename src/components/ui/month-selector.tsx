'use client'

import { useRouter } from 'next/navigation'
import { format, subMonths, startOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

export function MonthSelector({ activeMonth }: { activeMonth: string }) {
  const router = useRouter()
  const months = Array.from({ length: 12 }, (_, i) =>
    startOfMonth(subMonths(new Date(), 11 - i))
  )

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {months.map(month => {
        const value = format(month, 'yyyy-MM')
        const label = format(month, 'MMM yyyy', { locale: es })
        const isActive = value === activeMonth
        return (
          <button
            key={value}
            onClick={() => router.push(`?month=${value}`)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {label.charAt(0).toUpperCase() + label.slice(1)}
          </button>
        )
      })}
    </div>
  )
}
