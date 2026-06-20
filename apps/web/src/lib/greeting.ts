export function timeGreeting(name?: string | null) {
  const hour = new Date().getHours();
  const base =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const first = name?.trim().split(/\s+/)[0];
  return first ? `${base}, ${first}` : base;
}
