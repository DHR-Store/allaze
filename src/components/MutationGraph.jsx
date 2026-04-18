// components/MutationGraph.jsx
import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const MutationGraph = ({ mutations }) => {
  // Filter to only variants with numeric scores
  const validMutations = mutations.filter(m => typeof m.am_score === 'number');
  
  if (validMutations.length === 0) {
    return (
      <div className="alert alert-warning">
        No numeric pathogenicity scores available for graphing.
        {mutations.length > 0 && ' (Non-human variants cannot be scored by AlphaMissense)'}
      </div>
    );
  }

  const labels = validMutations.map(m => {
    const aaPos = m.aaPos && m.aaPos !== '?' ? m.aaPos : m.position;
    return `${m.gene || 'Var'} ${aaPos}`;
  });

  const scores = validMutations.map(m => m.am_score);

  const chartData = {
    labels,
    datasets: [{
      label: 'AlphaMissense Score',
      data: scores,
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Mutation Pathogenicity Scores' },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(4)}`,
        },
      },
    },
    scales: {
      y: { 
        beginAtZero: true, 
        max: 1.0, 
        title: { display: true, text: 'Score' } 
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default MutationGraph;