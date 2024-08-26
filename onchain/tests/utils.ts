export const mulBps = (amount: bigint, bps: bigint) => {
  return (amount * bps) / 100_000_000n;
};
