"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { SidebarContent } from "./Sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-md text-muted hover:bg-surface-raised hover:text-foreground md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-surface shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-muted hover:bg-surface-raised"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            <div onClick={() => setOpen(false)}>
              <SidebarContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
