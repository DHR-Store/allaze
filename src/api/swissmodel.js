// api/swissmodel.js
import axios from 'axios';

// Map common organism names to UniProt taxonomy IDs
const ORG_MAP = {
  'homo sapiens': '9606',
  'human': '9606',
  'mus musculus': '10090',
  'mouse': '10090'
};

// Try specified organism first, fallback to the other
async function getUniprotId(gene, organismName = 'human') {
  const search = async (organismId) => {
    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=gene:${gene}+AND+organism_id:${organismId}+AND+reviewed:true&size=1&format=json`;
      const resp = await axios.get(url);
      return resp.data.results?.[0]?.primaryAccession || null;
    } catch {
      return null;
    }
  };

  const lowerOrg = (organismName || 'human').toLowerCase();
  const preferredId = ORG_MAP[lowerOrg] || '9606'; // Default to human (9606)
  const fallbackId = preferredId === '9606' ? '10090' : '9606';

  // 1. Try preferred organism first (Human by default)
  let uniId = await search(preferredId);
  if (uniId) return uniId;

  // 2. Fallback to the alternative (Mouse)
  uniId = await search(fallbackId);
  return uniId;
}

export async function getSwissModelInfo(gene, organism = 'human') {
  if (!gene || gene === 'Unknown') {
    return { error: 'Invalid gene name' };
  }
  
  const uniId = await getUniprotId(gene, organism);
  
  if (!uniId) {
    return { error: `UniProt ID not found for "${gene}". Please check the gene symbol.` };
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
      qmean: s.qmean !== undefined ? s.qmean : 'N/A',
      gmqe: s.gmqe !== undefined ? s.gmqe : 'N/A',
      pdb_url: s.coordinates || null,
    }));
    
    return { uniId, length, structures };
  } catch (error) {
    return { error: `Structure data not found for ${gene} (${uniId})` };
  }
}