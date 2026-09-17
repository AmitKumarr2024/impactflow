"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateProfile } from "@/store/authSlice";
import { Button } from "@/components/ui/Button";
import { Card, Input, Label, Textarea } from "@/components/ui/primitives";
import { FileUpload } from "@/components/ui/FileUpload";
import { ApiError } from "@/lib/api";
import type { MediaAsset } from "@/lib/upload";

export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [name, setName] = useState(user?.name || "");
  const [address, setAddress] = useState(user?.address || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await dispatch(updateProfile({ name, address, avatar })).unwrap();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleAvatarUploaded(asset: MediaAsset) {
    setAvatar(asset.url);
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Your profile</h1>
        <p className="mt-1 text-sm text-muted">
          Update your display details. Role and email can only be changed by an administrator.
        </p>
      </div>

      <Card>
        <div className="mb-5 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-surface-raised">
            {avatar && <Image src={avatar} alt={user.name} fill sizes="64px" className="object-cover" />}
          </div>
          <div>
            <p className="font-medium text-foreground">{user.name}</p>
            <p className="text-xs text-muted">{user.email}</p>
            <p className="mt-0.5 text-xs text-muted">
              {user.role.replace(/_/g, " ")} · {user.gender.charAt(0) + user.gender.slice(1).toLowerCase()}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <Label>Profile picture</Label>
            <FileUpload
              entityType="User"
              entityId={user._id}
              onUploaded={handleAvatarUploaded}
              label="Upload a new photo"
            />
          </div>
          <div>
            <Label>Name</Label>
            <Input required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <Button type="submit" loading={saving} className="self-start">
            Save changes
          </Button>
        </form>
      </Card>
    </div>
  );
}
