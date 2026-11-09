"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  FilePlus2,
  Filter,
  Pencil,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  TicketCheck,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  type Role,
  type TicketStatus,
} from "@ohmflow/shared";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  cellId: string | null;
};
type Ticket = {
  id: string;
  reference: string;
  title: string;
  description: string;
  status: TicketStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
  cellId: string;
  cell: { name: string; service: { name: string } };
  categoryId: string | null;
  category: { id: string; name: string } | null;
  creator: { id: string; firstName: string; lastName: string };
  assignee?: { id: string; firstName: string; lastName: string } | null;
};
type Metrics = {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  unassigned: number;
  activeUsers: number | null;
};
type TicketDetail = Ticket & {
  statusHistory: {
    id: string;
    from: TicketStatus | null;
    to: TicketStatus;
    comment?: string | null;
    createdAt: string;
    actor: User;
  }[];
  comments: { id: string; content: string; createdAt: string; author: User }[];
};
type View =
  | "dashboard"
  | "tickets"
  | "new"
  | "agents"
  | "users"
  | "services"
  | "categories"
  | "profile";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
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

const labels: Record<TicketStatus, string> = {
  OPEN: "À traiter",
  IN_PROGRESS: "En cours",
  WAITING: "En attente",
  RESOLVED: "Résolu",
  CLOSED: "Clôturé",
};
const roleNames: Record<Role, string> = {
  ADMIN: "Administrateur",
  USER: "Collaborateur",
  AGENT: "Agent de traitement",
};
const dateShort = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const initials = (user: User) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

