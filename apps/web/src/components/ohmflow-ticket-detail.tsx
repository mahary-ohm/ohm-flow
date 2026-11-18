"use client";

import { type Dispatch, type FormEvent, type ReactElement, type SetStateAction } from "react";
import { ArrowLeft, Check, Clock3, MessageSquareText, Pencil, Settings2 } from "lucide-react";
import { statusTransitions, type TicketStatus } from "@ohmflow/shared";
import { DetailValue } from "./ohmflow-admin";
import type { TicketDetail, TicketEditForm, User, View } from "./ohmflow-types";

export type { TicketEditForm };

type AgentOption = { id: string; firstName: string; lastName: string };

export type TicketDetailViewProps = {
  user: User;
  detail: TicketDetail;
  labels: Record<TicketStatus, string>;
  Status: ({ status }: { status: TicketStatus }) => ReactElement;
  ticketCanBeEdited: boolean;
  ticketEditMode: boolean;
  setTicketEditMode: (value: boolean) => void;
  ticketEditOptionsLoading: boolean;
  ticketEditForm: TicketEditForm;
  setTicketEditForm: Dispatch<SetStateAction<TicketEditForm>>;
  ticketCells: { id: string; name: string; service: { name: string } }[];
  ticketCategories: { id: string; name: string; description?: string | null }[];
  ticketGrds: { id: string; name: string }[];
  saveTicketEdit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  beginTicketEdit: () => void | Promise<void>;
  claimTicket: () => void | Promise<void>;
  setDetail: Dispatch<SetStateAction<TicketDetail | null>>;
  setView: Dispatch<SetStateAction<View>>;
  busy: boolean;
  comment: string;
  setComment: (value: string) => void;
  addComment: () => void | Promise<void>;
  agentsLoading: boolean;
  eligibleAgents: AgentOption[];
  agentsLoadError: string;
  selectedAgent: string;
  setSelectedAgent: (value: string) => void;
  assignTicket: () => void | Promise<void>;
  changeStatus: (status: TicketStatus) => void | Promise<void>;
  dateShort: (value: string) => string;
};

export function TicketDetailView(props: TicketDetailViewProps) {
  const {
    user, detail, labels, Status, ticketCanBeEdited, ticketEditMode,
    setTicketEditMode, ticketEditOptionsLoading, ticketEditForm,
    setTicketEditForm, ticketCells, ticketCategories, ticketGrds, saveTicketEdit,
    beginTicketEdit, claimTicket, setDetail, setView, busy, comment,
    setComment, addComment, agentsLoading, eligibleAgents, agentsLoadError,
    selectedAgent, setSelectedAgent, assignTicket, changeStatus, dateShort,
  } = props;

  return (
    <>
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
                          <div className="field">
                            <label htmlFor="edit-ticket-grd">GRD</label>
                            <select
                              id="edit-ticket-grd"
                              className="control"
                              required
                              value={ticketEditForm.grdId}
                              disabled={ticketEditOptionsLoading}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  grdId: event.target.value,
                                })
                              }
                            >
                              <option value="">Choisir un GRD</option>
                              {ticketGrds.map((grd) => (
                                <option key={grd.id} value={grd.id}>
                                  {grd.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="edit-ticket-pdl-pce">PDL / PCE (facultatif)</label>
                            <input
                              id="edit-ticket-pdl-pce"
                              className="control"
                              maxLength={50}
                              value={ticketEditForm.pdlPce}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  pdlPce: event.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="field">
                            <label htmlFor="edit-ticket-haulogy">N° ticket Haulogy (facultatif)</label>
                            <input
                              id="edit-ticket-haulogy"
                              className="control"
                              maxLength={50}
                              value={ticketEditForm.haulogyTicketNumber}
                              onChange={(event) =>
                                setTicketEditForm({
                                  ...ticketEditForm,
                                  haulogyTicketNumber: event.target.value,
                                })
                              }
                            />
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
                      <DetailValue label="GRD" value={detail.grd?.name ?? "Non renseigné"} />
                      <DetailValue label="PDL / PCE" value={detail.pdlPce ?? "Non renseigné"} />
                      <DetailValue
                        label="N° ticket Haulogy"
                        value={detail.haulogyTicketNumber ?? "Non renseigné"}
                      />
                      <DetailValue
                        label="Service"
                        value={detail.cell.service.name}
                      />
                      <DetailValue
                        label="Résolu le"
                        value={detail.resolvedAt ? dateShort(detail.resolvedAt) : "Non résolu"}
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
                              {statusTransitions[detail.status].map((status) => (
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

    </>
  );
}
