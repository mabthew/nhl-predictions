import { getSession } from "@/lib/auth";
import AdminNav from "@/components/AdminNav";
import LogoutButton from "@/components/LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-light-gray">
      <header className="bg-charcoal text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="font-teko text-3xl font-bold tracking-wide">
            Admin
          </h1>
          <AdminNav />
        </div>
        <div className="flex items-center gap-3">
          {session && (
            <span className="text-xs text-white/50">{session.email}</span>
          )}
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
}
