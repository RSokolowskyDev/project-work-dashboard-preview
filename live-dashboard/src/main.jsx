import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const url = 'https://qyeelndmdqptybsghmjm.supabase.co';
const key = 'sb_publishable_Wh0weQys-eyO5-Tk8h1lUA_f6rFB34f';
const library = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/+esm';

function App() {
  const [client, setClient] = useState(null);
  const [email, setEmail] = useState('');
  const [records, setRecords] = useState([]);
  const [state, setState] = useState('Loading your work…');
  const [search, setSearch] = useState('');
  const [project, setProject] = useState('All projects');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let subscription;
    async function load() {
      try {
        const { createClient } = await import(/* @vite-ignore */ library);
        const db = createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
        const { data: sessionData, error: sessionError } = await db.auth.getSession();
        if (sessionError) throw sessionError;
        if (!sessionData.session) { window.location.replace('/backend-test.html'); return; }
        const { data: assurance, error: assuranceError } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
        if (assuranceError) throw assuranceError;
        if (assurance.currentLevel !== 'aal2') { window.location.replace('/backend-test.html'); return; }
        const all = [];
        for (let from = 0; ; from += 1000) {
          const { data, error } = await db.from('project_records').select('record_id,project_id,project_name,summary,full_record,assigned_to,status,record_type,source,due_date,record_date,event_date,entered_by').order('record_date', { ascending: false }).order('record_id', { ascending: true }).range(from, from + 999);
          if (error) throw error;
          all.push(...data);
          if (data.length < 1000) break;
        }
        if (cancelled) return;
        setClient(db); setEmail(sessionData.session.user.email || ''); setRecords(all); setState('');
        subscription = db.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') window.location.replace('/backend-test.html'); }).data.subscription;
      } catch (error) { if (!cancelled) setState('Unable to load your work: ' + (error.message || 'Please try again.')); }
    }
    load();
    return () => { cancelled = true; subscription?.unsubscribe(); };
  }, []);

  const projects = useMemo(() => [...new Set(records.map(r => r.project_name || r.project_id || 'Unspecified project'))].sort(), [records]);
  const shown = useMemo(() => records.filter(r => (project === 'All projects' || (r.project_name || r.project_id || 'Unspecified project') === project) && [r.project_name, r.project_id, r.summary, r.status, r.source, r.record_type].some(v => (v || '').toLowerCase().includes(search.toLowerCase()))), [records, project, search]);
  const signOut = async () => { if (client) await client.auth.signOut(); window.location.replace('/backend-test.html'); };
  return <div className="workspace"><header className="topbar"><div className="brand"><div className="brand-mark">I<span>S</span></div><div><strong>interior solutions</strong><small>YOUR PROJECT WORKSPACE</small></div></div><div className="profile"><div><strong>{email || 'My work'}</strong><small>Project dashboard</small></div>{client && <button onClick={signOut}>Sign out</button>}</div></header>
    <main className="page"><div className="page-heading"><div><div className="eyebrow">YOUR PROJECT WORKSPACE</div><h1>My work</h1><p>Project records assigned to you.</p></div></div>
      <section className="overview" aria-label="Work overview"><div className="overview-intro"><span className="eyebrow">AT A GLANCE</span><h2>Make the next<br/> step clear.</h2><p>Review your assigned project records.</p></div><div className="overview-count"><span>Assigned records</span><strong>{records.length}</strong><small>Across {projects.length} projects</small></div></section>
      <section className="work-panel"><div className="work-header"><div><h2>My project records <span className="count">{shown.length}</span></h2><span className="inline-preview">Read-only view · Updated when the page loads</span></div><div className="header-actions"><label className="search"><span className="sr-only">Search records</span><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your work"/></label></div></div>
      <div className="filter-bar"><label>Project <select value={project} onChange={e => setProject(e.target.value)}><option>All projects</option>{projects.map(p => <option key={p}>{p}</option>)}</select></label></div>
      {state ? <p className="load-state" role="status">{state}</p> : <div className="grid-scroll"><table className="work-table"><thead><tr><th>Summary</th><th>Project</th><th>Status</th><th>Due</th><th>Source</th></tr></thead><tbody>{shown.map((r, i) => <tr className="task-row" key={(r.record_id || '') + ':' + i}><td><button className="task-link" onClick={() => setSelected(r)}>{r.summary || r.record_type || 'Project record'}</button></td><td>{r.project_name || r.project_id || '—'}</td><td>{r.status || '—'}</td><td>{r.due_date ? new Date(r.due_date).toLocaleDateString() : '—'}</td><td>{r.source || '—'}</td></tr>)}</tbody></table>{!shown.length && <div className="empty"><strong>No assigned records in this view</strong><span>New records appear here when they are assigned to your company email.</span></div>}</div>}</section>
    </main>{selected && <div className="detail-backdrop" onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}><aside className="detail-panel" role="dialog" aria-modal="true" aria-label="Record details"><div className="detail-top"><span>{selected.project_name || selected.project_id}</span><button autoFocus className="icon-button detail-close" aria-label="Close details" onClick={() => setSelected(null)}>×</button></div><h2>{selected.summary || selected.record_type || 'Project record'}</h2><p className="record-detail">{selected.full_record || 'No additional details recorded.'}</p><div className="detail-section"><h3>Record details</h3><p>Status: {selected.status || '—'}</p><p>Source: {selected.source || '—'}</p><p>Assigned to: {selected.assigned_to || '—'}</p></div></aside></div>}</div>;
}

createRoot(document.getElementById('root')).render(<App/>);
