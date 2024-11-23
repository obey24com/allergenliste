export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/40 dark:bg-gray-900/40">
      <main className="container mx-auto py-8 max-w-7xl">{children}</main>
    </div>
  );
}