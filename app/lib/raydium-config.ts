export type SplPoolToken = "MI" | "TK22";

export type SplTokenPoolData = {
  poolId: string;
  tokenInMint: string;
  tokenOutMint: string;
  defaultAmount?: string;
};

export const DEFAULT_CLUSTER = "devnet";
export const DEFAULT_POOL_ID = "FXAXqgjNK6JVzVV2frumKTEuxC8hTEUhVTJTRhMMwLmM";
export const DEFAULT_BASE_MINT =
  "So11111111111111111111111111111111111111112";
export const DEFAULT_QUOTE_MINT =
  "USDCoctVLVnvTXBEuP9s8hntucdJokbo17RwHuNXemT";

export const TOKEN_ADDRESSES_MAP: Record<SplPoolToken, SplTokenPoolData> = {
  MI: {
    poolId: "2bfY4CBB5f3VAgooaMJVtJ1ZPSgZ3e8csMd6TfhwHafr",
    tokenInMint: "So11111111111111111111111111111111111111112",
    tokenOutMint: "GNvqQwigjPVDoazf1JnyEGNLReQguiu4U8zxReXqYEww",
    defaultAmount: "0.1",
  },
  TK22: {
    poolId: "127kKZUeEGeYdSkvYZzxvec84Jyu7pZznr1sVkk9pwpC",
    tokenInMint: "So11111111111111111111111111111111111111112",
    tokenOutMint: "3LPc47FriFJ1qLmn3E5cGz5RxNsbFuo5pePuYTeQ4peP",
    defaultAmount: "0.05",
  },
};

