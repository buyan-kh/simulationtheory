import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'NEXUS SIM',
  description: 'Multi-Agent Simulation Platform',
};

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="font-pixel text-pixel-xs text-pixel-text-dim hover:text-neon-cyan px-3 py-2 border-2 border-transparent hover:border-pixel-border transition-colors"
    >
      &gt;{label}
    </Link>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-pixel-bg scanlines">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-pixel-panel border-b-3 border-pixel-border-light"
          style={{
            boxShadow: 'inset 0 -2px 0 0 #2a2a5a, 0 4px 0 0 rgba(0,0,0,0.3)',
            borderBottom: '3px solid #4a4a8a',
          }}
        >
          <div className="max-w-[1800px] mx-auto px-4 h-10 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-6 h-6 bg-neon-cyan border-2 border-pixel-border-highlight flex items-center justify-center font-pixel text-pixel-xs text-pixel-bg font-bold"
                style={{ boxShadow: '2px 2px 0 0 rgba(0,0,0,0.4)' }}
              >
                N
              </div>
              <span className="font-pixel text-pixel-sm text-neon-cyan tracking-widest">
                NEXUS SIM
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <NavLink href="/" label="HOME" />
              <NavLink href="/characters" label="CHARACTERS" />
              <NavLink href="/about" label="ABOUT" />
            </div>
          </div>
        </nav>
        <main className="pt-10 min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
