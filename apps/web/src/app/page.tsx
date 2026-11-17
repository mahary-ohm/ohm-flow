"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useState } from "react";
import {
  CreateTicketSchema,
  UpdateTicketSchema,
  type TicketStatus,
} from "@ohmflow/shared";
import type { Metrics, Ticket, TicketDetail, User, View } from "../components/ohmflow-types";
import { WorkspaceViews } from "../components/ohmflow-workspace";
import { TicketDetailView } from "../components/ohmflow-ticket-detail";
import { AppShell } from "../components/ohmflow-shell";
import { api, Brand, dateShort, Empty, initials, labels, roleNames, Status } from "../components/ohmflow-ui";
import { LoginScreen } from "../components/ohmflow-login";
import { buildMetricCards, buildNavigation, pageTitles } from "../components/ohmflow-dashboard-config";

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
        e instanceof Error ? e.message : "Impossible de charger les donn├®es",
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
        setError(e instanceof Error ? e.message : "Chargement des cellules et cat├®gories impossible"),
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
      setError("V├®rifiez lÔÇÖobjet, la description, la cellule et la cat├®gorie du ticket.");
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
      setSuccess("Votre ticket a ├®t├® modifi├®.");
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
      setSuccess("Votre demande a bien ├®t├® cr├®├®e.");
      setView("tickets");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cr├®ation impossible");
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
      setSuccess("Le ticket vous est attribu├®.");
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
      setSuccess("Le statut du ticket a ├®t├® mis ├á jour.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise ├á jour impossible");
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
      setSuccess("Commentaire ajout├®.");
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
      setSuccess("Le ticket a ├®t├® affect├®.");
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
      <LoginScreen
        error={error}
        busy={busy}
        loginForm={loginForm}
        onLogin={onLogin}
        showPassword={showLoginPassword}
        setShowPassword={setShowLoginPassword}
      />
    );

  const nav = buildNavigation(user.role, metrics);
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
  const metricCards = buildMetricCards(user.role, metrics);

  const navClick = (next: View) => {
    setView(next);
    setDetail(null);
    setError("");
    setSuccess("");
    setMobileNav(false);
  };
  const heading = detail ? detail.reference : pageTitles[view];
  return (
    <AppShell {...{ user, userName, nav, view, detail, mobileNav, setMobileNav, logout, heading, navClick }}>
        <section className="workspace fade-in">
          {error && <div className="error-banner">{error}</div>}
          {success && <div className="success-banner">{success}</div>}
          <WorkspaceViews {...{ api, user, view, detail, metrics, recent, tickets, total, shownTickets, page, search, setSearch, statusFilter, setStatusFilter, setPage, navClick, openTicket, ticketForm, createTicket, busy, ticketCategories, ticketCells, userName, metricCards, roleNames, initials, labels, Status, Empty }} />
          {detail && (
            <TicketDetailView {...{
              user, detail, labels, Status, ticketCanBeEdited, ticketEditMode,
              setTicketEditMode, ticketEditOptionsLoading, ticketEditForm,
              setTicketEditForm, ticketCells, ticketCategories, saveTicketEdit,
              beginTicketEdit, claimTicket, setDetail, setView, busy, comment,
              setComment, addComment, agentsLoading, eligibleAgents,
              agentsLoadError, selectedAgent, setSelectedAgent, assignTicket,
              changeStatus, dateShort,
            }} />
          )}        </section>
      </AppShell>
  );
}

