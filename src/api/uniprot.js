// api/uniprot.js
import axios from 'axios';

// Hardcoded disease associations for well-known genes
// Used as fallback when UniProt API returns no disease data
const KNOWN_DISEASES = {
  TP53:   'Li-Fraumeni syndrome; associated with many cancers (breast, colon, lung, sarcoma, brain)',
  BRCA1:  'Hereditary breast and ovarian cancer syndrome (HBOC)',
  BRCA2:  'Hereditary breast and ovarian cancer syndrome (HBOC); Fanconi anemia type D1',
  DMD:    'Duchenne muscular dystrophy (DMD); Becker muscular dystrophy (BMD)',
  CFTR:   'Cystic fibrosis (CF); Congenital bilateral absence of vas deferens (CBAVD)',
  HBB:    'Sickle cell disease; Beta-thalassemia; Hemoglobin disorders',
  EGFR:   'Associated with non-small cell lung cancer (NSCLC)',
  KRAS:   'Associated with pancreatic cancer, colorectal cancer, lung adenocarcinoma',
  BRAF:   'Associated with melanoma, hairy cell leukemia; Cardiofaciocutaneous syndrome',
  PIK3CA: 'Associated with breast cancer; CLOVES syndrome; Cowden syndrome',
  PTEN:   'Cowden syndrome; Bannayan-Riley-Ruvalcaba syndrome; PTEN hamartoma tumor syndrome',
};

/**
 * Get disease association for a gene from UniProt.
 * Falls back to hardcoded KNOWN_DISEASES for common genes.
 */
export async function getUniProtInfo(gene) {
  if (!gene || gene === 'Unknown') return 'Gene not specified';

  const geneUpper = gene.toUpperCase();

  try {
    // Try mouse first, then human
    for (const orgId of ['10090', '9606']) {
      const resp = await axios.get(
        `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${gene}+AND+organism_id:${orgId}+AND+reviewed:true&size=1&format=json`,
        { timeout: 8000 }
      );
      const entry = resp.data.results?.[0];
      if (!entry) continue;

      // Try multiple possible fields for disease description
      const diseaseComment = entry.comments?.find(c => c.commentType === 'DISEASE');
      const description =
        diseaseComment?.disease?.description ||
        diseaseComment?.disease?.name ||
        diseaseComment?.disease?.diseaseId;

      if (description) return description;

      // If no disease comment found via API, fall through to hardcoded
      break;
    }
  } catch {
    // Network error – fall through to hardcoded
  }

  // Fallback: return hardcoded disease if available
  if (KNOWN_DISEASES[geneUpper]) {
    return KNOWN_DISEASES[geneUpper];
  }

  return 'No disease association in database';
}

/**
 * Fetch the canonical protein sequence for a gene from UniProt.
 * Returns the protein sequence string, or null on failure.
 */
export async function getCanonicalProtein(gene, preferOrganism = 'human') {
  if (!gene || gene === 'Unknown') return null;

  const orgOrder = preferOrganism === 'mouse'
    ? ['10090', '9606']
    : ['9606', '10090'];

  for (const orgId of orgOrder) {
    try {
      const resp = await axios.get(
        `https://rest.uniprot.org/uniprotkb/search?query=gene_exact:${gene}+AND+organism_id:${orgId}+AND+reviewed:true&size=1&format=fasta`,
        { timeout: 8000 }
      );
      const fasta = resp.data;
      if (!fasta || !fasta.includes('>')) continue;
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