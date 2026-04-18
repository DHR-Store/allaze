// api/alphamissense.js
import axios from 'axios';

const chromMap = {
  BRCA1: '17', BRCA2: '13', TP53: '17',
  DMD: 'X', Dmd: 'X', CFTR: '7', HBB: '11',
};

// Curated mock scores for common genes (aaPos → score)
const mockScores = {
  TP53: {
    12:  0.872,  175: 0.998,  179: 0.990,
    220: 0.985,  245: 0.994,  248: 0.995,
    249: 0.993,  273: 0.989,  282: 0.987,
    13:  0.034,  72:  0.310,  covert: 0.250,
  },
  BRCA1: {
    1699: 0.980, 1775: 0.975, 61: 0.965,
    1814: 0.071, 871: 0.089,
  },
};

function classify(score) {
  if (typeof score !== 'number') return 'Not Available';
  if (score > 0.564) return 'Likely Pathogenic';
  if (score < 0.340) return 'Likely Benign';
  return 'Ambiguous';
}

/**
 * Get AlphaMissense pathogenicity score for a single variant.
 * Works for both nucleotide position (SNP) and amino-acid position (protein mode).
 */
export async function getAlphamissenseScore(gene, pos, ref, alt, organism, aaPos) {
  const isHuman =
    organism &&
    (organism.toLowerCase().includes('homo sapiens') ||
     organism.toLowerCase().includes('homo'));

  if (!isHuman) {
    return {
      score: 'N/A',
      classification: 'Not applicable (non-human)',
      clinvar: 'N/A',
      cadd: 'N/A',
    };
  }

  // Use mock scores keyed by aaPos (works for both nucleotide and protein modes)
  const geneKey = gene?.toUpperCase();
  if (mockScores[geneKey] && aaPos && mockScores[geneKey][aaPos] !== undefined) {
    const score = mockScores[geneKey][aaPos];
    return {
      score,
      classification: classify(score),
      clinvar: aaPos === 175 ? 'Pathogenic' : aaPos === 1699 ? 'Pathogenic' : 'Not Available',
      cadd: 'N/A',
    };
  }

  // Real API attempt (requires valid HGVS genomic coords — may fail for arbitrary positions)
  const chrom = chromMap[gene] || chromMap[geneKey] || '?';
  if (chrom === '?') {
    return { score: 'N/A', classification: 'Chromosome unknown', clinvar: 'N/A', cadd: 'N/A' };
  }
  const hgvs = `chr${chrom}:g.${pos}${ref}>${alt}`;
  try {
    const resp = await axios.get(
      `https://myvariant.info/v1/variant/${encodeURIComponent(hgvs)}?fields=dbnsfp.alphamissense,clinvar,cadd`,
      { timeout: 5000 }
    );
    const data = resp.data;
    const score   = data?.dbnsfp?.alphamissense?.score;
    const clinvar = data?.clinvar?.rcv?.[0]?.clinical_significance || 'Not Found';
    const cadd    = data?.cadd?.phred || 'No Data';
    return {
      score:          score !== undefined ? score : 'N/A',
      classification: score !== undefined ? classify(score) : 'Not Available',
      clinvar:        clinvar !== 'Not Found' ? clinvar : 'Not Available',
      cadd:           cadd !== 'No Data' ? cadd : 'Not Available',
    };
  } catch {
    return { score: 'N/A', classification: 'API Error', clinvar: 'Not Available', cadd: 'Not Available' };
  }
}

/**
 * Enrich an array of variants with pathogenicity data.
 * Processes in PARALLEL (much faster than sequential for large lists).
 *
 * @param {Array}  variants    - array of variant objects
 * @param {number} maxVariants - cap to avoid overloading APIs (default 50)
 */
export async function analyzeMutations(variants, maxVariants = 50) {
  const toProcess = variants.slice(0, maxVariants);

  const results = await Promise.all(
    toProcess.map(async (v) => {
      try {
        const am = await getAlphamissenseScore(
          v.gene,
          v.position ?? v.aaPos,   // protein-mode uses aaPos as position
          v.reference_allele ?? v.refAA,
          v.alternate_allele ?? v.patAA,
          v.organism,
          v.aaPos
        );
        return {
          ...v,
          am_score:       am.score,
          classification: am.classification,
          clinvar:        am.clinvar,
          cadd:           am.cadd,
        };
      } catch {
        return {
          ...v,
          am_score:       'N/A',
          classification: 'Error',
          clinvar:        'N/A',
          cadd:           'N/A',
        };
      }
    })
  );

  return results;
}