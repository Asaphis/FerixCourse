export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(`${apiUrl}${path}`, { next: { revalidate: 60 } });
    if (!r.ok) return fallback;
    return (await r.json()) as T;
  } catch {
    return fallback;
  }
}

export const getFeatured = () => get<any[]>("/courses/featured", []);
export const getCourses = (params = "") => get<any[]>(`/api/courses${params}`, []);
export const getClassrooms = (params = "") => get<any[]>(`/api/classrooms${params}`, []);
export const getCategories = () => get<any[]>("/api/categories", []);
export const getClassroom = (slug: string) => get<any>(`/api/classrooms/${slug}`, null);
export const getCourse = (slug: string) => get<any>(`/api/courses/${slug}`, null);

export function formatMoney(kobo: number, currency = "NGN") {
  const major = kobo / 100;
  try {
    return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString()}`;
  }
}
