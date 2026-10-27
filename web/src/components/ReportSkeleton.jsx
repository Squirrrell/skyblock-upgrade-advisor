// Same shape as the report so nothing jumps when the data arrives.
export default function ReportSkeleton() {
  return (
    <div className="pt-8" aria-busy="true" aria-label="Loading profile">
      <div className="flex items-center gap-4">
        <div className="skeleton size-[calc(var(--px)*30)]" />
        <div className="flex flex-col gap-2">
          <div className="skeleton h-6 w-44" />
          <div className="skeleton h-4 w-64" />
        </div>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-[1.4fr_1fr_1fr]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-32" />
        ))}
      </div>
      <div className="skeleton mt-6 h-56" />
      <div className="mt-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton h-9 w-28" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-20" />
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">Loading the profile and scanning prices. The first lookup after a restart can take a few seconds.</p>
    </div>
  );
}
