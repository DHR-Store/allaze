// components/AnalysisTab.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { parseFasta, extractGeneAndOrganism, detectSequenceType } from '../utils/fastaParser';
import { analyzeMutations } from '../api/alphamissense';
import { getUniProtInfo, getCanonicalProtein } from '../api/uniprot';
import { getAminoAcidChange, extractProtein, compareProteins, findBestORF } from '../utils/translation';
import { runBlast } from '../api/blast';

const STORAGE_KEY = 'allaze_analysis_state';
const MAX_NT_VARIANTS = 50;

// ── Helpers ───────────────────────────────────────────────────────────────────

function geneFromBlastHit(hit) {
  if (!hit?.description) return null;
  const m = hit.description.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
  return m ? m[1] : null;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AnalysisTab({ onAnalysisComplete }) {
  // ── Persist / restore ────────────────────────────────────────────────────
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
  const [refSeqType,    setRefSeqType]    = useState(saved?.refSeqType     || '');
  const [patSeqType,    setPatSeqType]    = useState(saved?.patSeqType     || '');
  const [results,       setResults]       = useState(saved?.results        || []);
  const [blastHits,     setBlastHits]     = useState(saved?.blastHits      || []);
  const [loading,       setLoading]       = useState(false);
  const [log,           setLog]           = useState(saved?.log            || 'Upload two FASTA files to begin.');
  const [geneInfo,      setGeneInfo]      = useState(saved?.geneInfo       || { gene: 'Unknown', organism: 'Unknown' });
  const [mode,          setMode]          = useState(saved?.mode           || '');
  const [geneOverride,  setGeneOverride]  = useState('');

  // ── Persist & notify parent ──────────────────────────────────────────────
  useEffect(() => {
    const state = {
      refSeq, patientSeq, refHeader, patientHeader,
      refSeqType, patSeqType,
      results, blastHits, log, geneInfo, mode,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if ((results.length > 0 || blastHits.length > 0) && onAnalysisComplete) {
      onAnalysisComplete(geneInfo.gene, results, refSeq, patientSeq, blastHits);
    }
  }, [refSeq, patientSeq, refHeader, patientHeader, refSeqType, patSeqType,
      results, blastHits, log, geneInfo, mode, onAnalysisComplete]);

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFileUpload = (file, isRef) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const { fullHeader, sequences } = parseFasta(content);
      const seq = sequences[0] || '';
      const seqType = detectSequenceType(fullHeader, seq.length);

      if (isRef) {
        setRefHeader(fullHeader);
        setRefSeq(seq);
        setRefSeqType(seqType);
        if (fullHeader) {
          const info = extractGeneAndOrganism(fullHeader);
          setGeneInfo(info);
        }
      } else {
        setPatientHeader(fullHeader);
        setPatientSeq(seq);
        setPatSeqType(seqType);
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
  const detectMode = useCallback((ref, pat, rType, pType) => {
    if (!ref || !pat) return 'nucleotide';
    if (rType === 'cds' && pType === 'cds') return 'nucleotide';
    if (rType === 'genomic' && pType === 'cds') return 'protein';
    if (rType === 'cds' && pType === 'genomic') return 'protein';
    if (rType === 'genomic' && pType === 'genomic') return 'nucleotide';
    const ratio = ref.length / pat.length;
    if (ratio > 3 || ratio < 0.33) return 'protein';
    return 'nucleotide';
  }, []);

  const detectedMode = refSeq && patientSeq
    ? detectMode(refSeq, patientSeq, refSeqType, patSeqType)
    : '';

  const isSeqTypeMismatch =
    refSeqType && patSeqType &&
    ((refSeqType === 'cds' && patSeqType === 'genomic') ||
     (refSeqType === 'genomic' && patSeqType === 'cds'));

  // ── Pipeline ─────────────────────────────────────────────────────────────
  const runAnalysis = async () => {
    setLoading(true);
    setResults([]);
    setBlastHits([]);

    let { gene, organism } = geneInfo;

    if (geneOverride.trim()) {
      gene = geneOverride.trim().toUpperCase();
      setGeneInfo(g => ({ ...g, gene }));
    }

    const compMode = detectMode(refSeq, patientSeq, refSeqType, patSeqType);
    setMode(compMode);

    try {
      let variants = [];

      // ══════════════════════════════════════════════════════════════════════
      // PROTEIN MODE
      // ══════════════════════════════════════════════════════════════════════
      if (compMode === 'protein') {

        if (isSeqTypeMismatch) {
          setLog(
            '⚠️ Sequence type mismatch detected: one file is mRNA/CDS and the other is genomic DNA. ' +
            'Switching to protein comparison mode (results may be approximate for genomic patient sequences)…'
          );
        } else {
          setLog('⚗️ Sequences have very different lengths. Switching to protein comparison mode…');
        }

        let patientProtein;

        if (patSeqType === 'genomic') {
          setLog(
            '⚠️ Patient file is a GENOMIC sequence (contains introns — NC_ accession). ' +
            'Extracting the longest open reading frame for approximate protein comparison. ' +
            'For accurate results, please provide a patient CDS/mRNA (NM_ format).'
          );
          const { protein: orfProtein } = findBestORF(patientSeq);
          patientProtein = orfProtein;
        } else if (refSeqType === 'genomic') {
          patientProtein = extractProtein(patientSeq);
        } else {
          patientProtein = extractProtein(patientSeq);
        }

        if (!patientProtein) {
          setLog('❌ Error: Could not extract a protein from the patient sequence. ' +
                 'Make sure the file contains a valid coding sequence with an ATG start codon.');
          setLoading(false);
          return;
        }

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

        const isMouseOrganism =
          organism.toLowerCase().includes('mus') || organism.toLowerCase().includes('mouse');
        const refProtein = await getCanonicalProtein(gene, isMouseOrganism ? 'mouse' : 'human');

        if (!refProtein) {
          setLog(`❌ Could not fetch canonical ${gene} protein from UniProt. Check gene symbol.`);
          setLoading(false);
          return;
        }

        setLog(
          `📊 Reference protein: ${refProtein.length} aa · ` +
          `Patient protein: ${patientProtein.length} aa. ` +
          (patSeqType === 'genomic'
            ? '⚠️ Patient protein extracted from genomic sequence (approximate). '
            : '') +
          'Comparing…'
        );

        const aaVariants = compareProteins(refProtein, patientProtein);

        if (aaVariants.length === 0) {
          setLog('✅ No amino acid differences found between patient and canonical protein.');
          setLoading(false);
          return;
        }

        variants = aaVariants.map(v => ({
          position:         v.aaPos,
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

        setLog(`Found ${variants.length} amino acid variant(s). Querying pathogenicity APIs…`);

      // ══════════════════════════════════════════════════════════════════════
      // NUCLEOTIDE MODE
      // ══════════════════════════════════════════════════════════════════════
      } else {
        setLog('🧬 Starting nucleotide-level analysis…');
        const rawVariants = [];
        const minLen = Math.min(refSeq.length, patientSeq.length);

        for (let i = 0; i < minLen; i++) {
          if (refSeq[i] !== patientSeq[i]) {
            const refAllele = refSeq[i];
            const altAllele = patientSeq[i];
            const aaChange  = getAminoAcidChange(refSeq, patientSeq, i + 1, refAllele, altAllele);
            rawVariants.push({
              position:         i + 1,           // nucleotide position (1-based)
              reference_allele: refAllele,
              alternate_allele: altAllele,
              gene,
              organism,
              aaPos:    aaChange.aaPos,           // amino acid position
              refAA:    aaChange.refAA,
              patAA:    aaChange.patAA,
              refCodon: aaChange.refCodon,
              patCodon: aaChange.patCodon,
              mode:     'nucleotide',
            });
          }
        }

        setLog(
          `Found ${rawVariants.length} nucleotide variant(s)` +
          (rawVariants.length > MAX_NT_VARIANTS ? ` (showing top ${MAX_NT_VARIANTS})` : '') +
          '. Querying APIs…'
        );

        variants = rawVariants;
      }

      // ── Step 5: AlphaMissense (parallel) ───────────────────────────────
      const enriched = await analyzeMutations(variants, MAX_NT_VARIANTS);

      // ── Step 6: UniProt disease info (parallel) ─────────────────────────
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

      // ── Step 7: BLAST (if not already run) ─────────────────────────────
      if (blastHits.length === 0) {
        setLog(`✅ Analysis complete (${enriched.length} variant(s)). Running BLAST…`);
        try {
          const querySeq = (compMode === 'protein' ? patientSeq : refSeq)
            .replace(/\s/g, '')
            .substring(0, 2000);
          const hits = await runBlast(querySeq, gene !== 'Unknown' ? gene : null);
          setBlastHits(hits);
          setLog(
            `✅ Pipeline complete — ${enriched.length} variant(s) · ${hits.length} BLAST hit(s).` +
            (isSeqTypeMismatch
              ? ' ⚠️ Note: patient was genomic DNA — protein comparison is approximate.'
              : '')
          );
        } catch (blastErr) {
          setLog(
            `✅ Analysis complete (${enriched.length} variant(s)). BLAST unavailable.` +
            (isSeqTypeMismatch
              ? ' ⚠️ Note: patient was genomic DNA — protein comparison is approximate.'
              : '')
          );
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

  // ── Clear ────────────────────────────────────────────────────────────────
  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setRefSeq(''); setPatientSeq('');
    setRefHeader(''); setPatientHeader('');
    setRefSeqType(''); setPatSeqType('');
    setResults([]); setBlastHits([]);
    setMode('');
    setLog('Upload two FASTA files to begin.');
    setGeneInfo({ gene: 'Unknown', organism: 'Unknown' });
    setGeneOverride('');
  };

  // ── Render ───────────────────────────────────────────────────────────────
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
                <span className={`ms-2 badge ${refSeqType === 'genomic' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                  {refSeqType || detectSequenceType(refHeader, refSeq.length)} · {refSeq.length.toLocaleString()} bp
                </span>
              )}
            </small>
          )}
        </div>
        <div className="col-md-6">
          <label className="form-label fw-bold">Mutated FASTA</label>
          <input
            type="file"
            accept=".fasta,.fa,.txt,.seq"
            className="form-control"
            onChange={e => handleFileUpload(e.target.files[0], false)}
          />
          {patientHeader && (
            <small className={`d-block mt-1 ${patSeqType === 'genomic' ? 'text-warning' : 'text-success'}`}>
              {patSeqType === 'genomic' ? '⚠️' : '✅'} Loaded: {patientHeader.replace(/^>/, '').substring(0, 60)}
              {patientSeq && (
                <span className={`ms-2 badge ${patSeqType === 'genomic' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                  {patSeqType || detectSequenceType(patientHeader, patientSeq.length)} · {patientSeq.length.toLocaleString()} bp
                </span>
              )}
            </small>
          )}
        </div>
      </div>

      {/* ── Genomic patient warning ── */}
      {patSeqType === 'genomic' && (
        <div className="alert alert-warning py-2 mb-2">
          <strong>⚠️ Genomic patient sequence detected (NC_ accession)</strong>
          <br />
          Your patient file is a full <strong>genomic DNA region</strong> that includes introns.
          The pipeline will translate the best available open reading frame (ORF) for protein comparison,
          but the results will be <strong>approximate</strong> — introns disrupt the reading frame.
          <br />
          <span className="text-muted">
            For accurate variant analysis, provide a patient <strong>CDS or mRNA sequence</strong> (NM_ format, e.g. exported from NCBI RefSeq or a transcript aligner).
          </span>
        </div>
      )}

      {/* Mode badge */}
      {refSeq && patientSeq && (
        <div className="mb-2">
          {detectedMode === 'protein' ? (
            <div className="alert alert-warning py-2 mb-2">
              <strong>⚗️ Protein Comparison Mode</strong> — Sequences have incompatible types or lengths (
              {refSeq.length.toLocaleString()} bp vs {patientSeq.length.toLocaleString()} bp).
              The pipeline will compare against the canonical reference protein from UniProt.
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

      {/* Gene override — always shown when sequences are loaded */}
      {refSeq && patientSeq && (
        <div className="mb-2 d-flex align-items-center gap-2">
          <label className="form-label mb-0 fw-semibold text-nowrap">Gene symbol:</label>
          <input
            type="text"
            className={`form-control form-control-sm ${geneInfo.gene === 'Unknown' ? 'border-warning' : ''}`}
            style={{ maxWidth: 160 }}
            placeholder={geneInfo.gene !== 'Unknown' ? geneInfo.gene : 'e.g. TP53'}
            value={geneOverride}
            onChange={e => setGeneOverride(e.target.value)}
          />
          {geneInfo.gene !== 'Unknown' && !geneOverride && (
            <small className="text-muted">Auto-detected: <strong>{geneInfo.gene}</strong> · Override if incorrect</small>
          )}
          {geneInfo.gene === 'Unknown' && (
            <small className="text-warning">⚠️ Gene not auto-detected — required for protein mode</small>
          )}
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
      <div className={`alert ${
        log.startsWith('❌') ? 'alert-danger' :
        log.startsWith('⚠️') ? 'alert-warning' :
        'alert-info'
      }`}>
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
            {patSeqType === 'genomic' && (
              <span className="badge bg-warning text-dark ms-2 fs-6">⚠️ Approximate (Genomic Patient)</span>
            )}
          </h5>
          <div className="table-responsive">
            <table className="table table-bordered table-sm table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  {/* In nucleotide mode: show both nt pos and aa pos columns */}
                  {mode !== 'protein' && <th>Nt Pos</th>}
                  <th>{mode === 'protein' ? 'AA Pos' : 'AA Pos'}</th>
                  <th>Ref Base</th>
                  <th>Alt Base</th>
                  <th>AA Change</th>
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
                    {/* Nucleotide position column (nucleotide mode only) */}
                    {mode !== 'protein' && (
                      <td className="text-muted" style={{ fontSize: '0.85em' }}>
                        {v.position ?? '—'}
                      </td>
                    )}
                    {/* Amino acid position */}
                    <td><strong>{v.aaPos ?? v.position ?? '—'}</strong></td>
                    {/* Reference base/AA */}
                    <td><strong>{v.reference_allele}</strong></td>
                    {/* Alternate base/AA */}
                    <td><strong>{v.alternate_allele}</strong></td>
                    {/* AA change summary */}
                    <td>
                      {v.refAA && v.patAA
                        ? <code>{v.refAA}{v.aaPos}{v.patAA}</code>
                        : '—'}
                    </td>
                    <td>{v.gene}</td>
                    <td><em>{v.organism}</em></td>
                    <td>
                      {typeof v.am_score === 'number'
                        ? <strong>{v.am_score.toFixed(4)}</strong>
                        : <span className="text-muted">{v.am_score}</span>}
                    </td>
                    <td>
                      <span className={`badge ${
                        v.classification?.includes('Pathogenic') ? 'bg-danger'    :
                        v.classification?.includes('Benign')     ? 'bg-success'   :
                        v.classification?.includes('database')   ? 'bg-secondary' :
                        v.classification?.includes('Error')      ? 'bg-secondary' :
                                                                   'bg-warning text-dark'
                      }`}>
                        {v.classification}
                      </span>
                    </td>
                    <td>{v.clinvar}</td>
                    <td style={{ maxWidth: 200, fontSize: '0.85em' }}>{v.disease}</td>
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
                      <a
                        href={`https://www.ncbi.nlm.nih.gov/nuccore/${h.accession}`}
                        target="_blank"
                        rel="noreferrer"
                      >
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