export default function MitraLoading() {
  return (
    <div className="dashboard-skeleton" role="status" aria-live="polite">
      <div className="skeleton-bar skeleton-topbar" />
      <div className="skeleton-body">
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-bar skeleton-card" />
        <div className="skeleton-bar skeleton-card" />
        <div className="skeleton-bar skeleton-card" />
      </div>
      <span className="sr-only">Memuat halaman Anda…</span>
    </div>
  );
}
