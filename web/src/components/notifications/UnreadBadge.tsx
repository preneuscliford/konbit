"use client";

import { useUnreadCount } from "./useUnreadCount";

// Pastille rouge sur la cloche : nombre de notifications non lues.
export default function UnreadBadge({
  className = "",
}: {
  className?: string;
}) {
  const count = useUnreadCount();
  if (count <= 0) return null;
  return (
    <span
      aria-label={`${count} notifikasyon ou poko li`}
      className={`absolute min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[11px] font-bold leading-[18px] text-white ring-2 ring-surface ${className}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
