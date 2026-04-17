// Standard genetic code
const codonTable = {
  'ATA':'I', 'ATC':'I', 'ATT':'I', 'ATG':'M',
  'ACA':'T', 'ACC':'T', 'ACG':'T', 'ACT':'T',
  'AAC':'N', 'AAT':'N', 'AAA':'K', 'AAG':'K',
  'AGC':'S', 'AGT':'S', 'AGA':'R', 'AGG':'R',
  'CTA':'L', 'CTC':'L', 'CTG':'L', 'CTT':'L',
  'CCA':'P', 'CCC':'P', 'CCG':'P', 'CCT':'P',
  'CAC':'H', 'CAT':'H', 'CAA':'Q', 'CAG':'Q',
  'CGA':'R', 'CGC':'R', 'CGG':'R', 'CGT':'R',
  'GTA':'V', 'GTC':'V', 'GTG':'V', 'GTT':'V',
  'GCA':'A', 'GCC':'A', 'GCG':'A', 'GCT':'A',
  'GAC':'D', 'GAT':'D', 'GAA':'E', 'GAG':'E',
  'GGA':'G', 'GGC':'G', 'GGG':'G', 'GGT':'G',
  'TCA':'S', 'TCC':'S', 'TCG':'S', 'TCT':'S',
  'TTC':'F', 'TTT':'F', 'TTA':'L', 'TTG':'L',
  'TAC':'Y', 'TAT':'Y', 'TAA':'_', 'TAG':'_',
  'TGC':'C', 'TGT':'C', 'TGA':'_', 'TGG':'W',
};

export function translateDNA(dna) {
  let protein = '';
  for (let i = 0; i < dna.length - 2; i += 3) {
    const codon = dna.substring(i, i+3).toUpperCase();
    protein += codonTable[codon] || 'X';
  }
  return protein;
}

export function getAminoAcidChange(refSeq, patientSeq, position) {
  // position is 1-based nucleotide index
  const codonStart = Math.floor((position - 1) / 3) * 3;
  const refCodon = refSeq.substring(codonStart, codonStart+3);
  const patCodon = patientSeq.substring(codonStart, codonStart+3);
  const refAA = codonTable[refCodon] || '?';
  const patAA = codonTable[patCodon] || '?';
  const aaPos = Math.floor((position - 1) / 3) + 1;
  return { refAA, patAA, aaPos, refCodon, patCodon };
}

export function getBaseContext(seq, position, flank = 5) {
  const start = Math.max(0, position - 1 - flank);
  const end = Math.min(seq.length, position + flank);
  return seq.substring(start, end);
}