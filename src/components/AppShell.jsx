/**
 * Outer kiosk shell: admin corner tap + centered max-width column.
 */
export function AppShell({
  children,
  welcome,
  adminLabel,
  onAdminCornerTap,
}) {
  return (
    <div className="relative min-h-screen bg-[#f5f5f5] text-ink">
      <button
        type="button"
        aria-label={adminLabel}
        className="absolute right-0 top-0 z-50 h-16 w-16 opacity-0"
        onClick={onAdminCornerTap}
      />

      <div
        className={`mx-auto flex min-h-screen w-full max-w-kiosk flex-col shadow-xl ${
          welcome ? 'bg-black' : 'bg-white'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
