/**
 * .what = compute average of numeric values
 * .why  = pure transformer for aggregate computation
 */
export const computeAverage = (input: { values: number[] }): number => {
  if (input.values.length === 0) return 0;
  const sum = input.values.reduce((acc, val) => acc + val, 0);
  return sum / input.values.length;
};
