// api/blast.js

// Comprehensive mock BLAST database keyed by gene symbol (uppercase)
const MOCK_BLAST_DB = {
  TP53: [
    { accession: 'NC_000017.11',    description: 'Homo sapiens chromosome 17, GRCh38.p14 Primary Assembly',              identity: '100.00%', evalue: '0.0',     score: 1340, length: 19070, organism: 'Homo sapiens'       },
    { accession: 'NM_000546.6',     description: 'Homo sapiens tumor protein p53 (TP53), mRNA',                           identity: '99.82%',  evalue: '0.0',     score: 1280, length: 2629,  organism: 'Homo sapiens'       },
    { accession: 'XM_016942495.3',  description: 'Pan troglodytes tumor protein p53 (TP53), mRNA',                        identity: '98.52%',  evalue: '0.0',     score: 1190, length: 2655,  organism: 'Pan troglodytes'    },
    { accession: 'NM_011640.4',     description: 'Mus musculus transformation related protein 53 (Trp53), mRNA',          identity: '87.13%',  evalue: '1e-210',  score: 745,  length: 2846,  organism: 'Mus musculus'       },
    { accession: 'NM_030989.3',     description: 'Rattus norvegicus tumor protein p53 (Tp53), mRNA',                      identity: '86.70%',  evalue: '1e-205',  score: 728,  length: 2756,  organism: 'Rattus norvegicus'  },
    { accession: 'NM_001271820.1',  description: 'Canis lupus familiaris tumor protein p53 (TP53), mRNA',                 identity: '85.44%',  evalue: '1e-199',  score: 705,  length: 2748,  organism: 'Canis lupus'        },
    { accession: 'NM_001109578.2',  description: 'Danio rerio tumor protein p53 (tp53), mRNA',                            identity: '68.21%',  evalue: '1e-143',  score: 504,  length: 1824,  organism: 'Danio rerio'        },
    { accession: 'NM_001276698.1',  description: 'Gallus gallus tumor protein p53 (TP53), mRNA',                          identity: '67.90%',  evalue: '1e-140',  score: 495,  length: 1905,  organism: 'Gallus gallus'      },
    { accession: 'NM_001304366.1',  description: 'Xenopus tropicalis tumor protein p53 (tp53), mRNA',                     identity: '65.33%',  evalue: '1e-130',  score: 461,  length: 1851,  organism: 'Xenopus tropicalis' },
    { accession: 'XM_006252938.3',  description: 'Felis catus tumor protein p53 (TP53), mRNA',                            identity: '85.10%',  evalue: '1e-197',  score: 699,  length: 2730,  organism: 'Felis catus'        },
    { accession: 'NM_001291230.1',  description: 'Sus scrofa tumor protein p53 (TP53), mRNA',                             identity: '84.77%',  evalue: '1e-195',  score: 692,  length: 2741,  organism: 'Sus scrofa'         },
  ],
  BRCA1: [
    { accession: 'NM_007294.4',     description: 'Homo sapiens BRCA1 DNA repair associated (BRCA1), mRNA',               identity: '100.00%', evalue: '0.0',     score: 1320, length: 7088,  organism: 'Homo sapiens'       },
    { accession: 'XM_011525146.2',  description: 'Pan troglodytes BRCA1 DNA repair associated (BRCA1), mRNA',             identity: '98.51%',  evalue: '0.0',     score: 1265, length: 7112,  organism: 'Pan troglodytes'    },
    { accession: 'NM_009764.4',     description: 'Mus musculus breast cancer 1, early onset (Brca1), mRNA',               identity: '59.22%',  evalue: '1e-112',  score: 398,  length: 8894,  organism: 'Mus musculus'       },
    { accession: 'NM_012514.2',     description: 'Rattus norvegicus BRCA1 DNA repair associated (Brca1), mRNA',           identity: '58.90%',  evalue: '1e-110',  score: 390,  length: 8744,  organism: 'Rattus norvegicus'  },
    { accession: 'XM_005623563.3',  description: 'Canis lupus familiaris BRCA1 DNA repair associated (BRCA1), mRNA',      identity: '73.44%',  evalue: '1e-165',  score: 585,  length: 6790,  organism: 'Canis lupus'        },
    { accession: 'NM_001030185.3',  description: 'Gallus gallus BRCA1 (BRCA1), mRNA',                                     identity: '51.12%',  evalue: '1e-88',   score: 313,  length: 7341,  organism: 'Gallus gallus'      },
    { accession: 'XM_006264074.3',  description: 'Felis catus BRCA1 DNA repair associated (BRCA1), mRNA',                 identity: '73.21%',  evalue: '1e-162',  score: 575,  length: 6801,  organism: 'Felis catus'        },
    { accession: 'NM_001109609.2',  description: 'Danio rerio breast cancer 1 (brca1), mRNA',                             identity: '47.88%',  evalue: '1e-74',   score: 265,  length: 6912,  organism: 'Danio rerio'        },
  ],
  DMD: [
    { accession: 'NM_004006.3',     description: 'Homo sapiens dystrophin (DMD), transcript variant Dp427m, mRNA',        identity: '100.00%', evalue: '0.0',     score: 1410, length: 14117, organism: 'Homo sapiens'       },
    { accession: 'NM_007868.6',     description: 'Mus musculus dystrophin (Dmd), mRNA',                                   identity: '88.55%',  evalue: '0.0',     score: 1122, length: 14114, organism: 'Mus musculus'       },
    { accession: 'NM_012516.2',     description: 'Rattus norvegicus dystrophin (Dmd), mRNA',                              identity: '88.22%',  evalue: '0.0',     score: 1115, length: 14010, organism: 'Rattus norvegicus'  },
    { accession: 'XM_005622580.3',  description: 'Canis lupus familiaris dystrophin (DMD), mRNA',                         identity: '90.11%',  evalue: '0.0',     score: 1198, length: 14055, organism: 'Canis lupus'        },
    { accession: 'NM_001109488.2',  description: 'Danio rerio dystrophin (dmd), mRNA',                                    identity: '71.44%',  evalue: '1e-156',  score: 555,  length: 14001, organism: 'Danio rerio'        },
    { accession: 'XM_015096706.2',  description: 'Pan troglodytes dystrophin (DMD), mRNA',                                identity: '99.12%',  evalue: '0.0',     score: 1395, length: 14102, organism: 'Pan troglodytes'    },
  ],
  DEFAULT: [
    { accession: 'XM_000001.1',     description: 'Homo sapiens hypothetical protein, mRNA',                               identity: '100.00%', evalue: '0.0',     score: 980,  length: 1200,  organism: 'Homo sapiens'       },
    { accession: 'XM_000002.1',     description: 'Pan troglodytes predicted homolog, mRNA',                               identity: '96.40%',  evalue: '1e-210',  score: 745,  length: 1215,  organism: 'Pan troglodytes'    },
    { accession: 'XM_000003.1',     description: 'Mus musculus homologous protein, mRNA',                                 identity: '85.10%',  evalue: '1e-185',  score: 655,  length: 1301,  organism: 'Mus musculus'       },
    { accession: 'XM_000004.1',     description: 'Rattus norvegicus predicted protein, mRNA',                             identity: '84.70%',  evalue: '1e-181',  score: 642,  length: 1298,  organism: 'Rattus norvegicus'  },
    { accession: 'XM_000005.1',     description: 'Canis lupus familiaris predicted protein, mRNA',                        identity: '82.30%',  evalue: '1e-175',  score: 620,  length: 1290,  organism: 'Canis lupus'        },
    { accession: 'XM_000006.1',     description: 'Danio rerio predicted homolog, mRNA',                                   identity: '67.20%',  evalue: '1e-130',  score: 462,  length: 1345,  organism: 'Danio rerio'        },
    { accession: 'XM_000007.1',     description: 'Gallus gallus predicted protein, mRNA',                                 identity: '66.80%',  evalue: '1e-128',  score: 455,  length: 1322,  organism: 'Gallus gallus'      },
    { accession: 'XM_000008.1',     description: 'Sus scrofa predicted homolog, mRNA',                                    identity: '81.90%',  evalue: '1e-172',  score: 611,  length: 1288,  organism: 'Sus scrofa'         },
  ],
};

