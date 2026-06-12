const CHUNK_SIZE = 500;
const OVERLAP = 80;

function tokenEstimate(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(text: string): string[] {
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  const paragraphs = cleaned.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (tokenEstimate(combined) > CHUNK_SIZE && current) {
      chunks.push(current.trim());
      const words = current.split(' ');
      const overlapWords = words.slice(-OVERLAP).join(' ');
      current = `${overlapWords}\n\n${para}`;
    } else {
      current = combined;
    }
  }

  if (current.trim()) chunks.push(current.trim());

  return chunks.filter((c) => c.length > 50);
}
