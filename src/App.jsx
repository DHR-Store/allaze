import React, { useState } from 'react';
import AnalysisTab from './components/AnalysisTab';
import BlastTab from './components/BlastTab';
import StructureTab from './components/StructureTab';
import SettingsTab from './components/SettingsTab';

function App() {
  const [activeTab, setActiveTab] = useState('analysis');
  // Shared state from analysis
  const [analysisGene, setAnalysisGene] = useState('');
  const [mutations, setMutations] = useState([]);
  const [refSeq, setRefSeq] = useState('');
  const [patientSeq, setPatientSeq] = useState('');

  // Called when analysis finishes – store results but stay on Analysis tab
  const handleAnalysisComplete = (gene, variants, ref, pat) => {
    setAnalysisGene(gene);
    setMutations(variants);
    setRefSeq(ref);
    setPatientSeq(pat);
    // Do NOT auto‑switch – user can click Structure tab when ready
  };

  return (
    <div className="container-fluid p-3">
      <h1 className="mb-4">🧬 Allaze – DNA Analyzer Pro</h1>
      <ul className="nav nav-tabs">
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setActiveTab('analysis')}
          >
            🧬 Run Analysis
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'blast' ? 'active' : ''}`}
            onClick={() => setActiveTab('blast')}
          >
            🔬 BLAST Search
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            🧬 3D Structure
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
        {activeTab === 'blast' && <BlastTab />}
        {activeTab === 'structure' && (
          <StructureTab
            initialGene={analysisGene}
            mutations={mutations}
            refSeq={refSeq}
            patientSeq={patientSeq}
          />
        )}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
}

export default App;