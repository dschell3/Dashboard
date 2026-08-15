"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Upload, Download, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/components/Toaster";

export type ResumeMeta = { filename: string; mime_type: string; updated_at: string | null } | null;

const ACCEPT = ".pdf,.txt,.md";
const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
};

// Upload/manage the single resume on file. Files go up as base64 JSON; the
// tailor feature on each role's detail page uses whatever is stored here.
export default function ResumeCard({ meta }: { meta: ResumeMeta }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(file: File) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const mime = MIME_BY_EXT[ext];
    if (!mime) return toast("Upload a PDF, .txt, or .md file.", "error");
    if (file.size > 4 * 1024 * 1024) return toast("Keep the resume under 4MB.", "error");
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + CHUNK)));
      }
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime_type: mime, content_base64: btoa(binary) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Upload failed.");
      toast(`Resume saved: ${file.name}`, "success");
      router.refresh();
    } catch (e: any) {
      toast(e.message, "error");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!confirm("Remove the resume on file?")) return;
    const res = await fetch("/api/resume", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) return toast("Could not delete the resume.", "error");
    toast("Resume removed.", "success");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      {meta ? (
        <>
          <div className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
            <span className="truncate text-sm font-medium">{meta.filename}</span>
            {meta.updated_at && (
              <span className="shrink-0 text-[13px] text-stone-500 dark:text-stone-400">
                updated {new Date(meta.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/api/resume/file"
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/50"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 px-2.5 py-1.5 text-sm hover:bg-stone-50 dark:hover:bg-stone-800/50 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Replace
            </button>
            <button
              onClick={remove}
              aria-label="Remove resume"
              className="rounded-md p-1.5 text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-red-600 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="min-w-0 flex-1 text-sm text-stone-500 dark:text-stone-400">
            Upload your resume (PDF, .txt, or .md) to enable one-click tailoring on each role&apos;s page.
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md bg-stone-900 dark:bg-stone-100 px-3 py-1.5 text-sm text-white dark:text-stone-900 hover:bg-stone-800 dark:hover:bg-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Uploading…" : "Upload resume"}
          </button>
        </>
      )}
    </div>
  );
}
