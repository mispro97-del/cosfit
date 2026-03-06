export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <nav className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <span className="text-lg font-bold tracking-tight">COSFIT</span>
        </nav>
      </header>
      <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
    </div>
  );
}
