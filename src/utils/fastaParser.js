// utils/fastaParser.js

export function parseFasta(content) {
  const lines = content.trim().split('\n');
  let id = 'Unknown';
  let fullHeader = '';
  const sequences = [];
  let currentSeq = '';

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('>')) {
      if (currentSeq) sequences.push(currentSeq);
      fullHeader = line;
      id = line.substring(1).split(/[\s|:]/)[0];
      currentSeq = '';
    } else {
      currentSeq += line.replace(/\s/g, '');
    }
  }
  if (currentSeq) sequences.push(currentSeq);
  return { id, fullHeader, sequences };
}

// Words that are definitely NOT gene symbols
const STOPWORDS = new Set([
  'HOMO', 'SAPIENS', 'MUS', 'MUSCULUS', 'RATTUS', 'NORVEGICUS',
  'DANIO', 'RERIO', 'GALLUS', 'FELIS', 'CATUS', 'CANIS', 'LUPUS',
  'SUS', 'SCROFA', 'BISON', 'PAN', 'TROGLODYTES',
  'PATIENT', 'MUTANT', 'MUTATION', 'REFERENCE', 'REF', 'WILD', 'TYPE', 'WT',
  'SEQ', 'DNA', 'RNA', 'MRNA', 'CDS', 'CDNA', 'GENOME', 'GENOMIC',
  'CHROMOSOME', 'PRIMARY', 'ASSEMBLY', 'GRCH', 'SAMPLE', 'CLONE',
  'ISOFORM', 'VARIANT', 'TRANSCRIPT', 'PROTEIN', 'HUMAN', 'MOUSE',
  'HOMO', 'GENE', 'LOCUS', 'EXON', 'INTRON', 'UTR',
]);

/**
 * Detect sequence type from the sequence itself.
 * Returns 'genomic' | 'cds' | 'unknown'
 */
export function detectSequenceType(header, seqLength) {
  const h = (header || '').toUpperCase();
  // NC_ = chromosomal/genomic
  if (h.match(/NC_\d{6}/) || h.includes('CHROMOSOME') || h.includes('PRIMARY ASSEMBLY')) {
    return 'genomic';
  }
  // NM_/XM_ = mRNA
  if (h.match(/NM_\d+/) || h.match(/XM_\d+/) || h.includes('MRNA')) return 'cds';
  // Short sequences starting with ATG often CDS
  if (seqLength < 5000) return 'cds';
  if (seqLength > 10000) return 'genomic';
  return 'unknown';
}

/**
 * Extract gene symbol and organism from FASTA header.
 * Handles NCBI RefSeq, UniProt, Ensembl, free-text, and user-named headers.
 */
