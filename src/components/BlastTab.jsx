import React, { useState } from 'react';
import { runBlast } from '../api/blast';

function BlastTab() {
  const [sequence, setSequence] = useState('');
  const [hits, setHits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');

  const handleBlast = async () => {
    setLoading(true);
    setLog('Submitting BLAST job...');
    try {
      const result = await runBlast(sequence);
      setHits(result);
      setLog(`Found ${result.length} hits.`);
    } catch (err) {
      setLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <textarea
        className="form-control mb-2"
        rows="6"
        placeholder="Paste DNA sequence (FASTA or raw)"
        value={sequence}
        onChange={e => setSequence(e.target.value)}
      />
      <button className="btn btn-primary mb-3" onClick={handleBlast} disabled={loading || !sequence}>
        {loading ? 'Running BLAST...' : '🔍 Run BLAST'}
      </button>
      <div className="alert alert-info">{log || 'Paste a sequence and click Run BLAST.'}</div>
      {hits.length > 0 && (
        <table className="table table-bordered">
          <thead>
            <tr><th>Accession</th><th>Description</th><th>Identity</th><th>E-value</th></tr>
          </thead>
          <tbody>
            {hits.map((h, i) => (
              <tr key={i}><td>{h.accession}</td><td>{h.description}</td><td>{h.identity}</td><td>{h.evalue}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default BlastTab;