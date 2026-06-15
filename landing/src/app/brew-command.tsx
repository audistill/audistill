"use client";

import { useState } from "react";

export function BrewCommand() {
  const [copied, setCopied] = useState(false);
  const command = "brew install --cask audistill/tap/audistill";

  function handleCopy() {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      onClick={handleCopy}
      className="group relative inline-flex items-center gap-3 bg-surface/80 backdrop-blur border border-border hover:border-accent/30 rounded-[12px] px-5 py-2.5 transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]"
    >
      <code className="font-[family-name:var(--font-mono)] text-[13px] text-secondary group-hover:text-text transition-colors">
        <span className="text-accent">$</span>{" "}
        {command}
      </code>
      <button
        type="button"
        aria-label="Copy to clipboard"
        className="flex-shrink-0 p-1 rounded-md transition-all duration-200"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-stone group-hover:text-accent transition-colors duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        )}
      </button>
    </div>
  );
}
