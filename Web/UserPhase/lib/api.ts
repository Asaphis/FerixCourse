export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function getFeatured() {
  // Real fetch, empty-state safe. No mock data per spec.
  try {
    const r = await fetch(`${apiUrl}/courses/featured`, { next: { revalidate: 60 } });
    if (!r.ok) return [];
    return (await r.json()) as any[];
  } catch {
    return [];
  }
}

export function formatNaira(kobo: number, currency = "NGN") {
  const major = kobo / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}
