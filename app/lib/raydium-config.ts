export type SplPoolToken = "MI" | "TEST";

export type SplTokenPoolData = {
  baseMint: string;
  poolId: string;
};

export const DEFAULT_CLUSTER = "devnet";
export const DEFAULT_POOL_ID = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
export const DEFAULT_BASE_MINT =
  "So11111111111111111111111111111111111111112";
export const DEFAULT_QUOTE_MINT =
  "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT";

export const TOKEN_ADDRESSES_MAP: Record<SplPoolToken, SplTokenPoolData> = {
  MI: {
    baseMint: "GNvqQwigjPVDoazf1JnyEGNLReQguiu4U8zxReXqYEww",
    poolId: "2bfY4CBB5f3VAgooaMJVtJ1ZPSgZ3e8csMd6TfhwHafr",
  },
  TEST: {
    baseMint: "EpEnu5MZYUBNrbwQJCJZEGGTPitxQ6QsGpu9TDNhxGie",
    poolId: "13NHhjhJkmxVRN4t3rjfshyEeFK3r7HVHCo3LLisADcm",
  },
};

