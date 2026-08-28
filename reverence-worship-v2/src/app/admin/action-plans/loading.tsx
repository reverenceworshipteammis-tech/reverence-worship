export default function ConsolidatedActionPlansLoading() {
  return (
    <main className="mx-auto max-w-7xl animate-pulse space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:px-5">
      <div className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="h-28 rounded-2xl border border-slate-200 bg-white shadow-sm" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-36 rounded-2xl border border-slate-200 bg-white shadow-sm" />)}
      </div>
      <div className="h-80 rounded-2xl border border-slate-200 bg-white shadow-sm" />
    </main>
  );
}
