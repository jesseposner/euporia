"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function UserProfileBadge() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar>
        <AvatarFallback>AJ</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">Alex Johnson</p>
        <p className="text-xs text-muted-foreground">Pro Member</p>
      </div>
    </div>
  );
}
