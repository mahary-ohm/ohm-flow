import { BriefcaseBusiness, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty } from "./ohmflow-tickets";
export function AdminServices({ api }: { api: <T>(path: string, init?: RequestInit) => Promise<T> }) {
  const [items, setItems] = useState<{
    id: string;
    name: string;
    isActive: boolean;
    cells: { id: string; name: string; isActive: boolean }[];
  }[]>([]);
  const [error, setError] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [cellName, setCellName] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [show, setShow] = useState(false);

  async function load() {
    try {
      const data = await api<{ items: typeof items }>('/services');
      setItems(data.items);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }

  useEffect(() => { void load(); }, []);

  async function createService() {
    try {
      await api('/services', { method: 'POST', body: JSON.stringify({ name: serviceName }) });
      setServiceName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  }

  async function createCell() {
    try {
      await api('/cells', { method: 'POST', body: JSON.stringify({ name: cellName, serviceId }) });
      setCellName('');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Création impossible');
    }
  }

  async function toggleCell(cell: { id: string; isActive: boolean }) {
    try {
      await api(`/cells/${cell.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !cell.isActive }) });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Modification impossible');
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">STRUCTURE ORGANISATIONNELLE</div>
          <h1 className="page-title">Services & cellules</h1>
          <p className="page-subtitle">Organisez les équipes et leurs périmètres d’intervention.</p>
        </div>
        <button className="button button-primary" onClick={() => setShow(!show)}>
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
              <div style={{ display: 'flex', gap: 7 }}>
                <input className="control" value={serviceName} onChange={(e) => setServiceName(e.target.value)} placeholder="Ex. Relation client" />
                <button className="button button-primary" disabled={!serviceName.trim()} onClick={createService}>Créer</button>
              </div>
            </div>
            <div className="field">
              <label>Nom de la cellule</label>
              <div style={{ display: 'flex', gap: 7 }}>
                <input className="control" value={cellName} onChange={(e) => setCellName(e.target.value)} placeholder="Ex. Équipe Nord" />
                <button className="button button-primary" disabled={!cellName.trim() || !serviceId} onClick={createCell}>Créer</button>
              </div>
            </div>
            <div className="field">
              <label>Service de rattachement</label>
              <select className="control" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">Choisir un service</option>
                {items.map((item) => (
                  <option value={item.id} key={item.id}>{item.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>
      )}
      <div style={{ display: 'grid', gap: 12 }}>
        {items.map((item) => (
          <section className="panel" key={item.id}>
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span className="metric-icon"><BriefcaseBusiness size={15} /></span>
                <div>
                  <h2 className="panel-title">{item.name}</h2>
                  <div className="panel-note">{item.cells.length} cellule{item.cells.length !== 1 ? 's' : ''}</div>
                </div>
              </div>
              <span className={`status ${item.isActive ? 'status-RESOLVED' : 'status-CLOSED'}`}>{item.isActive ? 'Actif' : 'Inactif'}</span>
            </div>
            <div className="detail-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {item.cells.map((cell) => (
                <div key={cell.id} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--line)', borderRadius: 6, padding: '7px 9px', fontSize: 11 }}>
                  {cell.name}
                  <button className="table-link" onClick={() => void toggleCell(cell)}>{cell.isActive ? 'Désactiver' : 'Activer'}</button>
                </div>
              ))}
              {!item.cells.length && <span className="muted" style={{ fontSize: 11 }}>Aucune cellule associée</span>}
            </div>
          </section>
        ))}
        {!items.length && (
          <div className="panel">
            <Empty title="Aucun service actif" text="Ajoutez un service pour commencer à organiser vos cellules." />
          </div>
        )}
      </div>
    </>
  );
}

