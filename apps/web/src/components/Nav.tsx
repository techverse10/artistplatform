"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const I = {
  home: <path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  ticket: <path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4v0a2 2 0 0 0 0-4V6H3z" />,
  stage: (
    <>
      <path d="M12 3v10" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 21h16" />
      <path d="M6 17h12" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
};

function Icon({ d }: { d: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {d}
    </svg>
  );
}

export function Nav() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const is = (p: string) => (p === "/" ? path === "/" : path.startsWith(p));

  const isArtist = user?.role === "ARTIST";
  const mainTab = isArtist ? { href: "/studio", label: "Studio", icon: I.stage } : { href: "/bookings", label: "Bookings", icon: I.ticket };
  const profileTab = user ? { href: isArtist ? "/studio" : "/bookings", label: "You", icon: I.user } : { href: "/login", label: "Sign in", icon: I.user };

  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link href="/" className="logo">
            <i /> Stagelight
          </Link>
          <nav className="navlinks">
            <Link href="/" className={is("/") ? "active hide-m" : "hide-m"}>Discover</Link>
            <Link href="/artists" className={is("/artists") ? "active" : ""}>Artists</Link>
            {user && (
              <Link href={mainTab.href} className={is(mainTab.href) ? "active hide-m" : "hide-m"}>
                {isArtist ? "Studio" : "My bookings"}
              </Link>
            )}
            {user ? (
              <button
                className="btn sm ghost"
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
              >
                Sign out
              </button>
            ) : (
              <>
                <Link href="/login" className="hide-m">Sign in</Link>
                <Link href="/register" className="btn sm primary">Join</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <nav className="tabbar" aria-label="Primary">
        <Link href="/" className={is("/") ? "active" : ""}>
          <Icon d={I.home} />
          Discover
        </Link>
        <Link href="/artists" className={is("/artists") ? "active" : ""}>
          <Icon d={I.search} />
          Artists
        </Link>
        <Link href={user ? mainTab.href : "/register"} className={user && is(mainTab.href) ? "active" : ""}>
          <Icon d={user ? mainTab.icon : I.stage} />
          {user ? mainTab.label : "Join"}
        </Link>
        <Link href={profileTab.href} className={is(profileTab.href) && !!user ? "active" : ""}>
          <Icon d={profileTab.icon} />
          {profileTab.label}
        </Link>
      </nav>
    </>
  );
}
