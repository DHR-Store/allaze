// components/BlastTab.jsx
import React, { useState, useEffect } from 'react';
import { runBlast } from '../api/blast';

/**
 * BLAST Search tab.
 *
 * Props
 * ─────
 * initialSequence  {string}  Pre-filled sequence from the analysis pipeline
 * initialResults   {Array}   Pre-filled hits from the pipeline run (optional)
 * initialGene      {string}  Gene hint for mock DB lookup
 */
function BlastTab({ initialSequence = '', initialResults = [], initialGene = '' }) {
  const [sequence, setSequence]   = useState('');
  const [hits, setHits]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [log, setLog]             = useState('');
  const [source, setSource]       = useState(''); // 'pipeline' | 'manual'

  // Populate from pipeline when props arrive
  useEffect(() => {
    if (initialResults.length > 0) {
      setHits(initialResults);
      setSource('pipeline');
      setLog(`Showing ${initialResults.length} hits from pipeline run.`);
    }
    if (initialSequence) {
      setSequence(initialSequence);
    }
  }, [initialResults, initialSequence]);

  const handleBlast = async () => {
    if (!sequence.trim()) return;
    setLoading(true);
    setSource('manual');
    setLog('Submitting BLAST job…');
    setHits([]);
    try {
      // Strip FASTA header if present; keep raw bases
      const raw = sequence.trim().startsWith('>')
        ? sequence.trim().split('\n').slice(1).join('').replace(/\s/g, '')
        : sequence.trim().replace(/\s/g, '');
      const result = await runBlast(raw, initialGene || null);
      setHits(result);
      setLog(`Found ${result.length} hits.`);
    } catch (err) {
      setLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (identity) => {
    const pct = parseFloat(identity);
    if (pct >= 99)  return 'table-danger';
    if (pct >= 90)  return 'table-warning';
    if (pct >= 70)  return 'table-info';
    return '';
  };

  return (
    <div>
      {/* Sequence input */}
      <div className="mb-2">
        <label className="form-label fw-bold">Query Sequence (FASTA or raw DNA)</label>
        <textarea
          className="form-control font-monospace"
          rows={6}
          placeholder={'>MySeq\nATCGATCGATCG…'}
          value={sequence}
          onChange={e => setSequence(e.target.value)}
        />
        <small className="text-muted">
          {sequence.replace(/^>.*\n/, '').replace(/\s/g, '').length} bp entered
        </small>
      </div>

      <div className="d-flex align-items-center gap-2 mb-3">
        <button
          className="btn btn-primary"
          onClick={handleBlast}
          disabled={loading || !sequence.trim()}
        >
          {loading
            ? <><span className="spinner-border spinner-border-sm me-2" />Running BLAST…</>
            : '🔍 Run BLAST'}
        </button>
        {hits.length > 0 && (
          <button
            className="btn btn-outline-secondary btn-sm"
            onClick={() => { setHits([]); setLog(''); setSource(''); }}
          >
            Clear Results
          </button>
        )}
      </div>

      {/* Status */}
      {log && (
        <div className={`alert ${log.startsWith('Error') ? 'alert-danger' : 'alert-info'}`}>
          {source === 'pipeline' && <strong>⚡ Pipeline: </strong>}
          {log}
        </div>
      )}
      {!log && !loading && (
        <div className="alert alert-secondary">
          Paste a sequence and click <strong>Run BLAST</strong>, or run the Analysis pipeline to populate results automatically.
        </div>
      )}

      {/* Results table */}
      {hits.length > 0 && (
        <div className="table-responsive">
          <table className="table table-bordered table-sm table-hover align-middle">
            <thead className="table-dark">
              <tr>
                <th>#</th>
                <th>Accession</th>
                <th>Description</th>
                <th>Organism</th>
                <th>Identity</th>
                <th>E-value</th>
                <th>Score</th>
                <th>Length</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((h, i) => (
                <tr key={i} className={scoreColor(h.identity)}>
                  <td className="text-muted">{i + 1}</td>
                  <td><code>{h.accession}</code></td>
                  <td style={{ maxWidth: '320px' }}>{h.description}</td>
                  <td><em>{h.organism || '—'}</em></td>
                  <td>
                    <span className="fw-bold">{h.identity}</span>
                    <div
                      className="progress mt-1"
                      style={{ height: '4px' }}
                      title={h.identity}
                    >
                      <div
                        className="progress-bar bg-success"
                        style={{ width: h.identity }}
                      />
                    </div>
                  </td>
                  <td><code>{h.evalue}</code></td>
                  <td>{h.score}</td>
                  <td>{h.length?.toLocaleString?.() ?? h.length}</td>
                  <td>
                    <a
                      href={`https://www.ncbi.nlm.nih.gov/nuccore/${h.accession}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-outline-primary btn-sm"
                    >
                      NCBI ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Identity legend */}
          <div className="d-flex gap-3 mt-1 mb-3">
            <small className="text-muted">Identity legend:</small>
            <small><span className="badge bg-danger">≥ 99%</span></small>
            <small><span className="badge bg-warning text-dark">≥ 90%</span></small>
            <small><span className="badge bg-info text-dark">≥ 70%</span></small>
            <small><span className="badge bg-secondary">&lt; 70%</span></small>
          </div>
        </div>
      )}
    </div>
  );
}

export default BlastTab;