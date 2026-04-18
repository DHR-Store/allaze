// components/StructureTab.jsx
import React, { useState, useEffect, useRef } from 'react';
import { getSwissModelInfo } from '../api/swissmodel';
import { getAminoAcidChange, getBaseContext } from '../utils/translation';
import Protein2DView from './Protein2DView';
import MutationGraph from './MutationGraph';

// FIX: Added 'organism' to the destructured props with a default of 'human'
function StructureTab({ initialGene = '', organism = 'human', mutations = [], refSeq = '', patientSeq = '', settings }) {
  const [gene, setGene] = useState(initialGene);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedPdbUrl, setSelectedPdbUrl] = useState('');
  const [pickedResidue, setPickedResidue] = useState(null);
  const viewerRef = useRef(null);
  const stageRef = useRef(null);

  // Load NGL script dynamically
  useEffect(() => {
    if (window.NGL) return;
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/ngl@2.0.0-dev.37/dist/ngl.js';
    script.async = true;
    document.head.appendChild(script);
  }, []);

  // Fetch structure info when initialGene OR organism changes
  useEffect(() => {
    if (initialGene && initialGene !== 'Unknown') {
      setGene(initialGene);
      fetchStructureInfo(initialGene, organism); // FIX: Pass organism here
    }
  }, [initialGene, organism]); // FIX: Added organism to dependency array

  // FIX: Updated to accept organismName parameter
  const fetchStructureInfo = async (geneName, organismName) => {
    setLoading(true);
    // FIX: Pass the organism down to the API function
    const data = await getSwissModelInfo(geneName, organismName);
    setInfo(data);
    setLoading(false);
  };

  const handleManualFetch = () => {
    // FIX: Pass the current organism state when manually fetching
    if (gene.trim()) fetchStructureInfo(gene.trim(), organism);
  };

  // Auto-select first available structure
  useEffect(() => {
    if (info && !info.error && info.structures?.length > 0 && !selectedPdbUrl) {
      const first = info.structures[0];
      const pdbUrl = `https://swissmodel.expasy.org/repository/uniprot/${info.uniprot_id || info.uniId}.pdb?csm=${first.model_id}`;
      setSelectedPdbUrl(pdbUrl);
    }
  }, [info, selectedPdbUrl]);

  // Initialize NGL stage with picking support
  useEffect(() => {
    if (!selectedPdbUrl || !viewerRef.current || !window.NGL) return;

    const initNGL = async () => {
      if (stageRef.current) stageRef.current.dispose();
      const stage = new window.NGL.Stage(viewerRef.current, { backgroundColor: 'black' });
      stageRef.current = stage;

      // Handle residue picking
      stage.signals.clicked.add((pickingProxy) => {
        if (pickingProxy && pickingProxy.atom) {
          const atom = pickingProxy.atom;
          const residue = atom.resname + ' ' + atom.resno;
          setPickedResidue(residue);
        } else {
          setPickedResidue(null);
        }
      });

      try {
        const comp = await stage.loadFile(selectedPdbUrl, { defaultRepresentation: true });

        // Apply representation from settings
        const repType = settings.representation || 'cartoon';
        const colorScheme = settings.colorScheme || 'chain';
        comp.addRepresentation(repType, { color: colorScheme });

        // Highlight mutations
        if (settings.showMutations && mutations.length > 0 && refSeq && patientSeq) {
          const aaPositions = mutations
            .map(m => {
              // Use the stored aaPos if available; otherwise compute
              if (m.aaPos) return m.aaPos;
              const change = getAminoAcidChange(
                refSeq, patientSeq, m.position,
                m.reference_allele, m.alternate_allele
              );
              return change.aaPos;
            })
            .filter(p => p && !isNaN(p));
          const uniquePositions = [...new Set(aaPositions)];
          if (uniquePositions.length > 0) {
            const selection = uniquePositions.join(' or ');
            comp.addRepresentation('spacefill', { sele: selection, color: 'red', radius: 0.3 });
            if (settings.showLabels) {
              comp.addRepresentation('label', { sele: selection, labelType: 'resid', color: 'yellow', scale: 1.2 });
            }
          }
        }
        comp.autoView();
      } catch (error) {
        console.error('Failed to load structure:', error);
        viewerRef.current.innerHTML = '<p style="color:white; padding:20px;">Error loading 3D structure. The PDB file may be unavailable.</p>';
      }
    };
    initNGL();
  }, [selectedPdbUrl, mutations, refSeq, patientSeq, settings]);

  const handleStructureClick = (structure) => {
    const pdbUrl = `https://swissmodel.expasy.org/repository/uniprot/${info.uniprot_id || info.uniId}.pdb?csm=${structure.model_id}`;
    setSelectedPdbUrl(pdbUrl);
  };

  // Prepare mutation details (using stored AA data if available, otherwise compute)
  const mutationDetails = mutations.map(m => {
    let aaPos = m.aaPos;
    let refAA = m.refAA;
    let altAA = m.patAA || m.altAA;
    let refCodon = m.refCodon;
    let patCodon = m.patCodon;

    // If any AA info missing, recompute
    if (!aaPos || !refAA || !altAA) {
      const change = getAminoAcidChange(
        refSeq, patientSeq, m.position,
        m.reference_allele, m.alternate_allele
      );
      aaPos = change.aaPos;
      refAA = change.refAA;
      altAA = change.patAA;
      refCodon = change.refCodon;
      patCodon = change.patCodon;
    }

    const contextRef = refSeq ? getBaseContext(refSeq, m.position, 5) : '';
    return {
      ...m,
      aaPos,
      refAA,
      altAA,
      refCodon: refCodon || (m.reference_allele?.length === 1 ? 'SNP' : 'INDEL'),
      patCodon: patCodon || (m.alternate_allele?.length === 1 ? 'SNP' : 'INDEL'),
      contextRef,
    };
  });

  // Determine if protein length is valid for 2D view
  const lengthNum = info && !info.error
    ? (typeof info.length === 'number' ? info.length : parseInt(info.length, 10))
    : NaN;
  const show2D = settings.show2D && info && !info.error && !isNaN(lengthNum) && lengthNum > 0;

  return (
    <div>
      <div className="row">
        <div className="col-md-4">
          <h5>Protein Information</h5>
          {loading && <p>Loading...</p>}
          {info && !info.error ? (
            <div>
              <p><strong>{info.protein_name || gene}</strong></p>
              <p>UniProt: {info.uniprot_id || info.uniId}</p>
              <p>Organism: {info.organism || organism}</p>
              <p>Length: {info.length} aa</p>
              {mutations.length > 0 && (
                <div className="alert alert-warning">
                  <strong>Mutations highlighted on structure</strong>
                </div>
              )}
              <h6>Structures ({info.structures?.length || 0})</h6>
              <ul className="list-group" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {info.structures && info.structures.length > 0 ? (
                  info.structures.map((s, idx) => (
                    <li
                      key={s.model_id || s.pdb_id || idx}
                      className="list-group-item"
                      onClick={() => handleStructureClick(s)}
                      style={{ cursor: 'pointer' }}
                    >
                      {s.pdb_id !== 'N/A' ? s.pdb_id : `Model ${s.model_id}`} – {s.method || s.description}
                    </li>
                  ))
                ) : (
                  <li className="list-group-item">No structures available</li>
                )}
              </ul>
            </div>
          ) : (
            <div>
              {info?.error ? (
                <div className="alert alert-danger">
                  {info.error}
                  {initialGene && initialGene !== 'Unknown' && initialGene !== gene && (
                    <button
                      className="btn btn-sm btn-outline-primary ms-2"
                      onClick={() => {
                        setGene(initialGene);
                        fetchStructureInfo(initialGene, organism);
                      }}
                    >
                      Use detected gene: {initialGene}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-muted">Enter a gene symbol to view structures (e.g., Dmd for mouse dystrophin)</p>
              )}
            </div>
          )}
          <div className="input-group mt-2">
            <input
              type="text"
              className="form-control"
              placeholder="Gene (e.g., Dmd)"
              value={gene}
              onChange={e => setGene(e.target.value)}
            />
            <button className="btn btn-outline-primary" onClick={handleManualFetch}>Fetch</button>
          </div>
        </div>
        <div className="col-md-8">
          {/* 2D Viewer */}
          {show2D && (
            <div className="mb-3">
              <Protein2DView
                proteinLength={lengthNum}
                mutations={mutationDetails}
                structures={info.structures}
                uniprotId={info.uniprot_id || info.uniId}
              />
            </div>
          )}
          {/* 3D Viewer with tooltip */}
          {settings.show3D && (
            <div style={{ position: 'relative' }}>
              <div
                ref={viewerRef}
                style={{ width: '100%', height: '500px', border: '1px solid #ccc', background: '#000' }}
              />
              {pickedResidue && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    pointerEvents: 'none'
                  }}
                >
                  {pickedResidue}
                </div>
              )}
              <small className="text-muted">Click on structure to identify residues</small>
            </div>
          )}
        </div>
      </div>

      {/* Mutation Details Table */}
      {settings.showTable && mutationDetails.length > 0 && (
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
                    <td>
                      {typeof m.am_score === 'number'
                        ? m.am_score.toFixed(4)
                        : (m.am_score || 'N/A')}
                    </td>
                    <td>{m.clinvar || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mutation Graph */}
      {settings.showGraph && mutationDetails.length > 0 && (
        <div className="mt-4">
          <MutationGraph mutations={mutationDetails} />
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