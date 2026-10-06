import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "Stagelight — book artists you love", template: "%s · Stagelight" },
  description: "Discover musicians, dancers, DJs, painters and more. Watch their work, then book them for your event.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0c0a10",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500&family=Manrope:wght@400;600;700;800&display=swap"
        />
      </head>
      <body>
        <AuthProvider>
          <Nav />
          <main>{children}</main>
          <footer className="site">
            <div className="wrap spread">
              <span>© {new Date().getFullYear()} Stagelight</span>
              <span>Made for artists and the people who love them.</span>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
