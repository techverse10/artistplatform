"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Avatar } from "./Avatar";
import { Ic, type IconName } from "./Icons";

interface Item {
  href: string;
  label: string;
  icon: IconName;
  disc?: boolean;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const isArtist = user?.role === "ARTIST";
  const on = (href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/") || (href === "/artists" && path.startsWith("/book/")));

  const nav: Item[] = [{ href: "/", label: "Home", icon: "home" }, { href: "/artists", label: "Artists", icon: "discover" }];
  if (isArtist) nav.push({ href: "/studio", label: "Studio", icon: "stage" });
  else if (user) nav.push({ href: "/bookings", label: "My bookings", icon: "ticket" });

  // Phone tab bar: same destinations, with one raised action in the middle where it makes sense.
  const tabs: Item[] = [{ href: "/", label: "Home", icon: "home" }, { href: "/artists", label: "Artists", icon: "discover" }];
  if (isArtist) {
    tabs.push({ href: "/studio", label: "Studio", icon: "plus", disc: true });
    tabs.push({ href: `/artists/${user!.artistProfile?.handle ?? ""}`, label: "My page", icon: "user" });
  } else if (user) {
    tabs.push({ href: "/bookings", label: "Bookings", icon: "ticket" });
  } else {
    tabs.push({ href: "/register", label: "Join", icon: "plus", disc: true });
    tabs.push({ href: "/login", label: "Sign in", icon: "user" });
  }

  const doLogout = async () => {
    await logout();
    router.push("/");
  };

  return (
    <div className="shell">
      <aside className="side">
        <Link href="/" className="brand" aria-label="Stagelight home">
          <img src="/logo-sm.png" alt="" width={46} height={46} />
          <div>
            <b>Stagelight</b>
            <small>Watch. Follow. Book.</small>
          </div>
        </Link>

        <nav className="nav" aria-label="Primary">
          {nav.map((i) => (
            <Link key={i.href} href={i.href} className={on(i.href) ? "on" : ""} aria-current={on(i.href) ? "page" : undefined}>
              <Ic n={i.icon} />
              <span>{i.label}</span>
            </Link>
          ))}
        </nav>

        <div className="side-cta">
          {isArtist ? (
            <Link href="/studio" className="btn primary block" title="Upload to your stage">
              <Ic n="plus" />
              <span>Create post</span>
            </Link>
          ) : user ? (
            <Link href="/artists" className="btn primary block" title="Book an artist">
              <Ic n="ticket" />
              <span>Book an artist</span>
            </Link>
          ) : (
            <Link href="/register" className="btn primary block" title="Join free">
              <Ic n="plus" />
              <span>Join free</span>
            </Link>
          )}
        </div>

        {!isArtist && (
          <div className="side-card">
            <b>Perform? Get booked.</b>
            <p>Share photos, tracks and reels. Set your packages. Let requests come to you.</p>
            <Link href="/register?role=ARTIST" className="btn sm block">
              Create artist profile
            </Link>
          </div>
        )}
      </aside>

      <div className="main">
        <header className="topbar">
          <Link href="/" className="mlogo" aria-label="Stagelight home">
            <img src="/logo-sm.png" alt="" width={34} height={34} />
            <span>Stagelight</span>
          </Link>
          <form action="/artists" className="search" role="search">
            <Ic n="search" />
            <input name="q" placeholder="Search artists, styles, cities" aria-label="Search artists" />
          </form>
          <div className="top-actions">
            {user ? (
              <>
                <Link href={isArtist ? "/studio" : "/bookings"} className="row hide-m" style={{ gap: 10 }}>
                  <Avatar src={user.avatarUrl} size={38} alt="" />
                  <b className="small">{user.name.split(" ")[0]}</b>
                </Link>
                <button className="btn sm ghost" onClick={doLogout} aria-label="Sign out">
                  <Ic n="logout" />
                  <span className="hide-m">Sign out</span>
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="btn sm ghost hide-m">
                  Sign in
                </Link>
                <Link href="/register" className="btn sm primary">
                  Join
                </Link>
              </>
            )}
          </div>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav className="tabbar" aria-label="Primary mobile">
        {tabs.map((i) => (
          <Link key={i.href} href={i.href} className={`${on(i.href) ? "on" : ""} ${i.disc ? "mid" : ""}`.trim()}>
            {i.disc ? (
              <span className="disc">
                <Ic n={i.icon} />
              </span>
            ) : (
              <Ic n={i.icon} />
            )}
            {i.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
