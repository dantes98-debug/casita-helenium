export default function PatientsLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="h-9 bg-gray-200 rounded w-36" />
      </div>
      <div className="h-10 bg-gray-100 rounded-lg w-64" />
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-12 bg-gray-100" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 border-t border-gray-100 bg-white px-4 flex items-center gap-4">
            <div className="h-4 bg-gray-200 rounded w-40" />
            <div className="h-4 bg-gray-100 rounded w-24" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}
