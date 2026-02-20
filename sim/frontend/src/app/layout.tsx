import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXUS SIM',
  description: 'Multi-Agent Simulation Platform',
};

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2 text-sm text-gray-400 hover:text-neon-cyan transition-colors duration-200 hover:bg-white/5 rounded-lg"
    >
      {children}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-space-dark antialiased">
        <div className="starfield" />
        <nav className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
          <div className="max-w-[1800px] mx-auto px-4 h-12 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-magenta flex items-center justify-center text-xs font-bold text-space-dark">
                N
              </div>
              <span className="font-bold text-sm tracking-widest text-neon-cyan text-glow-cyan">
                NEXUS SIM
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <NavLink href="/">Dashboard</NavLink>
              <NavLink href="/characters">Characters</NavLink>
            </div>
          </div>
        </nav>
        <main className="pt-12 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
