import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prowider — Lead Distribution System",
  description: "Mini Lead Distribution System for service providers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0f] text-white font-sans antialiased">
        <nav className="border-b border-white/10 bg-[#0d0d14]/90 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-14">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
                <span className="text-indigo-400 text-xl">⬡</span>
                <span className="text-white">Prowider</span>
                <span className="text-white/30 text-xs font-normal ml-1">Lead Distribution</span>
              </Link>
              <div className="flex items-center gap-1">
                <NavLink href="/request-service">Request Service</NavLink>
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/test-tools">Test Tools</NavLink>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-md text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all"
    >
      {children}
    </Link>
  );
}
