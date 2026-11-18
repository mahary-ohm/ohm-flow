const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type ApiClient = <T>(path: string, init?: RequestInit) => Promise<T>;

/** Appel à l'API OhmFlow avec le cookie de session ; lève une Error portant le message de l'API. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Erreur ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
