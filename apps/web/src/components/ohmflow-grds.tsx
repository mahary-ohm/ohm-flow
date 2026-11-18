import { Plus } from "lucide-react";
import { useReferenceList } from "../hooks/use-reference-list";
import type { ApiClient } from "../lib/api";
import { Empty } from "./ohmflow-tickets";

const messages = {
  loadError: "Chargement des GRD impossible",
  created: "Le GRD a été créé.",
  createError: "Création du GRD impossible",
  deactivated: "Le GRD a été désactivé.",
  reactivated: "Le GRD a été réactivé.",
  updateError: "Modification du GRD impossible",
};

export function AdminGrds({ api }: { api: ApiClient }) {
  const {
    items, name, setName, description, setDescription, error, success, busy,
    create: createGrd, toggle: toggleGrd,
  } = useReferenceList(api, "/grds", messages);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">RÉFÉRENTIEL</div>
          <h1 className="page-title">Gestionnaires de réseau (GRD)</h1>
          <p className="page-subtitle">Définissez les gestionnaires de réseau de distribution proposés lors de la création d’un ticket.</p>
        </div>
        <button className="button button-primary" onClick={() => document.getElementById('grd-name')?.focus()}>
          <Plus />
          Nouveau GRD
        </button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {success && <div className="success-banner">{success}</div>}
      <section className="panel form-panel" style={{ marginBottom: 14 }}>
        <form onSubmit={createGrd}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="grd-name">Nom du GRD</label>
              <input id="grd-name" className="control" minLength={2} maxLength={80} required placeholder="Ex. Enedis, SRD, GEREDIS" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="grd-description">Description (facultative)</label>
              <input id="grd-description" className="control" maxLength={500} placeholder="Ex. zone couverte" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" disabled={busy || name.trim().length < 2}>
              <Plus />
              {busy ? 'Création…' : 'Créer le GRD'}
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">GRD disponibles</h2>
            <div className="panel-note">Les GRD désactivés restent associés aux tickets existants.</div>
          </div>
        </div>
        {!items.length ? (
          <Empty title="Aucun GRD" text="Créez un GRD pour le proposer lors de la création des tickets." />
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
                {items.map((grd) => (
                  <tr key={grd.id}>
                    <td><strong>{grd.name}</strong></td>
                    <td className="muted">{grd.description || '—'}</td>
                    <td>
                      <span className={`status ${grd.isActive ? 'status-RESOLVED' : 'status-CLOSED'}`}>{grd.isActive ? 'Actif' : 'Désactivé'}</span>
                    </td>
                    <td>
                      <button className="table-link" onClick={() => void toggleGrd(grd)}>{grd.isActive ? 'Désactiver' : 'Réactiver'}</button>
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
