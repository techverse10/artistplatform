"use client";

import { useEffect, useState } from "react";
import { Ic } from "./Icons";

type Theme = "light" | "dark";

/** Light is the default. The choice is remembered in localStorage and applied before paint (see layout.tsx). */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    setTheme(dark ? "dark" : "light");
    if (dark) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#0a0810");
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.add("theme-anim");
    root.setAttribute("data-theme", next);
    window.setTimeout(() => root.classList.remove("theme-anim"), 300);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#0a0810" : "#f6f3f8");
    try {
      localStorage.setItem("sl-theme", next);
    } catch {
      /* private mode: the choice just won't persist */
    }
    setTheme(next);
  };

  const dark = theme === "dark";
  return (
    <button className="theme-btn" onClick={flip} aria-pressed={dark} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} title={dark ? "Light mode" : "Dark mode"}>
      <Ic n={dark ? "sun" : "moon"} />
    </button>
  );
}
