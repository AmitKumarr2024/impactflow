"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";
import { uploadFile, type MediaAsset } from "@/lib/upload";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPTED = "image/jpeg,image/png,image/webp,application/pdf";

export function FileUpload({
  projectId,
  entityType,
  entityId,
  onUploaded,
  label = "Upload a file",
}: {
  projectId?: string;
  entityType: string;
  entityId?: string;
  onUploaded: (asset: MediaAsset) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lastAsset, setLastAsset] = useState<MediaAsset | null>(null);

  async function handleFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File exceeds the 15MB limit");
      return;
    }
    setUploading(true);
    try {
      const asset = await uploadFile({ file, projectId, entityType, entityId });
      setLastAsset(asset);
      onUploaded(asset);
      toast.success(`${asset.fileName} uploaded`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      {lastAsset && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-border bg-surface-raised p-2">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded border border-border">
            {lastAsset.resourceType === "image" ? (
              <Image src={lastAsset.url} alt={lastAsset.fileName} fill sizes="48px" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface text-[10px] font-medium text-muted">
                {lastAsset.format?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="flex-1 truncate text-xs text-foreground">{lastAsset.fileName}</span>
          <button
            type="button"
            onClick={() => setLastAsset(null)}
            className="text-muted hover:text-status-critical"
            aria-label="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-60"
        )}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" /> {lastAsset ? "Choose another file" : label} (JPEG, PNG, WebP, or PDF · max 15MB)
          </>
        )}
      </button>
    </div>
  );
}
