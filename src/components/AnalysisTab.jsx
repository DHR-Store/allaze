import React, { useState } from 'react';
import { parseFasta } from '../utils/fastaParser';
import { analyzeMutations } from '../api/alphamissense';
import { getUniProtInfo } from '../api/uniprot';

function AnalysisTab({ onAnalysisComplete }) {
  const [refSeq, setRefSeq] = useState('');
  const [patientSeq, setPatientSeq] = useState('');
  const [seqId, setSeqId] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState('');

  const handleFileUpload = (file, isRef) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      const { id, sequences } = parseFasta(content);
      setSeqId(id);
      if (sequences.length >= 2) {
        setRefSeq(sequences[0]);
        setPatientSeq(sequences[1]);
      } else {
        if (isRef) setRefSeq(sequences[0]);
        else setPatientSeq(sequences[0]);
      }
    };
    reader.readAsText(file);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setLog('Starting analysis...');
    setResults([]);
    try {
      // Variant detection (simplified: nucleotide mismatches)
      const variants = [];
      const gene = seqId.split('_')[0] || 'Unknown';
      const minLen = Math.min(refSeq.length, patientSeq.length);
      for (let i = 0; i < minLen; i++) {
        if (refSeq[i] !== patientSeq[i]) {
          variants.push({
            position: i + 1, // 1‑based nucleotide position
            reference_allele: refSeq[i],
            alternate_allele: patientSeq[i],
            gene: gene
          });
        }
      }
      setLog(`Found ${variants.length} variants. Querying APIs...`);
      const enriched = await analyzeMutations(variants);
      for (let v of enriched) {
        const diseaseInfo = await getUniProtInfo(v.gene);
        v.disease = diseaseInfo;
      }
      setResults(enriched);
      setLog('Analysis complete.');

      // Pass results and sequences to parent (for Structure tab)
      if (onAnalysisComplete) {
        onAnalysisComplete(gene, enriched, refSeq, patientSeq);
      }
    } catch (err) {
      setLog(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="row mb-3">
        <div className="col-md-6">
          <label className="form-label">Reference FASTA</label>
          <input
            type="file"
            accept=".fasta,.fa"
            className="form-control"
            onChange={e => handleFileUpload(e.target.files[0], true)}
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Patient FASTA</label>
          <input
            type="file"
            accept=".fasta,.fa"
            className="form-control"
            onChange={e => handleFileUpload(e.target.files[0], false)}
          />
        </div>
      </div>
      <button
        className="btn btn-primary mb-3"
        onClick={runAnalysis}
        disabled={loading || !refSeq || !patientSeq}
      >
        {loading ? 'Running...' : '▶ Run Pipeline'}
      </button>
      <div className="alert alert-info">{log || 'Upload two FASTA files to begin.'}</div>
      {results.length > 0 && (
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Pos</th><th>Ref</th><th>Alt</th><th>Gene</th><th>AM Score</th>
              <th>Classification</th><th>CADD</th><th>ClinVar</th><th>Disease</th>
            </tr>
          </thead>
          <tbody>
            {results.map((v, i) => (
              <tr key={i}>
                <td>{v.position}</td><td>{v.reference_allele}</td><td>{v.alternate_allele}</td>
                <td>{v.gene}</td><td>{v.am_score}</td><td>{v.classification}</td>
                <td>{v.cadd}</td><td>{v.clinvar}</td><td>{v.disease}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AnalysisTab;