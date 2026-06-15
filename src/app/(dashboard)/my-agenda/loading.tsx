export default function MyAgendaLoading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-40" />
      <div className="h-10 bg-gray-100 rounded-lg w-64" />
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="h-14 bg-gray-100 border-b border-gray-200" />
        <div className="h-[600px] bg-white" />
      </div>
    </div>
  )
}
