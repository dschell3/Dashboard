"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

// The html.dark class is set before hydration by the inline script in the
// root layout (stored preference, falling back to the system setting), so
// this button only has to mirror and flip it.
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
    setDark(next);
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className="inline-flex items-center rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-stone-500 hover:bg-stone-50 hover:text-stone-800 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
