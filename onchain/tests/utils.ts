export const mulBps = (amount: bigint, bps: bigint) => {
  return (amount * bps) / 100000n;
};

export const mulFraction = (amount: bigint, bps: bigint) => {
  return (amount * bps) / 1_000_000_000_000n;
};
