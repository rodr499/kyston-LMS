export default function LoginLoading() {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4" aria-hidden>
      <div className="flex flex-col items-center gap-3">
        <div className="loading loading-spinner loading-primary text-primary" style={{ width: 40, height: 40 }} />
        <p className="text-sm text-base-content/60 font-body">Loading…</p>
      </div>
    </div>
  );
}
