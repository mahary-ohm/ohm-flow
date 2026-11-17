import { Activity, ClipboardList } from "lucide-react";
import type { Role, TicketStatus } from "@ohmflow/shared";
import type { User } from "./ohmflow-types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? `Erreur ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const labels: Record<TicketStatus, string> = {
  OPEN: "À traiter",
  IN_PROGRESS: "En cours",
  WAITING: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
};

export const roleNames: Record<Role, string> = {
  ADMIN: "Administrateur",
  USER: "Collaborateur",
  AGENT: "Agent de traitement",
};

export const dateShort = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export const initials = (user: User) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

export function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <Activity size={19} />
      </div>
      <div>
        <div className="brand-name">OhmFlow</div>
        <div className="brand-sub">ESPACE SUPPORT</div>
      </div>
    </div>
  );
}

export function Status({ status }: { status: TicketStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ClipboardList />
      </div>
      <strong>{title}</strong>
      {text && <div style={{ marginTop: 5 }}>{text}</div>}
    </div>
  );
}
