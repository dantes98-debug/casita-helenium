export default function AppointmentsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-32" />
        <div className="h-9 bg-gray-200 rounded w-36" />
      </div>
      <div className="h-10 bg-gray-100 rounded-lg w-72" />
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-14 bg-gray-100 border-b border-gray-200" />
        <div className="grid grid-cols-7 gap-0" style={{ height: 600 }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-r last:border-r-0 border-gray-100 bg-white" />
          ))}
        </div>
      </div>
    </div>
  )
}
