// components/Protein2DView.jsx
import React, { useRef, useEffect } from 'react';

const Protein2DView = ({ proteinLength, mutations, structures, uniprotId }) => {
  const canvasRef = useRef(null);
  const width = 800;
  const height = 120;

  // Ensure proteinLength is a number
  const lengthNum = typeof proteinLength === 'number' ? proteinLength : parseInt(proteinLength, 10);
  const isValidLength = !isNaN(lengthNum) && lengthNum > 0;

  useEffect(() => {
    if (!isValidLength) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Draw protein backbone
    ctx.fillStyle = '#ccc';
    ctx.fillRect(50, 50, width - 100, 20);

    // Draw domains from structures
    if (Array.isArray(structures)) {
      structures.forEach((s, idx) => {
        let start, end;

        if (typeof s.coverage === 'string' && s.coverage.includes('-')) {
          [start, end] = s.coverage.split('-').map(Number);
        } else if (typeof s.coverage === 'number') {
          const coverageLength = Math.round(lengthNum * s.coverage);
          start = 1;
          end = coverageLength;
        } else {
          return;
        }

        if (isNaN(start) || isNaN(end) || start < 1 || end > lengthNum) return;

        const xStart = 50 + (start / lengthNum) * (width - 100);
        const xEnd = 50 + (end / lengthNum) * (width - 100);
        ctx.fillStyle = `hsl(${idx * 60}, 70%, 60%)`;
        ctx.fillRect(xStart, 50, xEnd - xStart, 20);
      });
    }

    // Draw mutations
    if (Array.isArray(mutations)) {
      mutations.forEach(m => {
        const aaPos = m.aaPos;
        if (aaPos && !isNaN(aaPos) && aaPos >= 1 && aaPos <= lengthNum) {
          const x = 50 + (aaPos / lengthNum) * (width - 100);
          ctx.beginPath();
          ctx.arc(x, 60, 6, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      });
    }

    // Labels
    ctx.font = '12px Arial';
    ctx.fillStyle = 'black';
    ctx.fillText(`N-terminus`, 50, 40);
    ctx.fillText(`C-terminus`, width - 50, 40);
    ctx.fillText(`${lengthNum} aa`, width - 70, 90);
  }, [lengthNum, isValidLength, mutations, structures]);

  if (!isValidLength) {
    return (
      <div className="card p-2 text-warning">
        Protein length unknown – cannot display 2D view.
      </div>
    );
  }

  return (
    <div className="card p-2">
      <h6>Protein 2D View</h6>
      <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: 'auto' }} />
      <small className="text-muted">
        Domains colored by structure coverage. Red circles = mutation positions.{' '}
        <a href={`https://swissmodel.expasy.org/repository/uniprot/${uniprotId}`} target="_blank" rel="noreferrer">
          View on Swiss‑Model
        </a>
      </small>
    </div>
  );
};

export default Protein2DView;