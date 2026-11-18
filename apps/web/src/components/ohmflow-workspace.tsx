"use client";

import { type ReactElement } from "react";
import { type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { ArrowLeft, ArrowRight, FilePlus2, MoreHorizontal, Plus, type LucideIcon } from "lucide-react";
import { CreateTicketSchema, type Role, type TicketStatus } from "@ohmflow/shared";
import { AdminServices, AdminTicketCategories, AdminUsers, DetailValue, Pagination, TicketFilters, TicketTable } from "./ohmflow-admin";
import type { Metrics, Ticket, TicketDetail, User, View } from "./ohmflow-types";

export type WorkspaceViewsProps = {
  api: <T>(path: string, init?: RequestInit) => Promise<T>;
  user: User;
  view: View;
  detail: TicketDetail | null;
  metrics: Metrics | null;
  recent: Ticket[];
  tickets: Ticket[];
  total: number;
  shownTickets: Ticket[];
  page: number;
  search: string;
  setSearch: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  setPage: (page: number) => void;
  navClick: (view: View) => void;
  openTicket: (ticket: Ticket) => void | Promise<void>;
  ticketForm: UseFormReturn<z.infer<typeof CreateTicketSchema>>;
  createTicket: (values: z.infer<typeof CreateTicketSchema>) => void | Promise<void>;
  busy: boolean;
  ticketCategories: { id: string; name: string; description?: string | null }[];
  ticketCells: { id: string; name: string; service: { name: string } }[];
  userName: string;
  metricCards: { label: string; value: number; note: string; icon: LucideIcon }[];
  roleNames: Record<Role, string>;
  initials: (user: User) => string;
  labels: Record<TicketStatus, string>;
  Status: ({ status }: { status: TicketStatus }) => ReactElement;
  Empty: ({ title, text }: { title: string; text?: string }) => ReactElement;
};

export function WorkspaceViews(props: WorkspaceViewsProps) {
  const {
    api, user, view, detail, metrics, recent, tickets, total, shownTickets, page,
    search, setSearch, statusFilter, setStatusFilter, setPage, navClick,
    openTicket, ticketForm, createTicket, busy, ticketCategories, ticketCells,
    userName, metricCards, roleNames, initials, labels, Status, Empty,
  } = props;

  return (
    <>{!detail && view === "dashboard" && (
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
                  <TicketTable
                    tickets={recent}
                    onOpen={openTicket}
                    labels={labels}
                    Status={Status}
                    Empty={Empty}
                  />
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
                labels={labels}
              />
              <div className="panel list-panel">
                <TicketTable
                  tickets={tickets}
                  onOpen={openTicket}
                  labels={labels}
                  Status={Status}
                  Empty={Empty}
                />
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
                labels={labels}
              />
              <div className="panel list-panel">
                <TicketTable
                  tickets={shownTickets}
                  onOpen={openTicket}
                  labels={labels}
                  Status={Status}
                  Empty={Empty}
                />
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
          {!detail && view === "users" && (
            <AdminUsers api={api} roleNames={roleNames} Empty={Empty} />
          )}
          {!detail && view === "services" && <AdminServices api={api} />}
          {!detail && view === "categories" && (
            <AdminTicketCategories api={api} />
          )}
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
              </>
  );
}