export function extractGeneAndOrganism(header) {
  const cleanHeader = header.replace(/^>/, '').trim();
  let gene = 'Unknown';
  let organism = 'Unknown';

  // ── 0a: NCBI mRNA "NM_000546.6 Homo sapiens tumor protein p53 (TP53), mRNA"
  const nmMatch = cleanHeader.match(/^(NM_|NR_|XM_|XR_)\S+\s+([\w\s]+?)\s+\(([A-Z][A-Z0-9a-z]{0,15})\)/);
  if (nmMatch) {
    const orgMatch = nmMatch[2].match(/^([A-Z][a-z]+\s+[a-z]+)/);
    organism = orgMatch ? orgMatch[1] : 'Homo sapiens';
    gene = nmMatch[3].toUpperCase();
    return { gene, organism };
  }

  // ── 0b: NCBI genomic "NC_000017.11:c7687490-7668421 Homo sapiens chromosome 17 ..."
  const ncbiGenomicMatch = cleanHeader.match(/^(NC_|NG_|NW_|NT_|NZ_)\S+\s+([A-Z][a-z]+\s+[a-z]+)/);
  if (ncbiGenomicMatch) {
    organism = ncbiGenomicMatch[2];
    const geneTag  = cleanHeader.match(/\bgene=([A-Za-z0-9_-]+)/i);
    const parenGene = cleanHeader.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
    if (geneTag)  gene = geneTag[1].toUpperCase();
    else if (parenGene) gene = parenGene[1];
    // Gene stays 'Unknown' for bare chromosomal headers — handled by AnalysisTab fallback
    return { gene, organism };
  }

  // ── 0c: NCBI protein "NP_000537.3 ... [Homo sapiens]"
  const npMatch = cleanHeader.match(/^(NP_|XP_|YP_|AP_)\S+\s+.*\[([A-Z][a-z]+\s+[a-z]+)\]/);
  if (npMatch) {
    organism = npMatch[2];
    const p = cleanHeader.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
    if (p) gene = p[1];
    return { gene, organism };
  }

  // ── 1: Bracketed organism "[Homo sapiens]"
  const bracketOrg = cleanHeader.match(/\[([A-Z][a-z]+\s+[a-z]+)\]/);
  if (bracketOrg) organism = bracketOrg[1];

  // ── 2: Explicit "(GENE)" symbol
  const parenGene = cleanHeader.match(/\(([A-Z][A-Z0-9]{1,11})\)/);
  if (parenGene) {
    gene = parenGene[1];
    if (organism !== 'Unknown') return { gene, organism };
  }

  // ── 3: "gene for ... (GENE)" – Plasmodium style
  const geneForMatch = cleanHeader.match(/gene\s+for\s+.*?\(([A-Z0-9]+)\)/i);
  if (geneForMatch) {
    gene = geneForMatch[1];
    const orgM = cleanHeader.match(/^([A-Z]\.\w+)/);
    if (orgM) {
      const s = orgM[1];
      const orgMap = { 'P.vivax': 'Plasmodium vivax', 'P.falciparum': 'Plasmodium falciparum' };
      organism = orgMap[s] || s;
    }
    return { gene, organism };
  }

  // ── 4: UniProt "sp|P04637|P53_HUMAN"
  const uniprotMatch = cleanHeader.match(/\|([^|]+)\|([A-Z0-9]+)_([A-Z]+)/);
  if (uniprotMatch) {
    gene = uniprotMatch[2];
    const speciesMap = {
      HUMAN: 'Homo sapiens', MOUSE: 'Mus musculus', RAT: 'Rattus norvegicus',
      BOVIN: 'Bos taurus', CHICK: 'Gallus gallus', DANRE: 'Danio rerio',
    };
    organism = speciesMap[uniprotMatch[3]] || uniprotMatch[3];
    return { gene, organism };
  }

  // ── 5: Genus_species_GENE underscore style
  const parts = cleanHeader.split(/[|\s_\-]+/);
  if (parts.length >= 3 && parts[0].match(/^[A-Z][a-z]+$/) && parts[1].match(/^[a-z]+$/)) {
    organism = parts[0] + ' ' + parts[1];
    const candidate = parts.slice(2).find(p => p.match(/^[A-Z][A-Z0-9]{1,11}$/) && !STOPWORDS.has(p));
    if (candidate) { gene = candidate; return { gene, organism }; }
  }

  // ── 6: Scan all tokens for gene-like strings
  //    Handles "patient_tp53_mutant" → TP53, "BRCA1_ref_seq" → BRCA1
  for (const token of parts) {
    const upper = token.toUpperCase();
    if (
      upper.match(/^[A-Z][A-Z0-9]{1,11}$/) &&
      !STOPWORDS.has(upper) &&
      !upper.match(/^\d+$/)
    ) {
      gene = upper;
      break;
    }
  }

  // ── 7: Organism from free text if still unknown
  if (organism === 'Unknown') {
    const knownOrgs = [
      'Homo sapiens', 'Mus musculus', 'Rattus norvegicus',
      'Danio rerio', 'Drosophila melanogaster', 'Gallus gallus',
    ];
    for (const org of knownOrgs) {
      if (cleanHeader.toLowerCase().includes(org.toLowerCase())) {
        organism = org;
        break;
      }
    }
  }

  return { gene, organism };
}