function Brand() {
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
function Status({ status }: { status: TicketStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
function Empty({ title, text }: { title: string; text?: string }) {
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

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("dashboard");
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [recent, setRecent] = useState<Ticket[]>([]);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [ticketEditMode, setTicketEditMode] = useState(false);
  const [ticketEditOptionsLoading, setTicketEditOptionsLoading] = useState(false);
  const [ticketEditForm, setTicketEditForm] = useState({
    title: "",
    description: "",
    cellId: "",
    categoryId: "",
    version: 1,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [comment, setComment] = useState("");
  const [agentOptions, setAgentOptions] = useState<
    {
      id: string;
      firstName: string;
      lastName: string;
      isActive: boolean;
      agentCells: { cellId: string }[];
    }[]
  >([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsLoadError, setAgentsLoadError] = useState("");
  const [ticketCells, setTicketCells] = useState<
    { id: string; name: string; service: { name: string } }[]
  >([]);
  const [ticketCategories, setTicketCategories] = useState<
    { id: string; name: string; description?: string | null }[]
  >([]);
  const [selectedAgent, setSelectedAgent] = useState("");

  const loginSchema = z.object({
    email: z.string().email("Adresse e-mail invalide"),
    password: z.string().min(1, "Saisissez votre mot de passe"),
  });
  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });
  const ticketForm = useForm<z.infer<typeof CreateTicketSchema>>({
    resolver: zodResolver(CreateTicketSchema),
  });

  async function loadDashboard() {
    const data = await api<{ metrics: Metrics; recent: Ticket[] }>(
      "/dashboard",
    );
    setMetrics(data.metrics);
    setRecent(data.recent);
  }
  async function loadTickets() {
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter) params.set("status", statusFilter);
    const data = await api<{ items: Ticket[]; total: number }>(
      `/tickets?${params}`,
    );
    setTickets(data.items);
    setTotal(data.total);
  }
  async function reload() {
    setError("");
    try {
      await Promise.all([loadDashboard(), loadTickets()]);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger les données",
      );
    }
  }
  useEffect(() => {
    api<{ user: User }>("/auth/me")
      .then(({ user: current }) => setUser(current))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (user) void reload();
  }, [user, page, statusFilter]);
  useEffect(() => {
    if (!user || view !== "new") return;
    Promise.all([
      api<{ items: typeof ticketCells }>("/cells"),
      api<{ items: typeof ticketCategories }>("/ticket-categories"),
    ])
      .then(([cellData, categoryData]) => {
        setTicketCells(cellData.items);
        setTicketCategories(categoryData.items);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Chargement des cellules et catégories impossible"),
      );
  }, [user, view]);
  useEffect(() => {
    if (!user || user.role !== "ADMIN" || !detail) {
      setAgentOptions([]);
      setAgentsLoadError("");
      return;
    }

    let cancelled = false;
    setAgentsLoading(true);
    setAgentsLoadError("");

    async function loadAgents() {
      try {
        const firstPage = await api<{
          items: typeof agentOptions;
          total: number;
          page: number;
          pageSize: number;
        }>(`/users?role=AGENT&page=1`);
        const agents = [...firstPage.items];
        let currentPage = firstPage.page + 1;

        while (agents.length < firstPage.total) {
          const nextPage = await api<{ items: typeof agentOptions; total: number }>(
            `/users?role=AGENT&page=${currentPage}`,
          );
          if (!nextPage.items.length) break;
          agents.push(...nextPage.items);
          currentPage += 1;
        }

        if (!cancelled) setAgentOptions(agents);
      } catch (e) {
        if (!cancelled) {
          setAgentOptions([]);
          setAgentsLoadError(
            e instanceof Error ? e.message : "Chargement des agents impossible",
          );
        }
      } finally {
        if (!cancelled) setAgentsLoading(false);
      }
    }

    void loadAgents();
    return () => {
      cancelled = true;
    };
  }, [user, detail?.id]);
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      if (view === "tickets" || view === "agents")
        void loadTickets().catch((e: unknown) =>
          setError(e instanceof Error ? e.message : "Erreur"),
        );
    }, 220);
    return () => clearTimeout(timer);
  }, [search, user, view]);

  async function onLogin(values: z.infer<typeof loginSchema>) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });
      setUser(result.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connexion impossible");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      /* La session est egalement invalidee a son expiration. */
    }
    setUser(null);
    setDetail(null);
    setView("dashboard");
  }
  async function openTicket(ticket: Ticket) {
    setError("");
    try {
      const data = await api<{ ticket: TicketDetail }>(`/tickets/${ticket.id}`);
      setDetail(data.ticket);
      setTicketEditMode(false);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Impossible de charger le ticket",
      );
    }
  }
  async function beginTicketEdit() {
    if (!detail) return;
    setTicketEditMode(true);
    setTicketEditOptionsLoading(true);
    setError("");
    setTicketEditForm({
      title: detail.title,
      description: detail.description,
      cellId: detail.cellId,
      categoryId: detail.categoryId ?? "",
      version: detail.version,
    });
    try {
      const [cellData, categoryData] = await Promise.all([
        api<{ items: typeof ticketCells }>("/cells"),
        api<{ items: typeof ticketCategories }>("/ticket-categories"),
      ]);
      setTicketCells(cellData.items);
      setTicketCategories(categoryData.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement des options impossible");
    } finally {
      setTicketEditOptionsLoading(false);
    }
  }
  async function saveTicketEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!detail) return;
    const parsed = UpdateTicketSchema.safeParse(ticketEditForm);
    if (!parsed.success) {
      setError("Vérifiez l’objet, la description, la cellule et la catégorie du ticket.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`/tickets/${detail.id}`, {
        method: "PATCH",
        body: JSON.stringify(parsed.data),
      });
      const refreshed = await api<{ ticket: TicketDetail }>(`/tickets/${detail.id}`);
      setDetail(refreshed.ticket);
      setTicketEditMode(false);
      setSuccess("Votre ticket a été modifié.");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification du ticket impossible");
    } finally {
      setBusy(false);
    }
  }
  async function createTicket(values: z.infer<typeof CreateTicketSchema>) {
    setBusy(true);
    setError("");
    try {
      await api("/tickets", { method: "POST", body: JSON.stringify(values) });
      ticketForm.reset();
      setSuccess("Votre demande a bien été créée.");
      setView("tickets");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    } finally {
      setBusy(false);
    }
  }
  async function claimTicket() {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api(`/tickets/${detail.id}/claim`, { method: "POST" });
      await openTicket(detail);
      await reload();
      setSuccess("Le ticket vous est attribué.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prise en charge impossible");
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(status: TicketStatus) {
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api(`/tickets/${detail.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, version: detail.version }),
      });
      await openTicket(detail);
      await reload();
      setSuccess("Le statut du ticket a été mis à jour.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    } finally {
      setBusy(false);
    }
  }
  async function addComment() {
    if (!detail || !comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      await api(`/tickets/${detail.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ content: comment }),
      });
      setComment("");
      await openTicket(detail);
      setSuccess("Commentaire ajouté.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  }
  async function assignTicket() {
    if (!detail || !selectedAgent) return;
    setBusy(true);
    setError("");
    try {
      await api(`/tickets/${detail.id}/assignment`, {
        method: "PATCH",
        body: JSON.stringify({
          agentId: selectedAgent,
          version: detail.version,
        }),
      });
      setSelectedAgent("");
      await openTicket(detail);
      await reload();
      setSuccess("Le ticket a été affecté.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Affectation impossible");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          color: "#728078",
        }}
      >
        <div style={{ width: 220 }}>
          <div className="skeleton" />
          <div style={{ height: 8 }} />
          <div className="skeleton" style={{ width: "70%" }} />
        </div>
      </div>
    );
  if (!user)
    return (
      <main className="login-shell">
        <section className="login-art">
          <Brand />
          <div className="login-copy">
            <div className="eyebrow" style={{ color: "#b0d7bb" }}>
              OHM ÉNERGIE · SUPPORT INTERNE
            </div>
            <h1>
              Le service
              <br />
              avance ensemble.
            </h1>
            <p>
              Un espace partagé pour suivre les demandes, résoudre les incidents et aider chaque équipe à avancer.
            </p>
          </div>
          <div className="login-foot">
            © Ohm Énergie · Espace réservé aux collaborateurs
          </div>
        </section>
        <section className="login-form-side">
          <div className="login-form">
            <div className="login-brand-small">
              <Brand />
            </div>
            <div className="eyebrow">VOTRE ESPACE DE TRAVAIL</div>
            <h2>Bon retour parmi nous</h2>
            <p>Connectez-vous avec vos identifiants OhmFlow.</p>
            {error && <div className="error-banner">{error}</div>}
            <form onSubmit={loginForm.handleSubmit(onLogin)}>
              <div className="field">
                <label htmlFor="email">Adresse e-mail</label>
                <input
                  id="email"
                  className="control"
                  autoComplete="username"
                  placeholder="prenom.nom@ohm-energie.com"
                  {...loginForm.register("email")}
                />
                {loginForm.formState.errors.email && (
                  <span className="field-error">
                    {loginForm.formState.errors.email.message}
                  </span>
                )}
              </div>
              <div className="field">
                <label htmlFor="password">Mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="password"
                    className="control"
                    style={{ paddingRight: 42 }}
                    type={showLoginPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Votre mot de passe"
                    {...loginForm.register("password")}
                  />
                  <button
                    type="button"
                    aria-label={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    aria-pressed={showLoginPassword}
                    title={showLoginPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowLoginPassword((visible) => !visible)}
                    style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}
                  >
                    {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <span className="field-error">
                    {loginForm.formState.errors.password.message}
                  </span>
                )}
              </div>
              <button className="button button-primary" disabled={busy}>
                {busy ? "Connexion…" : "Se connecter"}
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        </section>
      </main>
    );

  const nav = [
    {
      id: "dashboard" as const,
      label: "Vue d’ensemble",
      icon: LayoutDashboard,
      section: "ESPACE",
    },
    {
      id: "tickets" as const,
      label: "Tous les tickets",
      icon: ClipboardList,
      section: "ESPACE",
      count: metrics?.open,
    },
    ...(user.role === "AGENT" || user.role === "ADMIN"
      ? [
          {
            id: "agents" as const,
            label: "File de traitement",
            icon: TicketCheck,
            section: "TRAITEMENT",
            count: metrics?.unassigned,
          },
        ]
      : []),
    ...(user.role === "ADMIN"
      ? [
          {
            id: "users" as const,
            label: "Utilisateurs",
            icon: Users,
            section: "ADMINISTRATION",
          },
          {
            id: "services" as const,
            label: "Services & cellules",
            icon: BriefcaseBusiness,
            section: "ADMINISTRATION",
          },
          {
            id: "categories" as const,
            label: "Catégories de tickets",
            icon: ClipboardList,
            section: "ADMINISTRATION",
          },
        ]
      : []),
    {
      id: "profile" as const,
      label: "Mon profil",
      icon: UserRound,
      section: "COMPTE",
    },
  ];
  const pageTitles: Record<View, string> = {
    dashboard: "Vue d’ensemble",
    tickets: "Tous les tickets",
    new: "Nouvelle demande",
    agents: "File de traitement",
    users: "Utilisateurs",
    services: "Services & cellules",
    categories: "Catégories de tickets",
    profile: "Mon profil",
  };
  const userName = `${user.firstName} ${user.lastName}`;
  const shownTickets =
    view === "agents"
      ? tickets.filter(
          (ticket) => !ticket.assignee || ticket.assignee.id === user.id,
        )
      : tickets;
  const eligibleAgents = detail
    ? agentOptions.filter(
        (agent) =>
          agent.isActive &&
          agent.agentCells.some(
            (membership) => membership.cellId === detail.cellId,
          ),
      )
    : [];
  const ticketCanBeEdited = Boolean(
    user.role === "USER" &&
      detail &&
      detail.creator.id === user.id &&
      ["OPEN", "IN_PROGRESS", "WAITING"].includes(detail.status),
  );
  const metricCards =
    user.role === "USER"
      ? [
          {
            label: "Tickets de ma cellule",
            value: metrics?.total ?? 0,
            note: "Toutes les demandes de l’équipe",
            icon: ClipboardList,
          },
          {
            label: "À traiter",
            value: metrics?.open ?? 0,
            note: "En attente de prise en charge",
            icon: Clock3,
          },
          {
            label: "En cours",
            value: metrics?.inProgress ?? 0,
            note: "Traitement actif",
            icon: Activity,
          },
          {
            label: "Résolus",
            value: metrics?.resolved ?? 0,
            note: "Demandes terminées",
            icon: Check,
          },
        ]
      : [
          {
            label: "Tickets visibles",
            value: metrics?.total ?? 0,
            note:
              user.role === "ADMIN"
                ? "Toutes les cellules"
                : "Dans votre périmètre",
            icon: ClipboardList,
          },
          {
            label: "Non attribués",
            value: metrics?.unassigned ?? 0,
            note: "Prêts à être pris en charge",
            icon: UserRound,
          },
          {
            label: "En traitement",
            value: metrics?.inProgress ?? 0,
            note: "Tickets en cours",
            icon: Activity,
          },
          {
            label: "En attente",
            value: metrics?.waiting ?? 0,
            note:
              user.role === "ADMIN"
                ? `${metrics?.activeUsers ?? 0} comptes actifs`
                : "Informations attendues",
            icon: Clock3,
          },
        ];

  const navClick = (next: View) => {
    setView(next);
    setDetail(null);
    setError("");
    setSuccess("");
    setMobileNav(false);
  };
  const heading = detail ? detail.reference : pageTitles[view];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <Brand />
        <div className="nav-label">ESPACE</div>
        {nav
          .filter((item) => item.section === "ESPACE")
          .map((item) => (
            <button
              key={item.id}
              className={`nav-item ${view === item.id && !detail ? "active" : ""}`}
              onClick={() => navClick(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
              {item.count ? (
                <span className="nav-count">{item.count}</span>
              ) : null}
            </button>
          ))}
        {nav
          .filter((item) => item.section !== "ESPACE")
          .map((item, index, list) => (
            <div key={item.id}>
              {(index === 0 || item.section !== list[index - 1]?.section) && (
                <div className="nav-label" style={{ marginTop: 17 }}>
                  {item.section}
                </div>
              )}
              <button
                className={`nav-item ${view === item.id && !detail ? "active" : ""}`}
                onClick={() => navClick(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
                {item.count ? (
                  <span className="nav-count">{item.count}</span>
                ) : null}
              </button>
            </div>
          ))}
        <div className="sidebar-bottom">
          <div className="profile-small">
            <div className="avatar">{initials(user)}</div>
            <div>
              <div className="profile-name">{userName}</div>
              <div className="profile-role">{roleNames[user.role]}</div>
            </div>
            <button
              className="table-link"
              title="Mon profil"
              onClick={() => navClick("profile")}
            >
              <ChevronDown size={15} />
            </button>
          </div>
          <button className="logout" onClick={logout}>
            <LogOut size={14} />
            Se déconnecter
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              className="top-icon mobile-menu"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X /> : <Menu />}
            </button>
            <div className="crumb">
              OhmFlow&nbsp; / &nbsp;<strong>{heading}</strong>
            </div>
          </div>
          <div className="top-actions">
            <span className="top-icon" aria-label="Aide" title="Aide OhmFlow">
              <CircleHelp />
            </span>
            <span
              className="top-icon"
              aria-label="Notifications"
              title="Aucune nouvelle notification"
            >
              <Bell />
            </span>
            <div className="avatar" title={userName}>
              {initials(user)}
            </div>
          </div>
        </header>
        <section className="workspace fade-in">
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          {!detail && view === "dashboard" && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">
                    {new Intl.DateTimeFormat("fr-FR", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                      .format(new Date())
                      .toUpperCase()}
                  </div>
                  <h1 className="page-title">
                    Bonjour {user.firstName}
                    <span style={{ color: "var(--green)" }}>.</span>
                  </h1>
                  <p className="page-subtitle">
                    Voici ce qui se passe dans votre espace aujourd’hui.
                  </p>
                </div>
                {user.role === "USER" && (
                  <button
                    className="button button-primary"
                    onClick={() => navClick("new")}
                  >
                    <Plus />
                    Nouvelle demande
                  </button>
                )}
              </div>
              <div className="metric-grid">
                {metricCards.map((item, index) => (
                  <div
                    className="metric"
                    key={item.label}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="metric-top">
                      <span>{item.label}</span>
                      <span className="metric-icon">
                        <item.icon />
                      </span>
                    </div>
                    <div className="metric-value">{item.value}</div>
                    <div className="metric-note">{item.note}</div>
                  </div>
                ))}
              </div>
              <div className="content-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2 className="panel-title">
                        Tickets récemment mis à jour
                      </h2>
                      <div className="panel-note">
                        Les dernières évolutions dans votre périmètre
                      </div>
                    </div>
                    <button
                      className="table-link"
                      onClick={() => navClick("tickets")}
                    >
                      Tout voir <ArrowRight size={13} />
                    </button>
                  </div>
                  <TicketTable tickets={recent} onOpen={openTicket} />
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2 className="panel-title">À suivre</h2>
                      <div className="panel-note">Points d’attention</div>
                    </div>
                    <MoreHorizontal size={17} color="#78857c" />
                  </div>
                  <div className="activity-list">
                    {user.role !== "USER" && (
                      <div className="activity-item">
                        <div className="activity-mark" />
                        <div>
                          <div className="activity-text">
                            <strong>{metrics?.unassigned ?? 0} tickets</strong>{" "}
                            attendent une prise en charge
                          </div>
                          <div className="activity-meta">
                            Dans votre périmètre de traitement
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="activity-item">
                      <div
                        className="activity-mark"
                        style={{ background: "#d8a85e" }}
                      />
                      <div>
                        <div className="activity-text">
                          <strong>{metrics?.waiting ?? 0} demandes</strong> sont
                          en attente
                        </div>
                        <div className="activity-meta">
                          Informations ou action externe
                        </div>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div
                        className="activity-mark"
                        style={{ background: "#86a9ba" }}
                      />
                      <div>
                        <div className="activity-text">
                          Votre espace est à jour
                        </div>
                        <div className="activity-meta">
                          Données synchronisées à l’instant
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {!detail && view === "tickets" && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">SUIVI DES DEMANDES</div>
                  <h1 className="page-title">Tous les tickets</h1>
                  <p className="page-subtitle">
                    {total} demande{total !== 1 ? "s" : ""} dans votre périmètre
                  </p>
                </div>
                {user.role === "USER" && (
                  <button
                    className="button button-primary"
                    onClick={() => navClick("new")}
                  >
                    <Plus />
                    Nouvelle demande
                  </button>
                )}
              </div>
              <TicketFilters
                search={search}
                setSearch={setSearch}
                status={statusFilter}
                setStatus={setStatusFilter}
              />
              <div className="panel list-panel">
                <TicketTable tickets={tickets} onOpen={openTicket} />
                <Pagination page={page} total={total} onPage={setPage} />
              </div>
            </>
          )}
          {!detail && view === "agents" && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">CENTRE DE TRAITEMENT</div>
                  <h1 className="page-title">File de traitement</h1>
                  <p className="page-subtitle">
                    Demandes ouvertes dans vos cellules autorisées.
                  </p>
                </div>
              </div>
              <TicketFilters
                search={search}
                setSearch={setSearch}
                status={statusFilter}
                setStatus={setStatusFilter}
              />
              <div className="panel list-panel">
                <TicketTable tickets={shownTickets} onOpen={openTicket} />
                <Pagination page={page} total={total} onPage={setPage} />
              </div>
            </>
          )}
          {!detail && view === "new" && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">CRÉATION DE TICKET</div>
                  <h1 className="page-title">Nouvelle demande</h1>
                  <p className="page-subtitle">
                    Décrivez votre besoin, il sera transmis à votre cellule.
                  </p>
                </div>
                <button
                  className="button button-secondary"
                  onClick={() => navClick("tickets")}
                >
                  <ArrowLeft />
                  Retour aux tickets
                </button>
              </div>
              <section className="panel form-panel">
                <form onSubmit={ticketForm.handleSubmit(createTicket)}>
                  <div className="form-grid">
                    <div className="field full">
                      <label htmlFor="title">Objet de la demande</label>
                      <input
                        id="title"
                        className="control"
                        placeholder="Ex. Accès à l’espace client indisponible"
                        {...ticketForm.register("title")}
                      />
                      {ticketForm.formState.errors.title && (
                        <span className="field-error">
                          {ticketForm.formState.errors.title.message}
                        </span>
                      )}
                    </div>
                    <div className="field full">
                      <label htmlFor="description">Description</label>
                      <textarea
                        id="description"
                        className="control"
                        placeholder="Décrivez le contexte, les étapes suivies et le résultat attendu…"
                        {...ticketForm.register("description")}
                      />
                      {ticketForm.formState.errors.description && (
                        <span className="field-error">
                          {ticketForm.formState.errors.description.message}
                        </span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="ticket-category">Catégorie</label>
                      <select
                        id="ticket-category"
                        className="control"
                        required
                        defaultValue=""
                        {...ticketForm.register("categoryId")}
                      >
                        <option value="" disabled>
                          Choisir une catégorie
                        </option>
                        {ticketCategories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                      {ticketForm.formState.errors.categoryId && (
                        <span className="field-error">
                          {ticketForm.formState.errors.categoryId.message}
                        </span>
                      )}
                      {!ticketCategories.length && (
                        <span className="activity-meta">
                          Aucune catégorie active. Contactez un administrateur.
                        </span>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="ticket-cell">Cellule concernée</label>
                      <select
                        id="ticket-cell"
                        className="control"
                        required
                        defaultValue=""
                        {...ticketForm.register("cellId")}
                      >
                        <option value="" disabled>
                          Choisir une cellule
                        </option>
                        {ticketCells.map((cell) => (
                          <option key={cell.id} value={cell.id}>
                            {cell.service.name} · {cell.name}
                          </option>
                        ))}
                      </select>
                      {ticketForm.formState.errors.cellId && (
                        <span className="field-error">
                          {ticketForm.formState.errors.cellId.message}
                        </span>
                      )}
                      {!ticketCells.length && (
                        <span className="activity-meta">
                          Aucune cellule active disponible.
                        </span>
                      )}
                    </div>
                    <div className="field">
                      <label>Demandeur</label>
                      <div
                        className="control"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          background: "#f6f8f5",
                          color: "#708078",
                        }}
                      >
                        {userName}
                      </div>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={() => navClick("tickets")}
                    >
                      Annuler
                    </button>
                    <button className="button button-primary" disabled={busy}>
                      <FilePlus2 />
                      {busy ? "Envoi…" : "Créer la demande"}
                    </button>
                  </div>
                </form>
              </section>
            </>
          )}
          {!detail && view === "users" && <AdminUsers />}
          {!detail && view === "services" && <AdminServices />}
          {!detail && view === "categories" && <AdminTicketCategories />}
          {!detail && view === "profile" && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">VOTRE COMPTE</div>
                  <h1 className="page-title">Mon profil</h1>
                  <p className="page-subtitle">
                    Informations associées à votre compte OhmFlow.
                  </p>
                </div>
              </div>
              <section className="panel form-panel">
                <div
                  className="profile-small"
                  style={{
                    padding: "0 0 20px",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div
                    className="avatar"
                    style={{ width: 48, height: 48, fontSize: 15 }}
                  >
                    {initials(user)}
                  </div>
                  <div>
                    <div
                      className="profile-name"
                      style={{ fontSize: 15, color: "var(--ink)" }}
                    >
                      {userName}
                    </div>
                    <div
                      className="profile-role"
                      style={{ color: "var(--muted)" }}
                    >
                      {roleNames[user.role]}
                    </div>
                  </div>
                </div>
                <div className="form-grid" style={{ marginTop: 20 }}>
                  <DetailValue label="Adresse e-mail" value={user.email} />
                  <DetailValue label="Rôle" value={roleNames[user.role]} />
                  <DetailValue label="Identifiant" value={user.id} />
                  <DetailValue
                    label="Cellule"
                    value={user.cellId ?? "Accès transversal"}
                  />
                </div>
              </section>
            </>
          )}
          {detail && (
            <>
              <div className="page-head">
                <div>
                  <div className="eyebrow">
                    {detail.cell.service.name.toUpperCase()} ·{" "}
                    {detail.cell.name.toUpperCase()}
                  </div>
                  <h1 className="page-title">{detail.title}</h1>
                  <p className="page-subtitle">
                    {detail.reference} · Créé le {dateShort(detail.createdAt)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {ticketCanBeEdited && !ticketEditMode && (
                    <button
                      className="button button-secondary"
                      onClick={() => void beginTicketEdit()}
                    >
                      <Pencil />
                      Modifier mon ticket
                    </button>
                  )}
                  <button
                    className="button button-secondary"
                    onClick={() => {
                      setDetail(null);
                      setView(user.role === "AGENT" ? "agents" : "tickets");
                    }}
                  >
                    <ArrowLeft />
                    Retour
                  </button>
                  {user.role === "AGENT" && !detail.assignee && (
                    <button
                      className="button button-primary"
                      disabled={busy}
                      onClick={claimTicket}
                    >
                      <Check />
                      Prendre en charge
                    </button>
                  )}
                </div>
              </div>
              <div className="ticket-layout">
                <div>
                  <section className="panel">
                    <div className="panel-head">
                      <div>
                        <h2 className="panel-title">
                          Description de la demande
                        </h2>
                        <div className="panel-note">
                          Informations transmises par le demandeur
                        </div>
                      </div>
                      <Status status={detail.status} />
                    </div>
                    {ticketEditMode ? (
                      <form onSubmit={saveTicketEdit} className="form-panel">
                        <div className="form-grid">
                          <div className="field full">
                            <label htmlFor="edit-ticket-title">Objet</label>
                            <input
                              id="edit-ticket-title"
                              className="control"
                              minLength={3}
                              maxLength={160}
                              required
                              value={ticketEditForm.title}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  title: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field full">
                            <label htmlFor="edit-ticket-description">Description</label>
                            <textarea
                              id="edit-ticket-description"
                              className="control"
                              minLength={10}
                              maxLength={10000}
                              required
                              value={ticketEditForm.description}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  description: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="edit-ticket-cell">Cellule concernée</label>
                            <select
                              id="edit-ticket-cell"
                              className="control"
                              required
                              value={ticketEditForm.cellId}
                              disabled={ticketEditOptionsLoading}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  cellId: event.target.value,
                                })
                              }
                            >
                              <option value="">Choisir une cellule</option>
                              {ticketCells.map((cell) => (
                                <option key={cell.id} value={cell.id}>
                                  {cell.service.name} · {cell.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="edit-ticket-category">Catégorie</label>
                            <select
                              id="edit-ticket-category"
                              className="control"
                              required
                              value={ticketEditForm.categoryId}
                              disabled={ticketEditOptionsLoading}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  categoryId: event.target.value,
                                })
                              }
                            >
                              <option value="">Choisir une catégorie</option>
                              {ticketCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="form-actions">
                          <button
                            type="button"
                            className="button button-secondary"
                            onClick={() => setTicketEditMode(false)}
                          >
                            Annuler
                          </button>
                          <button
                            className="button button-primary"
                            disabled={busy || ticketEditOptionsLoading}
                          >
                            {busy ? "Enregistrement…" : "Enregistrer"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="ticket-description">{detail.description}</div>
                    )}
                  </section>
                  <section className="panel" style={{ marginTop: 15 }}>
                    <div className="panel-head">
                      <div>
                        <h2 className="panel-title">Historique</h2>
                        <div className="panel-note">
                          Suivi des changements et actions
                        </div>
                      </div>
                      <Clock3 size={16} color="#78857c" />
                    </div>
                    <div className="detail-meta">
                      {detail.statusHistory.map((entry) => (
                        <div className="history-item" key={entry.id}>
                          <div className="history-dot" />
                          <div className="history-line">
                            <strong>
                              {entry.actor.firstName} {entry.actor.lastName}
                            </strong>{" "}
                            {entry.from
                              ? `a changé le statut en ${labels[entry.to]}`
                              : "a créé le ticket"}
                            {entry.comment && (
                              <div className="muted">{entry.comment}</div>
                            )}
                            <div className="activity-meta">
                              {new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(entry.createdAt))}
                            </div>
                          </div>
                        </div>
                      ))}
                      {detail.comments.map((entry) => (
                        <div className="history-item" key={entry.id}>
                          <div
                            className="history-dot"
                            style={{ background: "#91a7b3" }}
                          />
                          <div className="history-line">
                            <strong>
                              {entry.author.firstName} {entry.author.lastName}
                            </strong>{" "}
                            a commenté
                            <div style={{ marginTop: 4 }}>{entry.content}</div>
                            <div className="activity-meta">
                              {new Intl.DateTimeFormat("fr-FR", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              }).format(new Date(entry.createdAt))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {(user.role === "AGENT" || user.role === "ADMIN") && (
                      <div className="comment-box">
                        <textarea
                          className="control"
                          aria-label="Ajouter un commentaire"
                          placeholder="Ajouter une note de traitement…"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                        />
                        <button
                          className="button button-primary"
                          aria-label="Envoyer le commentaire"
                          disabled={busy || !comment.trim()}
                          onClick={addComment}
                        >
                          <MessageSquareText />
                        </button>
                      </div>
                    )}
                  </section>
                </div>
                <aside>
                  <section className="panel">
                    <div className="panel-head">
                      <h2 className="panel-title">Détails</h2>
                      <Settings2 size={16} color="#78857c" />
                    </div>
                    <div className="detail-meta">
                      <DetailValue
                        label="Statut"
                        value={<Status status={detail.status} />}
                      />
                      <DetailValue label="Référence" value={detail.reference} />
                      <DetailValue
                        label="Créateur"
                        value={`${detail.creator.firstName} ${detail.creator.lastName}`}
                      />
                      <DetailValue
                        label="Agent responsable"
                        value={
                          detail.assignee
                            ? `${detail.assignee.firstName} ${detail.assignee.lastName}`
                            : "Non attribué"
                        }
                      />
                      <DetailValue label="Cellule" value={detail.cell.name} />
                      <DetailValue
                        label="Catégorie"
                        value={detail.category?.name ?? "Sans catégorie"}
                      />
                      <DetailValue
                        label="Service"
                        value={detail.cell.service.name}
                      />
                      <DetailValue
                        label="Dernière mise à jour"
                        value={dateShort(detail.updatedAt)}
                      />
                      {user.role === "ADMIN" && (
                        <div
                          style={{ paddingTop: 13, display: "grid", gap: 8 }}
                        >
                          <label className="field">
                            <span className="detail-label">
                              AFFECTER À UN AGENT
                            </span>
                            <select
                              className="control"
                              value={selectedAgent}
                              disabled={agentsLoading || eligibleAgents.length === 0}
                              onChange={(e) => setSelectedAgent(e.target.value)}
                            >
                              <option value="">
                                {agentsLoading
                                  ? "Chargement des agents…"
                                  : "Choisir un agent autorisé…"}
                              </option>
                              {eligibleAgents.map((agent) => (
                                <option key={agent.id} value={agent.id}>
                                  {agent.firstName} {agent.lastName}
                                  {detail.assignee?.id === agent.id
                                    ? " (actuel)"
                                    : ""}
                                </option>
                              ))}
                            </select>
                          </label>
                          {agentsLoadError ? (
                            <span className="field-error">{agentsLoadError}</span>
                          ) : !agentsLoading && eligibleAgents.length === 0 ? (
                            <span className="activity-meta">
                              Aucun agent actif n’est autorisé pour la cellule {detail.cell.name}.
                              Vérifiez les cellules de traitement dans la fiche utilisateur de l’agent.
                            </span>
                          ) : null}
                          <button
                            className="button button-secondary"
                            disabled={busy || !selectedAgent}
                            onClick={assignTicket}
                          >
                            Confirmer l’affectation
                          </button>
                        </div>
                      )}
                      {user.role === "AGENT" &&
                        detail.assignee?.id === user.id && (
                          <div
                            style={{ paddingTop: 14, display: "grid", gap: 8 }}
                          >
                            <label className="field">
                              <span className="detail-label">
                                FAIRE ÉVOLUER LE TICKET
                              </span>
                              <select
                                className="control"
                                value=""
                                disabled={busy}
                                onChange={(e) =>
                                  e.target.value &&
                                  void changeStatus(
                                    e.target.value as TicketStatus,
                                  )
                                }
                              >
                                <option value="">Choisir une action…</option>
                                {(detail.status === "IN_PROGRESS"
                                  ? ["WAITING", "RESOLVED"]
                                  : detail.status === "WAITING"
                                    ? ["IN_PROGRESS", "RESOLVED", "OPEN"]
                                    : detail.status === "RESOLVED"
                                      ? ["CLOSED", "IN_PROGRESS"]
                                      : detail.status === "CLOSED"
                                        ? ["IN_PROGRESS"]
                                        : ["IN_PROGRESS"]
                                ).map((status) => (
                                  <option key={status} value={status}>
                                    {labels[status as TicketStatus]}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                        )}
                      {user.role === "ADMIN" && (
                        <div
                          style={{ paddingTop: 13, display: "grid", gap: 8 }}
                        >
                          <label className="field">
                            <span className="detail-label">
                              MODIFIER LE STATUT
                            </span>
                            <select
                              className="control"
                              value=""
                              disabled={busy}
                              onChange={(e) =>
                                e.target.value &&
                                void changeStatus(
                                  e.target.value as TicketStatus,
                                )
                              }
                            >
                              <option value="">Choisir une action…</option>
                              {(detail.status === "OPEN"
                                ? ["IN_PROGRESS"]
                                : detail.status === "IN_PROGRESS"
                                  ? ["WAITING", "RESOLVED", "OPEN"]
                                  : detail.status === "WAITING"
                                    ? ["IN_PROGRESS", "RESOLVED", "OPEN"]
                                    : ["CLOSED", "IN_PROGRESS"]
                              ).map((status) => (
                                <option key={status} value={status}>
                                  {labels[status as TicketStatus]}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      )}
                    </div>
                  </section>
                </aside>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function DetailValue({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}
function TicketTable({
  tickets,
  onOpen,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
}) {
  if (!tickets.length)
    return (
      <Empty
        title="Aucun ticket à afficher"
        text="Les demandes correspondant à vos critères apparaîtront ici."
      />
    );
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Demande</th>
            <th>Catégorie</th>
            <th>Cellule</th>
            <th>Demandeur</th>
            <th>Responsable</th>
            <th>Statut</th>
            <th>Mis à jour</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id}>
              <td>
                <button
                  className="table-link ref"
                  onClick={() => onOpen(ticket)}
                >
                  {ticket.reference}
                </button>
              </td>
              <td>
                <div className="ticket-title" title={ticket.title}>
                  {ticket.title}
                </div>
              </td>
              <td>{ticket.category?.name ?? "—"}</td>
              <td>
                {ticket.cell.name}
                <div className="activity-meta">{ticket.cell.service.name}</div>
              </td>
              <td>
                {ticket.creator.firstName} {ticket.creator.lastName}
              </td>
              <td className="muted">
                {ticket.assignee
                  ? `${ticket.assignee.firstName} ${ticket.assignee.lastName}`
                  : "—"}
              </td>
              <td>
                <Status status={ticket.status} />
              </td>
              <td>{dateShort(ticket.updatedAt)}</td>
              <td>
                <button
                  className="table-link"
                  title="Ouvrir le ticket"
                  aria-label={`Ouvrir ${ticket.reference}`}
                  onClick={() => onOpen(ticket)}
                >
                  <ArrowRight size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function TicketFilters({
  search,
  setSearch,
  status,
  setStatus,
}: {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
}) {
  return (
    <div className="panel" style={{ marginBottom: 13 }}>
      <div className="filter-bar">
        <div className="search-field">
          <Search />
          <input
            className="control"
            placeholder="Rechercher une référence ou une demande…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="control"
          aria-label="Filtrer par statut"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">Tous les statuts</option>
          {Object.entries(labels).map(([key, label]) => (
            <option value={key} key={key}>
              {label}
            </option>
          ))}
        </select>
        <button
          className="button button-secondary"
          onClick={() => {
            setSearch("");
            setStatus("");
          }}
        >
          <Filter />
          Réinitialiser
        </button>
      </div>
    </div>
  );
}
function Pagination({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / 20));
  return (
    <div className="pagination">
      <span>
        Affichage de {total ? (page - 1) * 20 + 1 : 0} à{" "}
        {Math.min(page * 20, total)} sur {total} résultats
      </span>
      <div className="page-buttons">
        <button
          aria-label="Page précédente"
          disabled={page <= 1}
          onClick={() => onPage(Math.max(1, page - 1))}
        >
          <ArrowLeft size={13} />
        </button>
        <button className="active">{page}</button>
        <button
          aria-label="Page suivante"
          disabled={page >= pages}
          onClick={() => onPage(Math.min(pages, page + 1))}
        >
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}

function AdminUsers() {
  type AdminUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
    isActive: boolean;
    cell?: { id: string; name: string } | null;
    agentCells: { cellId: string; cell: { id: string; name: string } }[];
  };
  const [items, setItems] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [cells, setCells] = useState<{ id: string; name: string }[]>([]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "USER" as Role,
    cellId: "",
    agentCellIds: [] as string[],
  });
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    role: "USER" as Role,
    cellId: "",
    agentCellIds: [] as string[],
    isActive: true,
    newPassword: "",
    confirmNewPassword: "",
  });
  async function load() {
    try {
      const [users, cellData] = await Promise.all([
        api<{ items: typeof items }>(`/users?q=${encodeURIComponent(query)}`),
        api<{ items: { id: string; name: string }[] }>("/cells"),
      ]);
      setItems(users.items);
      setCells(cellData.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => void load(), 200);
    return () => clearTimeout(timer);
  }, [query]);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      await api("/users", {
        method: "POST",
        body: JSON.stringify({ ...form, cellId: form.cellId || undefined }),
      });
      setShowForm(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "USER",
        cellId: "",
        agentCellIds: [],
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    }
  }
  async function activate(user: AdminUser) {
    try {
      await api(`/users/${user.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible");
    }
  }
  function startEdit(user: AdminUser) {
    setEditing(user);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      cellId: user.cell?.id ?? "",
      agentCellIds: user.agentCells.map((membership) => membership.cellId),
      isActive: user.isActive,
      newPassword: "",
      confirmNewPassword: "",
    });
    setError("");
  }
  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    if (
      editForm.newPassword &&
      editForm.newPassword !== editForm.confirmNewPassword
    ) {
      setError("La confirmation du nouveau mot de passe ne correspond pas.");
      return;
    }
    setError("");
    try {
      const { newPassword, confirmNewPassword, ...profile } = editForm;
      await api(`/users/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...profile,
          cellId: profile.role === "USER" ? profile.cellId : null,
          agentCellIds: profile.role === "AGENT" ? profile.agentCellIds : [],
          ...(newPassword ? { newPassword, confirmNewPassword } : {}),
        }),
      });
      setEditing(null);
      setEditForm((current) => ({
        ...current,
        newPassword: "",
        confirmNewPassword: "",
      }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible");
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">GESTION DES ACCÈS</div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">
            Comptes, rôles et rattachements aux cellules.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus />
          Créer un compte
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {showForm && (
        <section className="panel form-panel" style={{ marginBottom: 14 }}>
          <div
            className="panel-head"
            style={{ padding: "0 0 15px", marginBottom: 16 }}
          >
            <h2 className="panel-title">Nouveau compte</h2>
            <button
              className="table-link"
              onClick={() => setShowForm(false)}
              aria-label="Fermer"
            >
              <X size={17} />
            </button>
          </div>
          <form onSubmit={create}>
            <div className="form-grid">
              {(
                [
                  ["Prénom", "firstName"],
                  ["Nom", "lastName"],
                  ["Adresse e-mail", "email"],
                  ["Mot de passe initial (12 caractères minimum)", "password"],
                ] as const
              ).map(([label, key]) => (
                <div className="field" key={key}>
                  <label htmlFor={`create-${key}`}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id={`create-${key}`}
                      className="control"
                      style={key === "password" ? { paddingRight: 42 } : undefined}
                      type={
                        key === "password"
                          ? showCreatePassword
                            ? "text"
                            : "password"
                          : key === "email"
                            ? "email"
                            : "text"
                      }
                      autoComplete={key === "password" ? "new-password" : undefined}
                      minLength={key === "password" ? 12 : undefined}
                      required
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                    />
                    {key === "password" && (
                      <button
                        type="button"
                        aria-label={showCreatePassword ? "Masquer le mot de passe initial" : "Afficher le mot de passe initial"}
                        aria-pressed={showCreatePassword}
                        title={showCreatePassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                        onClick={() => setShowCreatePassword((visible) => !visible)}
                        style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}
                      >
                        {showCreatePassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="field">
                <label>Rôle</label>
                <select
                  className="control"
                  value={form.role}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      role: e.target.value as Role,
                      cellId: "",
                      agentCellIds: [],
                    })
                  }
                >
                  <option value="USER">Collaborateur</option>
                  <option value="AGENT">Agent de traitement</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              {form.role === "USER" && (
                <div className="field">
                  <label>Cellule</label>
                  <select
                    className="control"
                    required
                    value={form.cellId}
                    onChange={(e) =>
                      setForm({ ...form, cellId: e.target.value })
                    }
                  >
                    <option value="">Choisir une cellule</option>
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {form.role === "AGENT" && (
                <div className="field full">
                  <label>Cellules de traitement</label>
                  <select
                    className="control"
                    aria-label="Cellules de traitement autorisées"
                    multiple
                    required
                    size={Math.min(Math.max(cells.length, 2), 5)}
                    style={{ height: "auto", minHeight: 76, padding: 8 }}
                    value={form.agentCellIds}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        agentCellIds: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      })
                    }
                  >
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                  <span className="activity-meta">
                    Sélectionnez une ou plusieurs cellules (Ctrl+clic pour en choisir plusieurs).
                  </span>
                  {!cells.length && (
                    <span className="field-error">
                      Créez ou activez une cellule avant d’affecter un agent.
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="button button-primary">
                Créer l’utilisateur
              </button>
            </div>
          </form>
        </section>
      )}
      {editing && (
        <section className="panel form-panel" style={{ marginBottom: 14 }}>
          <div
            className="panel-head"
            style={{ padding: "0 0 15px", marginBottom: 16 }}
          >
            <div>
              <h2 className="panel-title">Modifier le compte</h2>
              <div className="panel-note">{editing.email}</div>
            </div>
            <button
              type="button"
              className="table-link"
              onClick={() => setEditing(null)}
              aria-label="Fermer"
            >
              <X size={17} />
            </button>
          </div>
          <form onSubmit={saveEdit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="edit-first-name">Prénom</label>
                <input
                  id="edit-first-name"
                  className="control"
                  required
                  value={editForm.firstName}
                  onChange={(event) =>
                    setEditForm({ ...editForm, firstName: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-last-name">Nom</label>
                <input
                  id="edit-last-name"
                  className="control"
                  required
                  value={editForm.lastName}
                  onChange={(event) =>
                    setEditForm({ ...editForm, lastName: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-email">Adresse e-mail</label>
                <input
                  id="edit-email"
                  className="control"
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(event) =>
                    setEditForm({ ...editForm, email: event.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="edit-role">Rôle</label>
                <select
                  id="edit-role"
                  className="control"
                  value={editForm.role}
                  onChange={(event) =>
                    setEditForm({
                      ...editForm,
                      role: event.target.value as Role,
                      cellId: "",
                      agentCellIds: [],
                    })
                  }
                >
                  <option value="USER">Collaborateur</option>
                  <option value="AGENT">Agent de traitement</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              {editForm.role === "USER" && (
                <div className="field">
                  <label htmlFor="edit-cell">Cellule</label>
                  <select
                    id="edit-cell"
                    className="control"
                    required
                    value={editForm.cellId}
                    onChange={(event) =>
                      setEditForm({ ...editForm, cellId: event.target.value })
                    }
                  >
                    <option value="">Choisir une cellule</option>
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {editForm.role === "AGENT" && (
                <div className="field full">
                  <label>Cellules autorisées</label>
                  <select
                    className="control"
                    aria-label="Cellules autorisées pour cet agent"
                    multiple
                    required
                    size={Math.min(Math.max(cells.length, 2), 5)}
                    style={{ height: "auto", minHeight: 76, padding: 8 }}
                    value={editForm.agentCellIds}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        agentCellIds: Array.from(
                          event.target.selectedOptions,
                          (option) => option.value,
                        ),
                      })
                    }
                  >
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>
                        {cell.name}
                      </option>
                    ))}
                  </select>
                  <span className="activity-meta">
                    Sélectionnez une ou plusieurs cellules (Ctrl+clic pour en choisir plusieurs).
                  </span>
                  {!cells.length && (
                    <span className="field-error">
                      Créez ou activez une cellule avant d’affecter un agent.
                    </span>
                  )}
                </div>
              )}
              <div className="field">
                <label htmlFor="edit-new-password">Nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input
                    id="edit-new-password"
                    className="control"
                    style={{ paddingRight: 42 }}
                    type={showNewPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    value={editForm.newPassword}
                    onChange={(event) =>
                      setEditForm({ ...editForm, newPassword: event.target.value })
                    }
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}
                    aria-pressed={showNewPassword}
                    title={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowNewPassword((visible) => !visible)}
                    style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}
                  >
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <span className="activity-meta">
                  Laissez vide pour conserver le mot de passe actuel. Minimum 12 caractères.
                </span>
              </div>
              <div className="field">
                <label htmlFor="edit-confirm-password">
                  Confirmer le nouveau mot de passe
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    id="edit-confirm-password"
                    className="control"
                    style={{ paddingRight: 42 }}
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={12}
                    value={editForm.confirmNewPassword}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        confirmNewPassword: event.target.value,
                      })
                    }
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"}
                    aria-pressed={showConfirmPassword}
                    title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}
                  >
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div className="field full">
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 14px",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    background: editForm.isActive ? "#f4faf5" : "#f8f8f7",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    style={{ width: 17, height: 17, margin: 0 }}
                    onChange={(event) =>
                      setEditForm({
                        ...editForm,
                        isActive: event.target.checked,
                      })
                    }
                  />
                  <span style={{ display: "grid", gap: 3, flex: 1 }}>
                    <strong style={{ fontSize: 12 }}>Compte actif</strong>
                    <span className="activity-meta">
                      {editForm.isActive
                        ? "L’utilisateur peut se connecter."
                        : "L’accès de l’utilisateur est suspendu."}
                    </span>
                  </span>
                  <span
                    className={`status ${editForm.isActive ? "status-RESOLVED" : "status-CLOSED"}`}
                  >
                    {editForm.isActive ? "Actif" : "Inactif"}
                  </span>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setEditing(null)}
              >
                Annuler
              </button>
              <button className="button button-primary">Enregistrer</button>
            </div>
          </form>
        </section>
      )}
      <div className="panel list-panel">
        <div className="filter-bar">
          <div className="search-field">
            <Search />
            <input
              className="control"
              placeholder="Rechercher un nom ou un e-mail…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Adresse e-mail</th>
                <th>Rôle</th>
                <th>Cellule</th>
                <th>Compte</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>
                      {item.firstName} {item.lastName}
                    </strong>
                  </td>
                  <td>{item.email}</td>
                  <td>{roleNames[item.role]}</td>
                  <td>
                    {item.role === "AGENT"
                      ? item.agentCells.map(({ cell }) => cell.name).join(", ") || "—"
                      : item.cell?.name ??
                        (item.role === "ADMIN" ? "Accès transversal" : "—")}
                  </td>
                  <td>
                    <span
                      className={`status ${item.isActive ? "status-RESOLVED" : "status-CLOSED"}`}
                    >
                      {item.isActive ? "Actif" : "Désactivé"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => void activate(item)}
                    >
                      {item.isActive ? "Désactiver" : "Réactiver"}
                    </button>
                  </td>
                  <td>
                    <button
                      className="table-link"
                      onClick={() => startEdit(item)}
                    >
                      Modifier
                    </button>
                    <button
                      className="table-link"
                      onClick={() => void activate(item)}
                    >
                      {item.isActive ? "Désactiver" : "Réactiver"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && <Empty title="Aucun utilisateur" />}
        </div>
      </div>
    </>
  );
}
function AdminServices() {
  const [items, setItems] = useState<
    {
      id: string;
      name: string;
      isActive: boolean;
      cells: { id: string; name: string; isActive: boolean }[];
    }[]
  >([]);
  const [error, setError] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [cellName, setCellName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [show, setShow] = useState(false);
  async function load() {
    try {
      const data = await api<{ items: typeof items }>("/services");
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function createService() {
    try {
      await api("/services", {
        method: "POST",
        body: JSON.stringify({ name: serviceName }),
      });
      setServiceName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    }
  }
  async function createCell() {
    try {
      await api("/cells", {
        method: "POST",
        body: JSON.stringify({ name: cellName, serviceId }),
      });
      setCellName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création impossible");
    }
  }
  async function toggleCell(cell: { id: string; isActive: boolean }) {
    try {
      await api(`/cells/${cell.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !cell.isActive }),
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification impossible");
    }
  }
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">STRUCTURE ORGANISATIONNELLE</div>
          <h1 className="page-title">Services & cellules</h1>
          <p className="page-subtitle">
            Organisez les équipes et leurs périmètres d’intervention.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => setShow(!show)}
        >
          <Plus />
          Ajouter
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {show && (
        <section className="panel form-panel" style={{ marginBottom: 14 }}>
          <div className="form-grid">
            <div className="field">
              <label>Nom du service</label>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  className="control"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="Ex. Relation client"
                />
                <button
                  className="button button-primary"
                  disabled={!serviceName.trim()}
                  onClick={createService}
                >
                  Créer
                </button>
              </div>
            </div>
            <div className="field">
              <label>Nom de la cellule</label>
              <div style={{ display: "flex", gap: 7 }}>
                <input
                  className="control"
                  value={cellName}
                  onChange={(e) => setCellName(e.target.value)}
                  placeholder="Ex. Équipe Nord"
                />
                <button
                  className="button button-primary"
                  disabled={!cellName.trim() || !serviceId}
                  onClick={createCell}
                >
                  Créer
                </button>
              </div>
            </div>
            <div className="field">
              <label>Service de rattachement</label>
              <select
                className="control"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                <option value="">Choisir un service</option>
                {items.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((item) => (
          <section className="panel" key={item.id}>
            <div className="panel-head">
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <span className="metric-icon">
                  <BriefcaseBusiness size={15} />
                </span>
                <div>
                  <h2 className="panel-title">{item.name}</h2>
                  <div className="panel-note">
                    {item.cells.length} cellule
                    {item.cells.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <span
                className={`status ${item.isActive ? "status-RESOLVED" : "status-CLOSED"}`}
              >
                {item.isActive ? "Actif" : "Inactif"}
              </span>
            </div>
            <div
              className="detail-meta"
              style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            >
              {item.cells.map((cell) => (
                <div
                  key={cell.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    padding: "7px 9px",
                    fontSize: 11,
                  }}
                >
                  {cell.name}
                  <button
                    className="table-link"
                    onClick={() => void toggleCell(cell)}
                  >
                    {cell.isActive ? "Désactiver" : "Activer"}
                  </button>
                </div>
              ))}
              {!item.cells.length && (
                <span className="muted" style={{ fontSize: 11 }}>
                  Aucune cellule associée
                </span>
              )}
            </div>
          </section>
        ))}
        {!items.length && (
          <div className="panel">
            <Empty
              title="Aucun service actif"
              text="Ajoutez un service pour commencer à organiser vos cellules."
            />
          </div>
        )}
      </div>
    </>
  );
}

function AdminTicketCategories() {
  type TicketCategory = {
    id: string;
    name: string;
    description: string | null;
    isActive: boolean;
  };
  const [items, setItems] = useState<TicketCategory[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<{ items: TicketCategory[] }>("/ticket-categories");
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement des catégories impossible");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api("/ticket-categories", {
        method: "POST",
        body: JSON.stringify({ name, description: description.trim() || undefined }),
      });
      setName("");
      setDescription("");
      setSuccess("La catégorie a été créée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Création de la catégorie impossible");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: TicketCategory) {
    setError("");
    setSuccess("");
    try {
      await api(`/ticket-categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setSuccess(category.isActive ? "La catégorie a été désactivée." : "La catégorie a été réactivée.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Modification de la catégorie impossible");
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">PARAMÈTRES DES TICKETS</div>
          <h1 className="page-title">Catégories de tickets</h1>
          <p className="page-subtitle">
            Définissez les catégories proposées lors de la création d’un ticket.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => document.getElementById("category-name")?.focus()}
        >
          <Plus />
          Nouvelle catégorie
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <section className="panel form-panel" style={{ marginBottom: 14 }}>
        <form onSubmit={createCategory}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="category-name">Nom de la catégorie</label>
              <input
                id="category-name"
                className="control"
                minLength={2}
                maxLength={80}
                required
                placeholder="Ex. Accès, Facturation, Incident technique"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="category-description">Description (facultative)</label>
              <input
                id="category-description"
                className="control"
                maxLength={500}
                placeholder="Courte indication pour les utilisateurs"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
          </div>
          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={busy || name.trim().length < 2}
            >
              <Plus />
              {busy ? "Création…" : "Créer la catégorie"}
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Catégories disponibles</h2>
            <div className="panel-note">
              Les catégories désactivées restent associées aux tickets existants.
            </div>
          </div>
        </div>
        {!items.length ? (
          <Empty
            title="Aucune catégorie"
            text="Créez une catégorie pour la proposer lors de la création des tickets."
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Description</th>
                  <th>État</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((category) => (
                  <tr key={category.id}>
                    <td><strong>{category.name}</strong></td>
                    <td className="muted">{category.description || "—"}</td>
                    <td>
                      <span className={`status ${category.isActive ? "status-RESOLVED" : "status-CLOSED"}`}>
                        {category.isActive ? "Active" : "Désactivée"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-link"
                        onClick={() => void toggleCategory(category)}
                      >
                        {category.isActive ? "Désactiver" : "Réactiver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
