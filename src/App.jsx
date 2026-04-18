// App.jsx
import React, { useState, useEffect } from 'react';
import AnalysisTab   from './components/AnalysisTab';
import BlastTab      from './components/BlastTab';
import StructureTab  from './components/StructureTab';
import SettingsTab   from './components/SettingsTab';
import SettingsSwiss from './components/SettingsSwiss';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');

  // ── Shared analysis state ────────────────────────────────────────────────
  const [analysisGene, setAnalysisGene] = useState('');
  const [mutations,    setMutations]    = useState([]);
  const [refSeq,       setRefSeq]       = useState('');
  const [patientSeq,   setPatientSeq]   = useState('');
  const [blastHits,    setBlastHits]    = useState([]);

  // ── 3D Viewer settings ───────────────────────────────────────────────────
  const [swissSettings, setSwissSettings] = useState({
    show2D:         true,
    show3D:         true,
    showMutations:  true,
    showLabels:     true,
    representation:'cartoon',
    colorScheme:   'chain',
    showGraph:      true,
    showTable:      true,
  });

  /**
   * Called when the analysis pipeline finishes.
   * gene may have been auto-detected from BLAST even if it started as 'Unknown'.
   */
  const handleAnalysisComplete = (gene, variants, ref, pat, hits = []) => {
    if (gene && gene !== 'Unknown') setAnalysisGene(gene);
    setMutations(variants);
    setRefSeq(ref);
    setPatientSeq(pat);
    setBlastHits(hits);
  };

  // ── Attempt to auto-detect gene from BLAST hits ─────────────────────────
  //    If analysisGene is still empty but blastHits have arrived, parse top hit.
  useEffect(() => {
    if (!analysisGene && blastHits.length > 0) {
      const m = blastHits[0]?.description?.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
      if (m) setAnalysisGene(m[1]);
    }
  }, [blastHits, analysisGene]);

  // ── Nav badges ────────────────────────────────────────────────────────────
  const varBadge  = mutations.length > 0
    ? <span className="badge bg-danger ms-1">{mutations.length}</span> : null;
  const blastBadge = blastHits.length > 0
    ? <span className="badge bg-primary ms-1">{blastHits.length}</span> : null;

  return (
    <div className="container-fluid p-3">
      <h1 className="mb-1">🧬 Allaze – DNA Analyzer Pro</h1>
      {analysisGene && analysisGene !== 'Unknown' && (
        <p className="text-muted mb-3 small">
          Active gene: <strong>{analysisGene}</strong>
          {mutations.length > 0 && ` · ${mutations.length} variant(s)`}
          {blastHits.length > 0  && ` · ${blastHits.length} BLAST hit(s)`}
        </p>
      )}

      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🚀 Run Analysis{varBadge}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'blast' ? 'active' : ''}`}
            onClick={() => setActiveTab('blast')}
          >
            🔍 BLAST Search{blastBadge}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            🏗 3D Structure
            {analysisGene && analysisGene !== 'Unknown' && (
              <span className="badge bg-success ms-1">Ready</span>
            )}
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </li>
      </ul>

      <div className="tab-content mt-3">
        {activeTab === 'analysis' && (
          <AnalysisTab onAnalysisComplete={handleAnalysisComplete} />
        )}

        {activeTab === 'blast' && (
          <BlastTab
            initialSequence={patientSeq || refSeq}
            initialResults={blastHits}
            initialGene={analysisGene}
          />
        )}

        {activeTab === 'structure' && (
          <StructureTab
            initialGene={analysisGene}
            mutations={mutations}
            refSeq={refSeq}
            patientSeq={patientSeq}
            settings={swissSettings}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab>
            <SettingsSwiss settings={swissSettings} onChange={setSwissSettings} />
          </SettingsTab>
        )}
      </div>
    </div>
  );
}

export default App;