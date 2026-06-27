export function aggregate(
  responses: { rating: number; comment?: string }[],
): { count: number; average: number; distribution: [number, number, number, number, number]; comments: string[] } {
  const distribution: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  const comments: string[] = [];
  let sum = 0;
  for (const r of responses) {
    if (r.rating >= 1 && r.rating <= 5) {
      distribution[r.rating - 1]++;
      sum += r.rating;
    }
    const c = r.comment?.trim();
    if (c) comments.push(c);
  }
  const count = responses.length;
  const average = count ? Math.round((sum / count) * 10) / 10 : 0;
  return { count, average, distribution, comments };
}
