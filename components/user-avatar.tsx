"use client";
import { useState } from "react";
export function UserAvatar({ name, src, className = "", title }: { name: string; src?: string; className?: string; title?: string }) {
  const [failed, setFailed] = useState<string | undefined>();
  return <span className={`user-avatar ${className}`} title={title} aria-hidden="true">{src && failed !== src ? <img src={src} alt="" onError={() => setFailed(src)}/> : name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase()}</span>;
}
