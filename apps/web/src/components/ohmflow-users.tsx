import { Eye, EyeOff, Plus, Search, X } from "lucide-react";
import { type ReactElement, useState } from "react";
import { type Role } from "@ohmflow/shared";
import { useAdminUsers, type AdminUser } from "../hooks/use-admin-users";
import type { ApiClient } from "../lib/api";

export function AdminUsers({
  api,
  roleNames,
  Empty,
}: {
  api: ApiClient;
  roleNames: Record<Role, string>;
  Empty: ({ title, text }: { title: string; text?: string }) => ReactElement;
}) {
  const {
    items, cells, query, setQuery, error, showForm, setShowForm,
    form, setForm, create, activate,
    editing, setEditing, editForm, setEditForm, startEdit: beginEdit, saveEdit,
  } = useAdminUsers(api);
  // Visibilité des mots de passe : état purement visuel, propre au composant.
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function startEdit(user: AdminUser) {
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    beginEdit(user);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">GESTION DES ACCÈS</div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Comptes, rôles et rattachements aux cellules.</p>
        </div>
        <button className="button button-primary" onClick={() => setShowForm(!showForm)}>
          <Plus />
          Créer un compte
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {showForm && (
        <section className="panel form-panel" style={{ marginBottom: 14 }}>
          <div className="panel-head" style={{ padding: "0 0 15px", marginBottom: 16 }}>
            <h2 className="panel-title">Nouveau compte</h2>
            <button className="table-link" onClick={() => setShowForm(false)} aria-label="Fermer">
              <X size={17} />
            </button>
          </div>
          <form onSubmit={create}>
            <div className="form-grid">
              {([
                ["Prénom", "firstName"],
                ["Nom", "lastName"],
                ["Adresse e-mail", "email"],
                ["Mot de passe initial (12 caractères minimum)", "password"],
              ] as const).map(([label, key]) => (
                <div className="field" key={key}>
                  <label htmlFor={`create-${key}`}>{label}</label>
                  <div style={{ position: "relative" }}>
                    <input
                      id={`create-${key}`}
                      className="control"
                      style={key === "password" ? { paddingRight: 42 } : undefined}
                      type={key === "password" ? (showCreatePassword ? "text" : "password") : key === "email" ? "email" : "text"}
                      autoComplete={key === "password" ? "new-password" : undefined}
                      minLength={key === "password" ? 12 : undefined}
                      required
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, role: e.target.value as Role, cellId: "", agentCellIds: [] })}
                >
                  <option value="USER">Collaborateur</option>
                  <option value="AGENT">Agent de traitement</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              {form.role === "USER" && (
                <div className="field">
                  <label>Cellule</label>
                  <select className="control" required value={form.cellId} onChange={(e) => setForm({ ...form, cellId: e.target.value })}>
                    <option value="">Choisir une cellule</option>
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>{cell.name}</option>
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
                    onChange={(event) => setForm({ ...form, agentCellIds: Array.from(event.target.selectedOptions, (option) => option.value) })}
                  >
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>{cell.name}</option>
                    ))}
                  </select>
                  <span className="activity-meta">Sélectionnez une ou plusieurs cellules (Ctrl+clic pour en choisir plusieurs).</span>
                  {!cells.length && <span className="field-error">Créez ou activez une cellule avant d’affecter un agent.</span>}
                </div>
              )}
            </div>
            <div className="form-actions">
              <button className="button button-primary">Créer l’utilisateur</button>
            </div>
          </form>
        </section>
      )}
      {editing && (
        <section className="panel form-panel" style={{ marginBottom: 14 }}>
          <div className="panel-head" style={{ padding: "0 0 15px", marginBottom: 16 }}>
            <div>
              <h2 className="panel-title">Modifier le compte</h2>
              <div className="panel-note">{editing.email}</div>
            </div>
            <button type="button" className="table-link" onClick={() => setEditing(null)} aria-label="Fermer">
              <X size={17} />
            </button>
          </div>
          <form onSubmit={saveEdit}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="edit-first-name">Prénom</label>
                <input id="edit-first-name" className="control" required value={editForm.firstName} onChange={(event) => setEditForm({ ...editForm, firstName: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="edit-last-name">Nom</label>
                <input id="edit-last-name" className="control" required value={editForm.lastName} onChange={(event) => setEditForm({ ...editForm, lastName: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="edit-email">Adresse e-mail</label>
                <input id="edit-email" className="control" type="email" required value={editForm.email} onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} />
              </div>
              <div className="field">
                <label htmlFor="edit-role">Rôle</label>
                <select id="edit-role" className="control" value={editForm.role} onChange={(event) => setEditForm({ ...editForm, role: event.target.value as Role, cellId: "", agentCellIds: [] })}>
                  <option value="USER">Collaborateur</option>
                  <option value="AGENT">Agent de traitement</option>
                  <option value="ADMIN">Administrateur</option>
                </select>
              </div>
              {editForm.role === "USER" && (
                <div className="field">
                  <label htmlFor="edit-cell">Cellule</label>
                  <select id="edit-cell" className="control" required value={editForm.cellId} onChange={(event) => setEditForm({ ...editForm, cellId: event.target.value })}>
                    <option value="">Choisir une cellule</option>
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>{cell.name}</option>
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
                    onChange={(event) => setEditForm({ ...editForm, agentCellIds: Array.from(event.target.selectedOptions, (option) => option.value) })}
                  >
                    {cells.map((cell) => (
                      <option key={cell.id} value={cell.id}>{cell.name}</option>
                    ))}
                  </select>
                  <span className="activity-meta">Sélectionnez une ou plusieurs cellules (Ctrl+clic pour en choisir plusieurs).</span>
                  {!cells.length && <span className="field-error">Créez ou activez une cellule avant d’affecter un agent.</span>}
                </div>
              )}
              <div className="field">
                <label htmlFor="edit-new-password">Nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input id="edit-new-password" className="control" style={{ paddingRight: 42 }} type={showNewPassword ? "text" : "password"} autoComplete="new-password" minLength={12} value={editForm.newPassword} onChange={(event) => setEditForm({ ...editForm, newPassword: event.target.value })} />
                  <button type="button" aria-label={showNewPassword ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"} aria-pressed={showNewPassword} title={showNewPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowNewPassword((visible) => !visible)} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}>
                    {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                <span className="activity-meta">Laissez vide pour conserver le mot de passe actuel. Minimum 12 caractères.</span>
              </div>
              <div className="field">
                <label htmlFor="edit-confirm-password">Confirmer le nouveau mot de passe</label>
                <div style={{ position: "relative" }}>
                  <input id="edit-confirm-password" className="control" style={{ paddingRight: 42 }} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength={12} value={editForm.confirmNewPassword} onChange={(event) => setEditForm({ ...editForm, confirmNewPassword: event.target.value })} />
                  <button type="button" aria-label={showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"} aria-pressed={showConfirmPassword} title={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShowConfirmPassword((visible) => !visible)} style={{ position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", border: 0, background: "transparent", color: "#75817b", display: "grid", placeItems: "center", padding: 5 }}>
                    {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>
              <div className="field full">
                <label style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", border: "1px solid var(--line)", borderRadius: 6, background: editForm.isActive ? "#f4faf5" : "#f8f8f7", cursor: "pointer" }}>
                  <input type="checkbox" checked={editForm.isActive} style={{ width: 17, height: 17, margin: 0 }} onChange={(event) => setEditForm({ ...editForm, isActive: event.target.checked })} />
                  <span style={{ display: "grid", gap: 3, flex: 1 }}>
                    <strong style={{ fontSize: 12 }}>Compte actif</strong>
                    <span className="activity-meta">{editForm.isActive ? "L’utilisateur peut se connecter." : "L’accès de l’utilisateur est suspendu."}</span>
                  </span>
                  <span className={`status ${editForm.isActive ? "status-RESOLVED" : "status-CLOSED"}`}>{editForm.isActive ? "Actif" : "Inactif"}</span>
                </label>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="button button-secondary" onClick={() => setEditing(null)}>Annuler</button>
              <button className="button button-primary">Enregistrer</button>
            </div>
          </form>
        </section>
      )}
      <div className="panel list-panel">
        <div className="filter-bar">
          <div className="search-field">
            <Search />
            <input className="control" placeholder="Rechercher un nom ou un e-mail…" value={query} onChange={(e) => setQuery(e.target.value)} />
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
                  <td><strong>{item.firstName} {item.lastName}</strong></td>
                  <td>{item.email}</td>
                  <td>{roleNames[item.role]}</td>
                  <td>
                    {item.role === "AGENT"
                      ? item.agentCells.map(({ cell }) => cell.name).join(", ") || "—"
                      : item.cell?.name ?? (item.role === "ADMIN" ? "Accès transversal" : "—")}
                  </td>
                  <td>
                    <span className={`status ${item.isActive ? "status-RESOLVED" : "status-CLOSED"}`}>{item.isActive ? "Actif" : "Désactivé"}</span>
                  </td>
                  <td>
                    <button className="table-link" onClick={() => void activate(item)}>{item.isActive ? "Désactiver" : "Réactiver"}</button>
                  </td>
                  <td>
                    <button className="table-link" onClick={() => startEdit(item)}>Modifier</button>
                    <button className="table-link" onClick={() => void activate(item)}>{item.isActive ? "Désactiver" : "Réactiver"}</button>
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

