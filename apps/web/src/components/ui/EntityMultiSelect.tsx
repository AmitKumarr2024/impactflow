"use client";

import { useState } from "react";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EntityOption {
  _id: string;
  label: string;
  sublabel?: string;
}

export function EntityMultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = "Search...",
  emptyLabel = "Nothing available yet",
}: {
  options: EntityOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [query, setQuery] = useState("");
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  return (
    <div className="rounded-md border border-border bg-surface-raised">
      <div className="relative border-b border-border p-2">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="h-8 w-full rounded bg-transparent pl-6 text-sm text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>
      <div className="max-h-48 overflow-y-auto p-1">
        {options.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted">{emptyLabel}</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-xs text-muted">No matches</p>
        ) : (
          filtered.map((o) => {
            const checked = selectedIds.includes(o._id);
            return (
              <button
                type="button"
                key={o._id}
                onClick={() => toggle(o._id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-surface",
                  checked ? "text-foreground" : "text-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-accent bg-accent text-accent-foreground" : "border-border"
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.sublabel && <span className="block truncate text-xs text-muted">{o.sublabel}</span>}
                </span>
              </button>
            );
          })
        )}
      </div>
      {selectedIds.length > 0 && (
        <p className="border-t border-border px-3 py-1.5 text-[11px] text-muted">{selectedIds.length} selected</p>
      )}
    </div>
  );
}
