import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Solar CRM",
  description: "CRM pentru management clienți și proiecte",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
     <body className="min-h-screen flex flex-col md:flex-row">

        {/* SIDEBAR */}
        <aside className="w-64 bg-gray-900 text-white p-4 space-y-3">
          <h1 className="text-xl font-bold mb-4">☀️ Solar CRM</h1>

          <nav className="space-y-2">
            <Link href="/" className="block hover:text-gray-300">
              Dashboard
            </Link>

            <Link href="/clients" className="block hover:text-gray-300">
              Clienți
            </Link>

            <Link href="/projects" className="block hover:text-gray-300">
              Proiecte
            </Link>
          </nav>
        </aside>

        {/* CONTINUT */}
        <main className="flex-1 bg-gray-50 p-6 overflow-auto">
          {children}
        </main>

      </body>
    </html>
  );
}