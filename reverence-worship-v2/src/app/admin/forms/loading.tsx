export default function FormsLoading() {
  return <div role="status" aria-live="polite" className="space-y-3 p-4"><p className="text-sm text-slate-500">Opening form…</p>{[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none" aria-hidden="true" />)}</div>;
}
