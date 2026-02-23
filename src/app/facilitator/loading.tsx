export default function FacilitatorLoading() {
  return (
    <div className="flex items-center justify-center min-h-[40vh]" aria-hidden>
      <div className="flex flex-col items-center gap-3">
        <div className="loading loading-spinner loading-primary text-primary" style={{ width: 40, height: 40 }} />
        <p className="text-sm text-base-content/60 font-body">Loading…</p>
      </div>
    </div>
  );
}
