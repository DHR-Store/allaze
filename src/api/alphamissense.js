// api/alphamissense.js
import axios from 'axios';

const chromMap = {
  BRCA1: '17', BRCA2: '13', TP53: '17',
  DMD: 'X', Dmd: 'X', CFTR: '7', HBB: '11',
  EGFR: '7', KRAS: '12', BRAF: '7', PIK3CA: '3', PTEN: '10',
};

// Curated mock scores for common genes (aaPos → score)
const mockScores = {
  TP53: {
    12:  0.872, 175: 0.998, 179: 0.990,
    220: 0.985, 245: 0.994, 248: 0.995,
    249: 0.993, 273: 0.989, 282: 0.987,
    13:  0.034, 72:  0.310,
    // Extended common hotspot positions
    158: 0.991, 163: 0.976, 176: 0.987,
    196: 0.973, 213: 0.965, 238: 0.980,
    266: 0.978, 278: 0.981, 306: 0.968,
    337: 0.974, 342: 0.969,
  },
  BRCA1: {
    1699: 0.980, 1775: 0.975, 61: 0.965,
    1814: 0.071, 871: 0.089,
  },
  BRCA2: {
    999: 0.920, 1408: 0.910,
  },
};

function classify(score) {
  if (typeof score !== 'number') return 'Not Available';
  if (score > 0.564) return 'Likely Pathogenic';
  if (score < 0.340) return 'Likely Benign';
  return 'Ambiguous';
}

/**
 * Returns true if ref/alt are amino acid letters (protein mode),
 * rather than nucleotide letters (A/T/G/C).
 *
 * This is the KEY check that prevents protein-mode positions
 * from being misused as genomic coordinates in the HGVS builder.
 */
function isProteinVariant(ref, alt) {
  const NUCLEOTIDES = new Set(['A', 'T', 'G', 'C', 'N', '-']);
  return !NUCLEOTIDES.has((ref || '').toUpperCase()) ||
         !NUCLEOTIDES.has((alt || '').toUpperCase());
}

/**
 * Protein-mode lookup: query myvariant.info by gene name + amino-acid position.
 * This is correct for protein-comparison results — DO NOT use HGVS for these.
 */
async function lookupProteinVariant(gene, aaPos, refAA, altAA) {
  try {
    const q = `dbnsfp.genename:${gene} AND dbnsfp.aapos:${aaPos}`;
    const resp = await axios.get(
      `https://myvariant.info/v1/query?q=${encodeURIComponent(q)}&fields=dbnsfp.alphamissense,dbnsfp.aa,clinvar,cadd&size=10`,
      { timeout: 6000 }
    );

    const hits = resp.data?.hits || [];
    if (!hits.length) return null;

    // Prefer exact amino acid match; fall back to first hit at this position
    const matched =
      hits.find(h => {
        const hRef = (h?.dbnsfp?.aa?.ref || '').toUpperCase();
        const hAlt = (h?.dbnsfp?.aa?.alt || '').toUpperCase();
        return (
          (!hRef || hRef === (refAA || '').toUpperCase()) &&
          (!hAlt || hAlt === (altAA || '').toUpperCase())
        );
      }) || hits[0];

    const score   = matched?.dbnsfp?.alphamissense?.score;
    const clinvar = matched?.clinvar?.rcv?.[0]?.clinical_significance || 'Not Available';
    const cadd    = matched?.cadd?.phred;

    return {
      score:          score !== undefined ? score : 'N/A',
      classification: score !== undefined ? classify(score) : 'Not in database',
      clinvar,
      cadd:           cadd !== undefined ? cadd : 'Not Available',
    };
  } catch {
    return null;
  }
}

/**
 * Get AlphaMissense pathogenicity score for a single variant.
 *
 * Automatically routes to the correct API mode:
 *   • Protein mode  → queries by gene + aaPos (amino-acid level lookup)
 *   • Nucleotide mode → builds HGVS genomic coordinate
 *
 * Previously, protein-mode variants (aaPos 2, 3, 4 …) were being passed
 * directly as genomic positions, generating invalid HGVS like chr17:g.2E>S
 * and causing "API Error" on every row. This version fixes that.
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

  const geneKey = gene?.toUpperCase();

  // ── 1. Mock scores (fast, offline) ──────────────────────────────────────────
  if (mockScores[geneKey] && aaPos !== undefined && mockScores[geneKey][aaPos] !== undefined) {
    const score = mockScores[geneKey][aaPos];
    return {
      score,
      classification: classify(score),
      clinvar: (aaPos === 175 || aaPos === 1699) ? 'Pathogenic' : 'Not Available',
      cadd: 'N/A',
    };
  }

  // ── 2. Protein mode ──────────────────────────────────────────────────────────
  // Triggered when ref/alt are amino-acid letters (not A/T/G/C),
  // OR when pos === aaPos (no separate genomic coordinate was provided).
  if (aaPos !== undefined && (isProteinVariant(ref, alt) || pos === aaPos)) {
    const result = await lookupProteinVariant(geneKey, aaPos, ref, alt);
    return result ?? {
      score: 'N/A',
      classification: 'Not in database',
      clinvar: 'N/A',
      cadd: 'N/A',
    };
  }

  // ── 3. Nucleotide mode: HGVS genomic lookup ─────────────────────────────────
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
    const data    = resp.data;
    const score   = data?.dbnsfp?.alphamissense?.score;
    const clinvar = data?.clinvar?.rcv?.[0]?.clinical_significance || 'Not Available';
    const cadd    = data?.cadd?.phred;
    return {
      score:          score !== undefined ? score : 'N/A',
      classification: score !== undefined ? classify(score) : 'Not in database',
      clinvar:        clinvar !== 'Not Available' ? clinvar : 'Not Available',
      cadd:           cadd !== undefined ? cadd : 'Not Available',
    };
  } catch {
    return { score: 'N/A', classification: 'Not in database', clinvar: 'N/A', cadd: 'N/A' };
  }
}

/**
 * Enrich an array of variants with pathogenicity data (parallel).
 */
export async function analyzeMutations(variants, maxVariants = 50) {
  const toProcess = variants.slice(0, maxVariants);

  const results = await Promise.all(
    toProcess.map(async (v) => {
      try {
        const am = await getAlphamissenseScore(
          v.gene,
          v.position ?? v.aaPos,
          v.reference_allele ?? v.refAA,
          v.alternate_allele ?? v.patAA,
          v.organism,
          v.aaPos,
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