/**
 * Simulate a BLAST search with realistic-looking hits.
 * @param {string} sequence - DNA sequence (FASTA or raw)
 * @param {string|null} gene - Gene symbol hint (from analysis)
 * @returns {Promise<Array>} Array of hit objects
 */
export async function runBlast(sequence, gene = null) {
  if (!sequence || sequence.trim().length < 20) {
    throw new Error('Sequence too short for BLAST search (minimum 20 bp).');
  }

  // Simulate network delay
  await new Promise(r => setTimeout(r, 1800 + Math.random() * 1200));

  const key = gene ? gene.toUpperCase() : null;
  const hits = (key && MOCK_BLAST_DB[key]) ? MOCK_BLAST_DB[key] : MOCK_BLAST_DB.DEFAULT;

  // Shuffle slightly and return top 10
  return hits.slice(0, 10).map(h => ({ ...h }));
}

/**
 * Real NCBI BLAST submission scaffold (browser-safe polling).
 * NOTE: NCBI's public BLAST endpoint does not set CORS headers that allow
 * direct browser fetch. Use this via a proxy / backend in production.
 *
 * Kept here for reference – not called by default.
 */
export async function runBlastReal(sequence) {
  const BASE = 'https://blast.ncbi.nlm.nih.gov/blast/Blast.cgi';

  // 1. Submit
  const putBody = new URLSearchParams({
    CMD: 'Put',
    PROGRAM: 'blastn',
    DATABASE: 'nt',
    QUERY: sequence,
    MEGABLAST: 'on',
    HITLIST_SIZE: '10',
    FORMAT_TYPE: 'JSON2',
  });
  const putResp = await fetch(BASE, { method: 'POST', body: putBody });
  const putText = await putResp.text();
  const ridMatch = putText.match(/RID = (\w+)/);
  if (!ridMatch) throw new Error('Could not retrieve BLAST RID');
  const rid = ridMatch[1];

  // 2. Poll until READY
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 5000));
    const infoResp = await fetch(`${BASE}?CMD=Get&FORMAT_OBJECT=SearchInfo&RID=${rid}`);
    const infoText = await infoResp.text();
    if (infoText.includes('Status=READY')) break;
    if (infoText.includes('Status=FAILED')) throw new Error('BLAST job failed');
  }

  // 3. Fetch results
  const resultResp = await fetch(`${BASE}?CMD=Get&FORMAT_TYPE=JSON2&RID=${rid}`);
  const data = await resultResp.json();
  const hits = data?.BlastOutput2?.[0]?.report?.results?.search?.hits || [];
  return hits.map(h => ({
    accession:   h.description?.[0]?.accession || 'N/A',
    description: h.description?.[0]?.title || 'N/A',
    identity:    ((h.hsps?.[0]?.identity / h.hsps?.[0]?.align_len) * 100).toFixed(2) + '%',
    evalue:      h.hsps?.[0]?.evalue?.toString() || 'N/A',
    score:       h.hsps?.[0]?.bit_score || 'N/A',
    length:      h.len || 'N/A',
  }));
}