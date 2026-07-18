"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

// Tiny dependency-free toast system. Mount <Toaster /> once (in the root
// layout); fire messages from any client component via toast(). Messages
// stack bottom-right, announce politely to screen readers, and auto-dismiss.

export type ToastTone = "success" | "error" | "info";
type ToastItem = { id: number; text: string; tone: ToastTone };

let pushToast: ((t: { text: string; tone: ToastTone }) => void) | null = null;
let nextId = 1;

export function toast(text: string, tone: ToastTone = "info") {
  pushToast?.({ text, tone });
}

const toneStyle: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-stone-200 bg-white text-stone-700",
};

function ToneIcon({ tone }: { tone: ToastTone }) {
  if (tone === "success") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (tone === "error") return <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />;
  return <Info className="h-4 w-4 shrink-0 text-stone-500" />;
}

export default function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToast = ({ text, tone }) => {
      const id = nextId++;
      setToasts((p) => [...p.slice(-3), { id, text, tone }]); // keep at most 4
      setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), tone === "error" ? 6000 : 4000);
    };
    return () => {
      pushToast = null;
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm shadow-sm ${toneStyle[t.tone]}`}
        >
          <span className="mt-0.5"><ToneIcon tone={t.tone} /></span>
          <span className="min-w-0 break-words">{t.text}</span>
        </div>
      ))}
    </div>
  );
}
