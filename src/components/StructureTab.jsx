import React, { useState, useEffect, useRef } from 'react';
import { getSwissModelInfo } from '../api/swissmodel';
import { getAminoAcidChange, getBaseContext } from '../utils/translation';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function StructureTab({ initialGene = '', mutations = [], refSeq = '', patientSeq = '' }) {
  const [gene, setGene] = useState(initialGene);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPdbUrl, setSelectedPdbUrl] = useState('');
  const viewerRef = useRef(null);
  const stageRef = useRef(null);

  // Load NGL script
  useEffect(() => {
    if (window.NGL) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/ngl@2.0.0-dev.37/dist/ngl.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Fetch when initialGene changes
  useEffect(() => {
    if (initialGene && initialGene !== 'Unknown') {
      setGene(initialGene);
      fetchStructureInfo(initialGene);
    }
  }, [initialGene]);

  const fetchStructureInfo = async (geneName) => {
    setLoading(true);
    const data = await getSwissModelInfo(geneName);
    setInfo(data);
    setLoading(false);
  };

  const handleManualFetch = () => {
    if (gene.trim()) fetchStructureInfo(gene.trim());
  };

  // Auto‑select first structure when info loads
  useEffect(() => {
    if (info && !info.error && info.structures?.length > 0 && !selectedPdbUrl) {
      const first = info.structures[0];
      const pdbUrl = `https://swissmodel.expasy.org/repository/uniprot/${info.uniprot_id}.pdb?csm=${first.model_id}`;
      setSelectedPdbUrl(pdbUrl);
    }
  }, [info, selectedPdbUrl]);

  // Initialize NGL when PDB URL changes
  useEffect(() => {
    if (!selectedPdbUrl || !viewerRef.current || !window.NGL) return;

    const initNGL = async () => {
      if (stageRef.current) stageRef.current.dispose();
      const stage = new window.NGL.Stage(viewerRef.current, { backgroundColor: 'black' });
      stageRef.current = stage;
      try {
        const comp = await stage.loadFile(selectedPdbUrl, { defaultRepresentation: true });
        comp.addRepresentation('cartoon', { color: 'white' });

        // Highlight mutations (amino acid positions)
        if (mutations.length > 0 && refSeq && patientSeq) {
          const aaPositions = mutations
            .map(m => getAminoAcidChange(refSeq, patientSeq, m.position).aaPos)
            .filter(p => p && !isNaN(p));
          const uniquePositions = [...new Set(aaPositions)];
          if (uniquePositions.length > 0) {
            const selection = uniquePositions.join(' or ');
            comp.addRepresentation('spacefill', { sele: selection, color: 'red', radius: 0.3 });
            comp.addRepresentation('label', { sele: selection, labelType: 'resid', color: 'yellow', scale: 1.2 });
          }
        }
        comp.autoView();
      } catch (error) {
        console.error('Failed to load structure:', error);
        viewerRef.current.innerHTML = '<p style="color:white; padding:20px;">Error loading 3D structure. The PDB file may be unavailable.</p>';
      }
    };
    initNGL();
  }, [selectedPdbUrl, mutations, refSeq, patientSeq]);

  const handleStructureClick = (structure) => {
    const pdbUrl = `https://swissmodel.expasy.org/repository/uniprot/${info.uniprot_id}.pdb?csm=${structure.model_id}`;
    setSelectedPdbUrl(pdbUrl);
  };

  // Prepare mutation details with AA change and base context
  const mutationDetails = mutations.map(m => {
    const aaChange = (refSeq && patientSeq) ? getAminoAcidChange(refSeq, patientSeq, m.position) : null;
    const contextRef = refSeq ? getBaseContext(refSeq, m.position, 5) : '';
    const contextPat = patientSeq ? getBaseContext(patientSeq, m.position, 5) : '';
    return {
      ...m,
      aaPos: aaChange?.aaPos || '?',
      refAA: aaChange?.refAA || '?',
      altAA: aaChange?.patAA || '?',
      refCodon: aaChange?.refCodon || '?',
      patCodon: aaChange?.patCodon || '?',
      contextRef,
      contextPat
    };
  });

  // Chart data
  const chartData = {
    labels: mutationDetails.map(m => `${m.gene} ${m.aaPos !== '?' ? m.aaPos : m.position}`),
    datasets: [{
      label: 'AlphaMissense Score',
      data: mutationDetails.map(m => typeof m.am_score === 'number' ? m.am_score : 0),
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Mutation Pathogenicity Scores' }
    },
    scales: {
      y: { beginAtZero: true, max: 1.0, title: { display: true, text: 'Score' } }
    }
  };

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <h5>Protein Information</h5>
          {loading && <p>Loading...</p>}
          {info && !info.error ? (
            <div>
              <p><strong>{info.protein_name}</strong></p>
              <p>UniProt: {info.uniprot_id}</p>
              <p>Organism: {info.organism}</p>
              <p>Length: {info.length} aa</p>
              {mutations.length > 0 && (
                <div className="alert alert-warning">
                  <strong>Mutations highlighted on structure</strong>
                </div>
              )}
              <h6>Structures ({info.structures?.length || 0})</h6>
              <ul className="list-group" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {info.structures.length > 0 ? (
                  info.structures.map(s => (
                    <li
                      key={s.model_id || s.pdb_id}
                      className="list-group-item"
                      onClick={() => handleStructureClick(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      {s.pdb_id || s.model_id} – {s.description}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">No structures available</li>
                )}
              </ul>
            </div>
          ) : (
            <div>
              <p className="text-danger">{info?.error || 'Enter a gene symbol to view structures'}</p>
            </div>
          )}
          <div className="input-group mt-2">
            <input
              type="text"
              className="form-control"
              placeholder="Gene (e.g., BRCA1)"
              value={gene}
              onChange={e => setGene(e.target.value)}
            />
            <button className="btn btn-outline-primary" onClick={handleManualFetch}>Fetch</button>
          </div>
        </div>
        <div className="col-md-8">
          <div
            ref={viewerRef}
            style={{ width: '100%', height: '500px', border: '1px solid #ccc', background: '#000' }}
          />
        </div>
      </div>

      {/* Mutation Details Table */}
      {mutationDetails.length > 0 && (
        <div className="mt-4">
          <h5>🧬 Mutation Details</h5>
          <div style={{ overflowX: 'auto' }}>
            <table className="table table-sm table-bordered">
              <thead>
                <tr>
                  <th>Nt Pos</th>
                  <th>Ref &gt; Alt</th>
                  <th>AA Pos</th>
                  <th>AA Change</th>
                  <th>Codon Change</th>
                  <th>Context (Ref)</th>
                  <th>AM Score</th>
                  <th>ClinVar</th>
                </tr>
              </thead>
              <tbody>
                {mutationDetails.map((m, i) => (
                  <tr key={i}>
                    <td>{m.position}</td>
                    <td>{m.reference_allele} &gt; {m.alternate_allele}</td>
                    <td>{m.aaPos}</td>
                    <td>{m.refAA} &gt; {m.altAA}</td>
                    <td><code>{m.refCodon} &gt; {m.patCodon}</code></td>
                    <td><code>{m.contextRef}</code></td>
                    <td>{m.am_score?.toFixed(4) || 'N/A'}</td>
                    <td>{m.clinvar || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mutation Graph */}
      {mutationDetails.length > 0 && (
        <div className="mt-4" style={{ height: '300px' }}>
          <Bar data={chartData} options={chartOptions} />
        </div>
      )}

      {/* No mutations message */}
      {mutations.length === 0 && initialGene && (
        <div className="alert alert-info mt-3">
          No mutations detected. Run an analysis to see variant details.
        </div>
      )}
    </div>
  );
}

export default StructureTab;