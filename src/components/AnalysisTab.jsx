// components/AnalysisTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { parseFasta, extractGeneAndOrganism, detectSequenceType } from '../utils/fastaParser';
import { analyzeMutations } from '../api/alphamissense';
import { getUniProtInfo, getCanonicalProtein } from '../api/uniprot';
import { getAminoAcidChange, extractProtein, compareProteins } from '../utils/translation';
import { runBlast } from '../api/blast';

const STORAGE_KEY = 'allaze_analysis_state';
const MAX_NT_VARIANTS = 50;   // cap nucleotide-mode variants sent to APIs

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Try to pull a gene symbol out of the top BLAST hit description. */
function geneFromBlastHit(hit) {
  if (!hit?.description) return null;
  const m = hit.description.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
  return m ? m[1] : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AnalysisTab({ onAnalysisComplete }) {
  // ── Persist / restore ───────────────────────────────────────────────────
  const loadSaved = () => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  };
  const saved = loadSaved();

  const [refSeq,        setRefSeq]        = useState(saved?.refSeq        || '');
  const [patientSeq,    setPatientSeq]    = useState(saved?.patientSeq    || '');
  const [refHeader,     setRefHeader]     = useState(saved?.refHeader      || '');
  const [patientHeader, setPatientHeader] = useState(saved?.patientHeader  || '');
  const [results,       setResults]       = useState(saved?.results        || []);
  const [blastHits,     setBlastHits]     = useState(saved?.blastHits      || []);
  const [loading,       setLoading]       = useState(false);
  const [log,           setLog]           = useState(saved?.log            || 'Upload two FASTA files to begin.');
  const [geneInfo,      setGeneInfo]      = useState(saved?.geneInfo       || { gene: 'Unknown', organism: 'Unknown' });
  const [mode,          setMode]          = useState(saved?.mode           || '');   // 'nucleotide' | 'protein'
  const [geneOverride,  setGeneOverride]  = useState('');

  // ── Persist & notify parent ──────────────────────────────────────────────
  useEffect(() => {
    const state = { refSeq, patientSeq, refHeader, patientHeader, results, blastHits, log, geneInfo, mode };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if ((results.length > 0 || blastHits.length > 0) && onAnalysisComplete) {
      onAnalysisComplete(geneInfo.gene, results, refSeq, patientSeq, blastHits);
    }
  }, [refSeq, patientSeq, refHeader, patientHeader, results, blastHits, log, geneInfo, mode, onAnalysisComplete]);

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileUpload = (file, isRef) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const { fullHeader, sequences } = parseFasta(content);
      const seq = sequences[0] || '';

      if (isRef) {
        setRefHeader(fullHeader);
        setRefSeq(seq);
        if (fullHeader) {
          const info = extractGeneAndOrganism(fullHeader);
          setGeneInfo(info);
        }
      } else {
        setPatientHeader(fullHeader);
        setPatientSeq(seq);
        // Try to detect gene from patient header too (e.g., "patient_tp53_mutant")
        if (fullHeader) {
          const patInfo = extractGeneAndOrganism(fullHeader);
          if (patInfo.gene !== 'Unknown') {
            setGeneInfo(prev =>
              prev.gene === 'Unknown' ? { ...prev, gene: patInfo.gene } : prev
            );
          }
        }
      }

      setResults([]);
      setBlastHits([]);
      setMode('');
      setLog('Files loaded. Click "Run Pipeline" to analyse.');
    };
    reader.readAsText(file);
  };

  // ── Detect comparison mode ───────────────────────────────────────────────
  const detectMode = useCallback((ref, pat) => {
    if (!ref || !pat) return 'nucleotide';
    const ratio = ref.length / pat.length;
    // Genomic vs CDS: reference >> patient (or very large reference)
    if (ratio > 3 || ratio < 0.33) return 'protein';
    return 'nucleotide';
  }, []);

  const detectedMode = refSeq && patientSeq ? detectMode(refSeq, patientSeq) : '';

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true);
    setResults([]);
    setBlastHits([]);

    let { gene, organism } = geneInfo;

    // Apply manual override if entered
    if (geneOverride.trim()) {
      gene = geneOverride.trim().toUpperCase();
      setGeneInfo(g => ({ ...g, gene }));
    }

    const compMode = detectMode(refSeq, patientSeq);
    setMode(compMode);

    try {
      let variants = [];

      // ════════════════════════════════════════════════════════════════════
      // PROTEIN MODE  — reference is genomic or sequences are incompatible
      // ════════════════════════════════════════════════════════════════════
      if (compMode === 'protein') {
        setLog('⚗️ Detected genomic reference vs CDS patient. Switching to protein comparison mode…');

        // Step 1 – Translate patient CDS
        const patientProtein = extractProtein(patientSeq);
        if (!patientProtein) {
          setLog('❌ Error: No start codon (ATG) found in patient sequence.');
          setLoading(false);
          return;
        }

        // Step 2 – Identify gene (BLAST if still unknown)
        if (gene === 'Unknown') {
          setLog('🔍 Gene unknown – running BLAST to identify…');
          try {
            const querySeq = patientSeq.substring(0, 500).replace(/\s/g, '');
            const hits = await runBlast(querySeq, null);
            setBlastHits(hits);
            const detectedGene = geneFromBlastHit(hits[0]);
            if (detectedGene) {
              gene = detectedGene;
              setGeneInfo(g => ({ ...g, gene }));
              setLog(`✅ Gene identified from BLAST: ${gene}. Fetching reference protein…`);
            } else {
              setLog('⚠️ BLAST could not identify gene. Please enter gene symbol manually and re-run.');
              setLoading(false);
              return;
            }
          } catch (blastErr) {
            setLog(`⚠️ BLAST failed: ${blastErr.message}. Please enter gene symbol and re-run.`);
            setLoading(false);
            return;
          }
        } else {
          setLog(`🧬 Fetching canonical ${gene} protein from UniProt…`);
        }

        // Step 3 – Fetch canonical reference protein from UniProt
        const isMouseOrganism = organism.toLowerCase().includes('mus') || organism.toLowerCase().includes('mouse');
        const refProtein = await getCanonicalProtein(gene, isMouseOrganism ? 'mouse' : 'human');

        if (!refProtein) {
          setLog(`❌ Could not fetch canonical ${gene} protein from UniProt. Check gene symbol.`);
          setLoading(false);
          return;
        }

        setLog(`📊 Reference protein: ${refProtein.length} aa · Patient protein: ${patientProtein.length} aa. Comparing…`);

        // Step 4 – Compare proteins
        const aaVariants = compareProteins(refProtein, patientProtein);

        if (aaVariants.length === 0) {
          setLog('✅ No amino acid differences found between patient and canonical protein.');
          setLoading(false);
          return;
        }

        // Build variant objects (protein-mode shape)
        variants = aaVariants.map(v => ({
          position:         v.aaPos,           // use aaPos as position for display
          reference_allele: v.refAA,
          alternate_allele: v.patAA,
          gene,
          organism:         organism !== 'Unknown' ? organism : 'Homo sapiens',
          aaPos:            v.aaPos,
          refAA:            v.refAA,
          patAA:            v.patAA,
          refCodon:         'Protein',
          patCodon:         'Protein',
          isTruncation:     v.isTruncation || false,
          note:             v.note || '',
          mode:             'protein',
        }));

        setLog(`Found ${variants.length} amino acid variant(s). Querying pathogenicity APIs (parallel)…`);

      // ════════════════════════════════════════════════════════════════════
      // NUCLEOTIDE MODE  — sequences are compatible lengths
      // ════════════════════════════════════════════════════════════════════
      } else {
        setLog('Starting nucleotide-level analysis…');
        const rawVariants = [];
        const minLen = Math.min(refSeq.length, patientSeq.length);

        for (let i = 0; i < minLen; i++) {
          if (refSeq[i] !== patientSeq[i]) {
            const refAllele = refSeq[i];
            const altAllele = patientSeq[i];
            const aaChange  = getAminoAcidChange(refSeq, patientSeq, i + 1, refAllele, altAllele);
            rawVariants.push({
              position:         i + 1,
              reference_allele: refAllele,
              alternate_allele: altAllele,
              gene,
              organism,
              aaPos:    aaChange.aaPos,
              refAA:    aaChange.refAA,
              patAA:    aaChange.patAA,
              refCodon: aaChange.refCodon,
              patCodon: aaChange.patCodon,
              mode:     'nucleotide',
            });
          }
        }

        setLog(`Found ${rawVariants.length} nucleotide variant(s)${
          rawVariants.length > MAX_NT_VARIANTS ? ` (showing top ${MAX_NT_VARIANTS})` : ''
        }. Querying APIs in parallel…`);

        variants = rawVariants; // analyzeMutations will cap internally
      }

      // ── Step 5: AlphaMissense (parallel) ─────────────────────────────
      const enriched = await analyzeMutations(variants, MAX_NT_VARIANTS);

      // ── Step 6: UniProt disease info (parallel) ───────────────────────
      await Promise.all(
        enriched.map(async (v) => {
          if (
            v.organism.toLowerCase().includes('homo') ||
            v.organism.toLowerCase().includes('mus')
          ) {
            v.disease = await getUniProtInfo(v.gene);
          } else {
            v.disease = 'N/A';
          }
        })
      );

      setResults(enriched);

      // ── Step 7: BLAST (if not already run) ───────────────────────────
      if (blastHits.length === 0) {
        setLog(`✅ Analysis complete (${enriched.length} variant(s)). Running BLAST…`);
        try {
          const querySeq = (compMode === 'protein' ? patientSeq : refSeq)
            .replace(/\s/g, '')
            .substring(0, 2000);
          const hits = await runBlast(querySeq, gene !== 'Unknown' ? gene : null);
          setBlastHits(hits);
          setLog(`✅ Pipeline complete — ${enriched.length} variant(s) · ${hits.length} BLAST hit(s).`);
        } catch (blastErr) {
          setLog(`✅ Analysis complete (${enriched.length} variant(s)). BLAST unavailable.`);
        }
      } else {
        setLog(`✅ Pipeline complete — ${enriched.length} variant(s) · ${blastHits.length} BLAST hit(s).`);
      }

    } catch (err) {
      setLog(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRefSeq(''); setPatientSeq('');
    setRefHeader(''); setPatientHeader('');
    setResults([]); setBlastHits([]);
    setMode('');
    setLog('Upload two FASTA files to begin.');
    setGeneInfo({ gene: 'Unknown', organism: 'Unknown' });
    setGeneOverride('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* File upload row */}
      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label fw-bold">Reference FASTA</label>
          <input
            type="file"
            accept=".fasta,.fa,.txt,.seq"
            className="form-control"
            onChange={e => handleFileUpload(e.target.files[0], true)}
          />
          {refHeader && (
            <small className="text-success d-block mt-1">
              📌 Detected: <strong>{geneInfo.gene}</strong> ({geneInfo.organism})
              {refSeq && (
                <span className="ms-2 badge bg-secondary">
                  {detectSequenceType(refHeader, refSeq.length)} · {refSeq.length.toLocaleString()} bp
                </span>
              )}
            </small>
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label fw-bold">Patient FASTA</label>
          <input
            type="file"
            accept=".fasta,.fa,.txt,.seq"
            className="form-control"
            onChange={e => handleFileUpload(e.target.files[0], false)}
          />
          {patientHeader && (
            <small className="text-success d-block mt-1">
              Loaded: {patientHeader.replace(/^>/, '').substring(0, 60)}
              {patientSeq && (
                <span className="ms-2 badge bg-secondary">
                  {detectSequenceType(patientHeader, patientSeq.length)} · {patientSeq.length.toLocaleString()} bp
                </span>
              )}
            </small>
          )}
        </div>
      </div>

      {/* Mode badge */}
      {refSeq && patientSeq && (
        <div className="mb-2">
          {detectedMode === 'protein' ? (
            <div className="alert alert-warning py-2 mb-2">
              <strong>⚗️ Protein Comparison Mode</strong> — Reference is genomic (
              {refSeq.length.toLocaleString()} bp) and patient appears to be CDS (
              {patientSeq.length.toLocaleString()} bp). The pipeline will translate the patient sequence
              and compare against the canonical reference protein from UniProt.
            </div>
          ) : (
            <div className="alert alert-success py-2 mb-2">
              <strong>🧬 Nucleotide Comparison Mode</strong> — Sequences are compatible lengths (
              {refSeq.length.toLocaleString()} bp vs {patientSeq.length.toLocaleString()} bp).
              Direct nucleotide comparison (top {MAX_NT_VARIANTS} variants).
            </div>
          )}
        </div>
      )}

      {/* Gene override when gene unknown */}
      {refSeq && geneInfo.gene === 'Unknown' && (
        <div className="alert alert-warning d-flex align-items-center gap-2 py-2 mb-2">
          <span>⚠️ Gene not auto-detected.</span>
          <input
            type="text"
            className="form-control form-control-sm"
            style={{ maxWidth: 160 }}
            placeholder="Enter gene (e.g. TP53)"
            value={geneOverride}
            onChange={e => setGeneOverride(e.target.value)}
          />
          <small className="text-muted">Required for protein mode</small>
        </div>
      )}

      {/* Action buttons */}
      <div className="mb-3 d-flex gap-2 flex-wrap">
        <button
          className="btn btn-primary"
          onClick={runAnalysis}
          disabled={loading || !refSeq || !patientSeq}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" />
              Running…
            </>
          ) : '▶ Run Pipeline'}
        </button>
        <button className="btn btn-outline-secondary" onClick={clearAll} disabled={loading}>
          🗑 Clear All
        </button>
      </div>

      {/* Log */}
      <div className={`alert ${log.startsWith('❌') ? 'alert-danger' : log.startsWith('⚠️') ? 'alert-warning' : 'alert-info'}`}>
        {loading && <span className="spinner-border spinner-border-sm me-2" />}
        {log}
      </div>

      {/* Variant results */}
      {results.length > 0 && (
        <>
          <h5 className="mt-3">
            🧬 Variant Analysis Results
            {mode === 'protein' && (
              <span className="badge bg-info text-dark ms-2 fs-6">Protein Mode</span>
            )}
          </h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>{mode === 'protein' ? 'AA Pos' : 'Nt Pos'}</th>
                  <th>Ref AA</th>
                  <th>Alt AA</th>
                  <th>Gene</th>
                  <th>Organism</th>
                  <th>AM Score</th>
                  <th>Classification</th>
                  <th>ClinVar</th>
                  <th>Disease</th>
                </tr>
              </thead>
              <tbody>
                {results.map((v, i) => (
                  <tr
                    key={i}
                    className={
                      v.classification?.includes('Pathogenic') ? 'table-danger'  :
                      v.classification?.includes('Benign')     ? 'table-success' : ''
                    }
                  >
                    <td>{v.aaPos ?? v.position ?? '—'}</td>
                    <td><strong>{v.reference_allele}</strong></td>
                    <td><strong>{v.alternate_allele}</strong></td>
                    <td>{v.gene}</td>
                    <td><em>{v.organism}</em></td>
                    <td>
                      {typeof v.am_score === 'number'
                        ? v.am_score.toFixed(4)
                        : v.am_score}
                    </td>
                    <td>
                      <span className={`badge ${
                        v.classification?.includes('Pathogenic') ? 'bg-danger'   :
                        v.classification?.includes('Benign')     ? 'bg-success'  :
                        v.classification?.includes('Error')      ? 'bg-secondary':
                                                                   'bg-warning text-dark'
                      }`}>
                        {v.classification}
                      </span>
                    </td>
                    <td>{v.clinvar}</td>
                    <td>{v.disease}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* BLAST summary */}
      {blastHits.length > 0 && (
        <>
          <h5 className="mt-4">🔍 BLAST Results (top {blastHits.length} — see BLAST tab for full view)</h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm table-hover">
              <thead className="table-dark">
                <tr>
                  <th>#</th><th>Accession</th><th>Description</th>
                  <th>Organism</th><th>Identity</th><th>E-value</th>
                </tr>
              </thead>
              <tbody>
                {blastHits.map((h, i) => (
                  <tr key={i}>
                    <td>{i + 1}</td>
                    <td>
                      <a href={`https://www.ncbi.nlm.nih.gov/nuccore/${h.accession}`}
                         target="_blank" rel="noreferrer">
                        <code>{h.accession}</code>
                      </a>
                    </td>
                    <td>{h.description}</td>
                    <td><em>{h.organism || '—'}</em></td>
                    <td>{h.identity}</td>
                    <td><code>{h.evalue}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AnalysisTab;