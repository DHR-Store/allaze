// utils/translation.js

const codonTable = {
  'ATA':'I','ATC':'I','ATT':'I','ATG':'M',
  'ACA':'T','ACC':'T','ACG':'T','ACT':'T',
  'AAC':'N','AAT':'N','AAA':'K','AAG':'K',
  'AGC':'S','AGT':'S','AGA':'R','AGG':'R',
  'CTA':'L','CTC':'L','CTG':'L','CTT':'L',
  'CCA':'P','CCC':'P','CCG':'P','CCT':'P',
  'CAC':'H','CAT':'H','CAA':'Q','CAG':'Q',
  'CGA':'R','CGC':'R','CGG':'R','CGT':'R',
  'GTA':'V','GTC':'V','GTG':'V','GTT':'V',
  'GCA':'A','GCC':'A','GCG':'A','GCT':'A',
  'GAC':'D','GAT':'D','GAA':'E','GAG':'E',
  'GGA':'G','GGC':'G','GGG':'G','GGT':'G',
  'TCA':'S','TCC':'S','TCG':'S','TCT':'S',
  'TTC':'F','TTT':'F','TTA':'L','TTG':'L',
  'TAC':'Y','TAT':'Y','TAA':'_','TAG':'_',
  'TGC':'C','TGT':'C','TGA':'_','TGG':'W',
};

export function translateDNA(dna) {
  let protein = '';
  for (let i = 0; i < dna.length - 2; i += 3) {
    const codon = dna.substring(i, i + 3).toUpperCase();
    protein += codonTable[codon] || 'X';
  }
  return protein;
}

/**
 * Find the first open reading frame (starts at first ATG, ends at stop codon).
 * Returns the amino acid sequence (without the stop codon character).
 */
export function extractProtein(dnaSeq) {
  if (!dnaSeq) return null;
  const upper = dnaSeq.toUpperCase().replace(/\s/g, '');
  const atgIdx = upper.indexOf('ATG');
  if (atgIdx < 0) return null;
  const coding = upper.substring(atgIdx);
  let protein = '';
  for (let i = 0; i < coding.length - 2; i += 3) {
    const codon = coding.substring(i, i + 3);
    const aa = codonTable[codon] || 'X';
    if (aa === '_') break;   // stop codon – done
    protein += aa;
  }
  return protein.length > 0 ? protein : null;
}

/**
 * Try all three reading frames and return the one that yields the longest ORF.
 * Useful when the input DNA may not start at the ATG.
 */
export function findBestORF(dnaSeq) {
  let best = { protein: '', frame: 0 };
  for (let frame = 0; frame < 3; frame++) {
    const p = extractProtein(dnaSeq.substring(frame));
    if (p && p.length > best.protein.length) {
      best = { protein: p, frame };
    }
  }
  return best;
}

/**
 * Compare two protein sequences and return an array of amino-acid variants.
 * Each element: { aaPos, refAA, patAA, synonymous }
 */
export function compareProteins(refProtein, patProtein) {
  if (!refProtein || !patProtein) return [];
  const variants = [];
  const minLen = Math.min(refProtein.length, patProtein.length);

  for (let i = 0; i < minLen; i++) {
    if (refProtein[i] !== patProtein[i]) {
      variants.push({
        aaPos: i + 1,
        refAA: refProtein[i],
        patAA: patProtein[i],
        synonymous: false,
      });
    }
  }

  // Report length difference as a truncation/extension event
  if (refProtein.length !== patProtein.length) {
    variants.push({
      aaPos: minLen + 1,
      refAA: refProtein.length > minLen ? `${refProtein[minLen]}…(+${refProtein.length - minLen}aa)` : '—',
      patAA: patProtein.length > minLen ? `${patProtein[minLen]}…(+${patProtein.length - minLen}aa)` : '—',
      synonymous: false,
      isTruncation: true,
      note: `Protein length differs: ref=${refProtein.length} aa, patient=${patProtein.length} aa`,
    });
  }
  return variants;
}

/**
 * Get amino acid change for a nucleotide variant (SNP or small indel).
 */
export function getAminoAcidChange(refSeq, patientSeq, position, refAllele, altAllele) {
  const codonStart = Math.floor((position - 1) / 3) * 3;
  const aaPos = codonStart / 3 + 1;

  if (refAllele.length === 1 && altAllele.length === 1) {
    const refCodon = refSeq.substring(codonStart, codonStart + 3);
    const patCodon = patientSeq.substring(codonStart, codonStart + 3);
    const refAA = codonTable[refCodon.toUpperCase()] || '?';
    const patAA = codonTable[patCodon.toUpperCase()] || '?';
    return { refAA, patAA, aaPos, refCodon, patCodon };
  }

  const refProtein = translateDNA(refSeq);
  const patProtein = translateDNA(patientSeq);
  const refAA = refProtein[aaPos - 1] || '?';
  const patAA = patProtein[aaPos - 1] || '?';
  return {
    refAA, patAA, aaPos,
    refCodon: refAllele.length > 1 ? 'INDEL' : refSeq.substring(codonStart, codonStart + 3),
    patCodon: altAllele.length > 1 ? 'INDEL' : patientSeq.substring(codonStart, codonStart + 3),
  };
}

export function getBaseContext(seq, position, flank = 5) {
  const start = Math.max(0, position - 1 - flank);
  const end   = Math.min(seq.length, position + flank);
  return seq.substring(start, end);
}