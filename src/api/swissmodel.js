// api/swissmodel.js
import axios from 'axios';

// Try mouse first, then human fallback
async function getUniprotId(gene) {
  // Helper to search organism
  const search = async (organismId) => {
    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=gene:${gene}+AND+organism_id:${organismId}+AND+reviewed:true&size=1&format=json`;
      const resp = await axios.get(url);
      return resp.data.results?.[0]?.primaryAccession || null;
    } catch {
      return null;
    }
  };

  // Try mouse (10090) first
  let uniId = await search('10090');
  if (uniId) return uniId;
  // Fallback to human (9606)
  uniId = await search('9606');
  return uniId;
}

export async function getSwissModelInfo(gene) {
  if (!gene || gene === 'Unknown') {
    return { error: 'Invalid gene name' };
  }
  const uniId = await getUniprotId(gene);
  if (!uniId) {
    return { error: `UniProt ID not found for "${gene}". Please check the gene symbol (e.g., Dmd for mouse).` };
  }
  const url = `https://swissmodel.expasy.org/repository/uniprot/${uniId}.json`;
  try {
    const resp = await axios.get(url);
    const result = resp.data.result;
    
    const length = result.sequence?.length || result.length || 'N/A';
    const structures = (result.structures || []).map(s => ({
      model_id: s.model_id || s.template || 'N/A',
      pdb_id: s.pdb_id || 'N/A',
      description: s.description || s.method || 'Homology model',
      method: s.method || 'N/A',
      coverage: s.coverage || 'N/A',
      identity: s.identity || 'N/A',
      oligo_state: s.oligo_state || 'N/A',
      ligands: s.ligands || [],
      url: `https://swissmodel.expasy.org/repository/uniprot/${uniId}?csm=${s.model_id || s.template}`
    }));

    return {
      uniprot_id: uniId,
      protein_name: result.description || gene,
      organism: result.source || 'Homo sapiens',
      length,
      structures
    };
  } catch (e) {
    return { error: `Swiss‑Model API error: ${e.message}` };
  }
}