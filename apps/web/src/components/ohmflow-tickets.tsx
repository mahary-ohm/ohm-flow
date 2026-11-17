import { ArrowLeft, ArrowRight, BriefcaseBusiness, Filter, Search } from "lucide-react";
import { type ReactElement, type ReactNode } from "react";
import { type Role, type TicketStatus } from "@ohmflow/shared";
export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  cellId: string | null;
};

export type Ticket = {
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

export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <BriefcaseBusiness size={16} />
      </div>
      <strong>{title}</strong>
      {text && <div style={{ marginTop: 5 }}>{text}</div>}
    </div>
  );
}

export function DetailValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="detail-row">
      <div className="detail-label">{label}</div>
      <div className="detail-value">{value}</div>
    </div>
  );
}

export function TicketTable({
  tickets,
  onOpen,
  labels,
  Status,
  Empty,
}: {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  labels: Record<TicketStatus, string>;
  Status: ({ status }: { status: TicketStatus }) => ReactElement;
  Empty: ({ title, text }: { title: string; text?: string }) => ReactElement;
}) {
  if (!tickets.length) {
    return (
      <Empty
        title="Aucun ticket à afficher"
        text="Les demandes correspondant à vos critères apparaîtront ici."
      />
    );
  }

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
              <td>{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(ticket.updatedAt))}</td>
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

export function TicketFilters({
  search,
  setSearch,
  status,
  setStatus,
  labels,
}: {
  search: string;
  setSearch: (value: string) => void;
  status: string;
  setStatus: (value: string) => void;
  labels: Record<TicketStatus, string>;
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

export function Pagination({
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
        Affichage de {total ? (page - 1) * 20 + 1 : 0} à {Math.min(page * 20, total)} sur {total} résultats
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

