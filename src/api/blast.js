import axios from 'axios';

// Simplified mock BLAST – replace with real NCBI BLAST URL API if needed
export async function runBlast(sequence) {
  // For demo, return mock hits
  return [
    { accession: 'NM_007294.3', description: 'Homo sapiens BRCA1', identity: '100%', evalue: '0.0' },
    { accession: 'XM_011525146.2', description: 'Pan troglodytes BRCA1', identity: '98.5%', evalue: '1e-180' }
  ];
}