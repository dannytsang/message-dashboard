export function formatDashboardDateTime(isoDateTime?: string): string | null {
  if (!isoDateTime) return null;

  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(date);
}

export function formatDashboardRelativeDateTime(isoDateTime?: string): string | null {
  if (!isoDateTime) return null;

  const target = new Date(isoDateTime);
  if (Number.isNaN(target.getTime())) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  const absMinutes = Math.abs(diffMinutes);

  if (absMinutes < 1) {
    return "Just now";
  }

  if (absMinutes < 60) {
    return diffMinutes > 0 ? `In ${absMinutes}m` : `${absMinutes}m ago`;
  }

  const absHours = Math.round(absMinutes / 60);
  if (absHours < 24) {
    return diffMinutes > 0 ? `In ${absHours}h` : `${absHours}h ago`;
  }

  const absDays = Math.round(absHours / 24);
  return diffMinutes > 0 ? `In ${absDays}d` : `${absDays}d ago`;
}
