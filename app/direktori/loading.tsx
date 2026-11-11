import "./direktori-usaha.css";

export default function DirektoriLoading() {
  return (
    <div className="dashboard-skeleton" role="status" aria-live="polite">
      <div className="skeleton-bar skeleton-topbar" />
      <div className="skeleton-body">
        <div className="skeleton-bar skeleton-title" />
        <div className="skeleton-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton-bar skeleton-tile" />
          ))}
        </div>
      </div>
      <span className="sr-only">Memuat Direktori Usaha…</span>
    </div>
  );
}
