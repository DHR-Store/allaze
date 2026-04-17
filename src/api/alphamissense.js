import axios from 'axios';

const chromMap = { BRCA1: '17', BRCA2: '13', TP53: '17' };

function classify(score) {
  if (score > 0.564) return 'Likely Pathogenic';
  if (score < 0.340) return 'Likely Benign';
  return 'Ambiguous';
}

export async function getAlphamissenseScore(gene, pos, ref, alt) {
  const chrom = chromMap[gene] || '17';
  const hgvs = `chr${chrom}:g.${pos}${ref}>${alt}`;
  try {
    const resp = await axios.get(`https://myvariant.info/v1/variant/${hgvs}?fields=dbnsfp.alphamissense,clinvar,cadd`);
    const data = resp.data;
    const score = data?.dbnsfp?.alphamissense?.score;
    const clinvar = data?.clinvar?.rcv?.[0]?.clinical_significance || 'Not Found';
    const cadd = data?.cadd?.phred || 'No Data';
    return {
      score: score !== undefined ? score : 0,
      classification: score !== undefined ? classify(score) : 'Not Found',
      clinvar,
      cadd
    };
  } catch {
    return { score: 0, classification: 'API Error', clinvar: 'Error', cadd: 'Error' };
  }
}

export async function analyzeMutations(variants) {
  const results = [];
  for (let v of variants) {
    const am = await getAlphamissenseScore(v.gene, v.position, v.reference_allele, v.alternate_allele);
    results.push({
      ...v,
      am_score: am.score,
      classification: am.classification,
      clinvar: am.clinvar,
      cadd: am.cadd
    });
  }
  return results;
}