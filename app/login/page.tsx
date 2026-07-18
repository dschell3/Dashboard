"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  // Only same-origin relative paths — "//evil.com" or absolute URLs are
  // ignored. "\" is rejected too: browsers normalize "/\evil.com" to
  // "//evil.com", which would make it protocol-relative.
  const rawNext = sp.get("next") || "";
  const next = /^\/(?![/\\])/.test(rawNext) && !rawNext.includes("\\") ? rawNext : "/";
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Login failed");
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-24 max-w-xs">
      <div className="mb-5 flex items-center justify-center gap-2">
        <Briefcase className="h-5 w-5 text-stone-500" />
        <span className="text-base font-medium">Internship dashboard</span>
      </div>
      <div className="rounded-xl border border-stone-200 bg-white p-5">
        <label className="mb-1 block text-[13px] text-stone-500">Password</label>
        <input
          type="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          autoFocus
          className="h-9 w-full rounded-md border border-stone-200 bg-white px-3 text-sm outline-none focus:border-stone-400"
        />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <button
          onClick={submit}
          disabled={busy || !pw}
          className="mt-3 w-full rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-60"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-stone-400">
        Set APP_PASSWORD in .env.local (and in Vercel before deploying).
      </p>
    </div>
  );
}
