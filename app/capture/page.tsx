"use client";
import { useEffect, useRef, useState } from "react";
import { BookmarkPlus, Check, Copy } from "lucide-react";
import Nav from "@/components/Nav";
import { Card } from "@/components/ui";

// React refuses javascript: hrefs (rightly), so the bookmarklet link gets its
// href set imperatively. This is our own generated code, not user data.
function useBookmarklet() {
  const [href, setHref] = useState("");
  useEffect(() => {
    const origin = window.location.origin;
    const code =
      "(function(){var s=window.getSelection?String(window.getSelection()).trim():'';" +
      "var q='u='+encodeURIComponent(location.href)+'&t='+encodeURIComponent(document.title)+" +
      "(s?'&s='+encodeURIComponent(s.slice(0,200)):'');" +
      "window.open('" + origin + "/opportunities/new?'+q,'_blank');})();"
    setHref("javascript:" + encodeURI(code));
  }, []);
  return href;
}

export default function CapturePage() {
  const href = useBookmarklet();
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (linkRef.current && href) linkRef.current.setAttribute("href", href);
  }, [href]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {}
  }

  return (
    <>
      <Nav />
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-lg font-medium">Capture roles from any careers page</h1>
        <p className="mb-4 text-sm text-stone-500">
          For the companies with no job-board feed (the small local shops), this turns
          logging a role into one click: it opens your Add form pre-filled with the
          posting&apos;s title, company, and link.
        </p>

        <Card className="mb-3">
          <h2 className="mb-2 text-base font-medium">Install (once, ~10 seconds)</h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-stone-600">
            <li>Show your bookmarks bar (<span className="rounded bg-stone-100 px-1 py-0.5 text-xs">Ctrl+Shift+B</span>)</li>
            <li>Drag this button onto the bar:</li>
          </ol>
          <div className="mt-3 flex items-center gap-2">
            <a
              ref={linkRef}
              draggable
              onClick={(e) => e.preventDefault()}
              title="Drag me to your bookmarks bar"
              className="inline-flex cursor-grab items-center gap-1.5 rounded-md bg-stone-900 px-3 py-1.5 text-sm text-white active:cursor-grabbing"
            >
              <BookmarkPlus className="h-4 w-4" /> Capture role
            </a>
            <span className="text-xs text-stone-400">← drag, don&apos;t click</span>
          </div>
          <div className="mt-3 border-t border-stone-200 pt-3 text-[13px] text-stone-500">
            Can&apos;t drag? <button onClick={copy} className="inline-flex items-center gap-1 text-stone-700 underline hover:text-stone-900">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy the code"}
            </button>{" "}
            then make any bookmark, edit it, and paste as the URL.
          </div>
        </Card>

        <Card>
          <h2 className="mb-2 text-base font-medium">Use</h2>
          <p className="text-sm text-stone-600">
            On any job posting — Dorado, Protelo, Ansync, a LinkedIn posting, anywhere —
            click <span className="font-medium">Capture role</span>. Your Add form opens in a
            new tab with the fields guessed from the page. Pro tip: select the job title on
            the page first and the capture uses your selection verbatim.
          </p>
          <p className="mt-2 text-[13px] text-stone-500">
            Notes: if nothing opens, allow pop-ups for the site once. Desktop browsers only —
            on your phone, share the link into a note and add it later. Captured roles are
            scored by the same engine as imports.
          </p>
        </Card>
      </div>
    </>
  );
}
