export function parseFasta(content) {
  const lines = content.trim().split('\n');
  let id = 'Unknown';
  const sequences = [];
  let currentSeq = '';
  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('>')) {
      if (currentSeq) sequences.push(currentSeq);
      id = line.substring(1).split(' ')[0];
      currentSeq = '';
    } else {
      currentSeq += line.replace(/\s/g, '');
    }
  }
  if (currentSeq) sequences.push(currentSeq);
  return { id, sequences };
}