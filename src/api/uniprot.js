// api/uniprot.js
import axios from 'axios';

/**
 * Get disease association for a gene from UniProt.
 */
export async function getUniProtInfo(gene) {
  if (!gene || gene === 'Unknown') return 'Gene not specified';
  try {
    // Try mouse first, then human
    for (const orgId of ['10090', '9606']) {
      const resp = await axios.get(
        `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${gene}+AND+organism_id:${orgId}+AND+reviewed:true&size=1&format=json`
      );
      const entry = resp.data.results?.[0];
      if (!entry) continue;
      const diseaseComment = entry.comments?.find(c => c.commentType === 'DISEASE');
      return diseaseComment?.disease?.description || 'No disease association';
    }
    return 'No UniProt entry';
  } catch {
    return 'UniProt error';
  }
}

/**
 * Fetch the canonical protein sequence for a gene from UniProt.
 * Returns the protein sequence string, or null on failure.
 *
 * Uses FASTA format endpoint for efficiency.
 */
export async function getCanonicalProtein(gene, preferOrganism = 'human') {
  if (!gene || gene === 'Unknown') return null;

  const orgOrder = preferOrganism === 'mouse'
    ? ['10090', '9606']   // mouse first, human fallback
    : ['9606', '10090'];  // human first, mouse fallback

  for (const orgId of orgOrder) {
    try {
      const resp = await axios.get(
        `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${gene}+AND+organism_id:${orgId}+AND+reviewed:true&size=1&format=fasta`,
        { timeout: 8000 }
      );
      const fasta = resp.data;
      if (!fasta || !fasta.includes('>')) continue;
      // Strip header line(s) and join sequence lines
      const seq = fasta
        .split('\n')
        .filter(l => l && !l.startsWith('>'))
        .join('')
        .replace(/\s/g, '');
      if (seq.length > 0) return seq;
    } catch {
      // Try next organism
    }
  }
  return null;
}