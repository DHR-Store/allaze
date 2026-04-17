import axios from 'axios';

export async function getUniProtInfo(gene) {
  try {
    const resp = await axios.get(`https://rest.uniprot.org/uniprotkb/search?query=gene:${gene}+AND+organism_id:9606&size=1&format=json`);
    const entry = resp.data.results?.[0];
    if (!entry) return 'No UniProt entry';
    const diseaseComment = entry.comments?.find(c => c.commentType === 'DISEASE');
    return diseaseComment?.disease?.description || 'No disease association';
  } catch {
    return 'UniProt error';
  }
}