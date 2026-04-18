// components/SettingsSwiss.jsx
import React from 'react';

const SettingsSwiss = ({ settings, onChange }) => {
  const handleToggle = (key) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  const handleSelect = (key, value) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="card p-3">
      <h5>🧬 Structure Viewer Settings</h5>
      <div className="row">
        <div className="col-md-6">
          <h6>View Options</h6>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="show2D"
              checked={settings.show2D}
              onChange={() => handleToggle('show2D')}
            />
            <label className="form-check-label" htmlFor="show2D">Show 2D Sequence View</label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="show3D"
              checked={settings.show3D}
              onChange={() => handleToggle('show3D')}
            />
            <label className="form-check-label" htmlFor="show3D">Show 3D Structure</label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="showMutations"
              checked={settings.showMutations}
              onChange={() => handleToggle('showMutations')}
            />
            <label className="form-check-label" htmlFor="showMutations">Highlight Mutations on 3D</label>
          </div>
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="showLabels"
              checked={settings.showLabels}
              onChange={() => handleToggle('showLabels')}
            />
            <label className="form-check-label" htmlFor="showLabels">Show Residue Labels</label>
          </div>
        </div>
        <div className="col-md-6">
          <h6>3D Representation</h6>
          <select
            className="form-select mb-2"
            value={settings.representation}
            onChange={(e) => handleSelect('representation', e.target.value)}
          >
            <option value="cartoon">Cartoon</option>
            <option value="surface">Surface</option>
            <option value="ball+stick">Ball+Stick</option>
            <option value="licorice">Licorice</option>
          </select>
          <h6>Color Scheme</h6>
          <select
            className="form-select"
            value={settings.colorScheme}
            onChange={(e) => handleSelect('colorScheme', e.target.value)}
          >
            <option value="chain">Chain</option>
            <option value="residue">Residue Type</option>
            <option value="hydrophobicity">Hydrophobicity</option>
            <option value="bfactor">B‑Factor</option>
          </select>
        </div>
      </div>
      <hr />
      <div className="form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="showGraph"
          checked={settings.showGraph}
          onChange={() => handleToggle('showGraph')}
        />
        <label className="form-check-label" htmlFor="showGraph">Show Pathogenicity Graph</label>
      </div>
      <div className="form-check">
        <input
          type="checkbox"
          className="form-check-input"
          id="showTable"
          checked={settings.showTable}
          onChange={() => handleToggle('showTable')}
        />
        <label className="form-check-label" htmlFor="showTable">Show Mutation Table</label>
      </div>
    </div>
  );
};

export default SettingsSwiss;