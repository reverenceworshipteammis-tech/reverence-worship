export default function AdminLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl animate-pulse space-y-4 px-3 py-4 sm:px-4 lg:px-5">
      <div className="space-y-2">
        <div className="h-7 w-48 rounded bg-slate-200" />
        <div className="h-4 w-72 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="h-80 rounded-xl border border-slate-200 bg-white" />
    </div>
  );
}
