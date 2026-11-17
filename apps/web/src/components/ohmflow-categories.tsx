import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty } from "./ohmflow-tickets";
export function AdminTicketCategories({ api }: { api: <T>(path: string, init?: RequestInit) => Promise<T> }) {
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
      const data = await api<{ items: TicketCategory[] }>('/ticket-categories');
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement des catégories impossible');
    }
  }

  useEffect(() => { void load(); }, []);

  async function createCategory(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await api('/ticket-categories', {
        method: 'POST',
        body: JSON.stringify({ name, description: description.trim() || undefined }),
      });
      setName("");
      setDescription("");
      setSuccess('La catégorie a été créée.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création de la catégorie impossible');
    } finally {
      setBusy(false);
    }
  }

  async function toggleCategory(category: TicketCategory) {
    setError("");
    setSuccess("");
    try {
      await api(`/ticket-categories/${category.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !category.isActive }),
      });
      setSuccess(category.isActive ? 'La catégorie a été désactivée.' : 'La catégorie a été réactivée.');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification de la catégorie impossible');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">PARAMÈTRES DES TICKETS</div>
          <h1 className="page-title">Catégories de tickets</h1>
          <p className="page-subtitle">Définissez les catégories proposées lors de la création d’un ticket.</p>
        </div>
        <button className="button button-primary" onClick={() => document.getElementById('category-name')?.focus()}>
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
              <input id="category-name" className="control" minLength={2} maxLength={80} required placeholder="Ex. Accès, Facturation, Incident technique" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="category-description">Description (facultative)</label>
              <input id="category-description" className="control" maxLength={500} placeholder="Courte indication pour les utilisateurs" value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
          </div>
          <div className="form-actions">
            <button className="button button-primary" disabled={busy || name.trim().length < 2}>
              <Plus />
              {busy ? 'Création…' : 'Créer la catégorie'}
            </button>
          </div>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Catégories disponibles</h2>
            <div className="panel-note">Les catégories désactivées restent associées aux tickets existants.</div>
          </div>
        </div>
        {!items.length ? (
          <Empty title="Aucune catégorie" text="Créez une catégorie pour la proposer lors de la création des tickets." />
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
                    <td className="muted">{category.description || '—'}</td>
                    <td>
                      <span className={`status ${category.isActive ? 'status-RESOLVED' : 'status-CLOSED'}`}>{category.isActive ? 'Active' : 'Désactivée'}</span>
                    </td>
                    <td>
                      <button className="table-link" onClick={() => void toggleCategory(category)}>{category.isActive ? 'Désactiver' : 'Réactiver'}</button>
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
