import axios from 'axios';

async function getUniprotId(gene) {
  try {
    const url = `https://rest.uniprot.org/uniprotkb/search?query=gene:${gene}+AND+organism_id:9606+AND+reviewed:true&size=1&format=json`;
    const resp = await axios.get(url);
    return resp.data.results?.[0]?.primaryAccession || null;
  } catch {
    return null;
  }
}

export async function getSwissModelInfo(gene) {
  if (!gene || gene === 'Unknown') {
    return { error: 'Invalid gene name' };
  }
  const uniId = await getUniprotId(gene);
  if (!uniId) {
    return { error: `UniProt ID not found for ${gene}` };
  }
  const url = `https://swissmodel.expasy.org/repository/uniprot/${uniId}.json`;
  try {
    const resp = await axios.get(url);
    const result = resp.data.result;
    return {
      uniprot_id: uniId,
      protein_name: result.description || gene,
      organism: result.source || 'Homo sapiens',
      length: result.length || 'N/A',
      structures: (result.structures || []).map(s => ({
        model_id: s.model_id,
        pdb_id: s.pdb_id,
        description: s.description || 'N/A',
        method: s.method || 'N/A',
        coverage: s.coverage || 'N/A',
        identity: s.identity || 'N/A',
        oligo_state: s.oligo_state || 'N/A',
        ligands: s.ligands || [],
        url: `https://swissmodel.expasy.org/repository/uniprot/${uniId}?csm=${s.model_id}`
      }))
    };
  } catch (e) {
    return { error: `Swiss‑Model API error: ${e.message}` };
  }
}