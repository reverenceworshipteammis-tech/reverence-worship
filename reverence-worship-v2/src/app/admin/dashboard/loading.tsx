export default function DashboardLoading() {
  return (
    <div className="super-admin-dashboard mx-auto max-w-7xl animate-pulse px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
      <div className="mb-4 h-36 rounded-xl border border-slate-200 bg-white" />
      <div className="mb-3 h-6 w-40 rounded bg-slate-200" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
    </div>
  );
}
