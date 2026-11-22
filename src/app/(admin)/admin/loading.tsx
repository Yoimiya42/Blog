/** Placeholder while an admin page renders on the server. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading" role="status">
      <div className="h-8 w-40 animate-pulse rounded-control bg-foreground/5" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2].map((row) => (
          <div
            className="h-16 animate-pulse rounded-card bg-card ring-1 ring-border"
            key={row}
          />
        ))}
      </div>
    </div>
  );
}
