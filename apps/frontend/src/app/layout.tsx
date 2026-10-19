import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme-context';
import { AuthProvider } from '@/lib/auth-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export const metadata: Metadata = {
  title: 'Aegis Enterprise HIS v2.0 | Clinical ERP',
  description:
    'Multi-Center Clinic & Hospital Management ERP with Center-Isolated Data Architecture, Dynamic RBAC, POS Billing, and Clinical Prescriptions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('aegis_theme');
                  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground font-sans antialiased overflow-x-hidden">
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <div className="min-h-screen flex flex-col">
                <Header />
                <div className="flex flex-1 relative">
                  <Sidebar />
                  <main className="flex-1 p-3 sm:p-5 md:p-6 overflow-y-auto max-w-7xl mx-auto w-full min-w-0">
                    {children}
                  </main>
                </div>
              </div>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
