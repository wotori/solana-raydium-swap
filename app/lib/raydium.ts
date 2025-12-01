import {
  CLMM_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import { PoolInfoLayout } from "@raydium-io/raydium-sdk-v2/lib/raydium/clmm/layout.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import type { WalletContextState } from "@solana/wallet-adapter-react";
import BN from "bn.js";

import { DEFAULT_CLUSTER } from "./raydium-config";

const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112",
);
const CLMM_POOL_ACCOUNT_SIZE = PoolInfoLayout.span ?? 1544;
const DEVNET_CLMM_PROGRAM_ID = DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID;

export type SolanaCluster = "devnet" | "mainnet";

export type ClmmPoolSnapshot = {
  id: string;
  mintA: { address: string; symbol?: string; decimals: number };
  mintB: { address: string; symbol?: string; decimals: number };
  price: number;
  tickCurrent: number;
};

export type ClmmSwapResult = {
  txId: string;
  amountOut: BN;
  amountOutUi: string;
  outputMint: PublicKey;
  outputSymbol?: string;
};

type RaydiumContext = {
  raydium: Raydium;
  ownerPubkey: PublicKey;
};

type WalletSignAll = NonNullable<
  WalletContextState["signAllTransactions"]
>;

type SignAllV0 = (
  transactions: VersionedTransaction[],
) => Promise<VersionedTransaction[]>;

export async function fetchClmmPoolSnapshot(
  connection: Connection,
  poolId: string,
): Promise<ClmmPoolSnapshot> {
  try {
    const poolPubkey = await assertClmmPoolAccount(connection, poolId);
    const raydium = await Raydium.load({
      connection,
      owner: Keypair.generate(),
      cluster: detectCluster(connection),
      disableLoadToken: true,
      disableFeatureCheck: true,
    });
    const snapshot = await raydium.clmm.getPoolInfoFromRpc(
      poolPubkey.toBase58(),
    );

    return {
      id: poolPubkey.toBase58(),
      mintA: {
        address: snapshot.poolInfo.mintA.address,
        symbol: snapshot.poolInfo.mintA.symbol,
        decimals: snapshot.poolInfo.mintA.decimals,
      },
      mintB: {
        address: snapshot.poolInfo.mintB.address,
        symbol: snapshot.poolInfo.mintB.symbol,
        decimals: snapshot.poolInfo.mintB.decimals,
      },
      price: snapshot.poolInfo.price,
      tickCurrent: snapshot.computePoolInfo?.tickCurrent ?? 0,
    };
  } catch (error) {
    console.error("Failed to fetch CLMM snapshot", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to load CLMM pool data.");
  }
}

export async function performClmmSwap(params: {
  connection: Connection;
  wallet: WalletContextState;
  poolId: string;
  tokenInMint: string;
  tokenOutMint: string;
  amount: string;
  slippage?: number;
}): Promise<ClmmSwapResult> {
  const { connection, wallet, poolId, tokenInMint, tokenOutMint } = params;
  const amountInput = params.amount;
  const slippage = params.slippage ?? 0.01;

  if (!wallet.publicKey) {
    throw new Error("Connect a Solana wallet to submit a swap.");
  }
  if (!wallet.sendTransaction) {
    throw new Error("Wallet does not expose sendTransaction.");
  }

  const inputMint = new PublicKey(tokenInMint);
  const outputMint = new PublicKey(tokenOutMint);

  const poolPubkey = await assertClmmPoolAccount(connection, poolId);
  const { raydium, ownerPubkey } = await createRaydiumContext(connection, wallet);

  await ensureAtaExists(connection, wallet, ownerPubkey, inputMint);
  await ensureAtaExists(connection, wallet, ownerPubkey, outputMint);

  await raydium.account.fetchWalletTokenAccounts({ forceUpdate: true });

  const poolIdStr = poolPubkey.toBase58();
  const snapshot = await raydium.clmm.getPoolInfoFromRpc(poolIdStr);
  const poolInfo = snapshot.poolInfo;
  const computeInfo = snapshot.computePoolInfo;

  const inputMintInfo =
    poolInfo.mintA.address === inputMint.toBase58()
      ? poolInfo.mintA
      : poolInfo.mintB.address === inputMint.toBase58()
        ? poolInfo.mintB
        : null;
  if (!inputMintInfo) {
    throw new Error("Input token is not part of the selected pool.");
  }

  const outputMintInfo =
    poolInfo.mintA.address === outputMint.toBase58()
      ? poolInfo.mintA
      : poolInfo.mintB.address === outputMint.toBase58()
        ? poolInfo.mintB
        : null;
  if (!outputMintInfo) {
    throw new Error("Output token is not part of the selected pool.");
  }

  const amountIn = uiAmountToBN(amountInput, inputMintInfo.decimals);
  if (amountIn.isZero() || amountIn.isNeg()) {
    throw new Error("Enter a positive amount to swap.");
  }

  const tickCache = snapshot.tickData?.[poolIdStr];
  if (!tickCache || !computeInfo) {
    throw new Error("Unable to load CLMM pool data.");
  }

  const epochInfo = await raydium.fetchEpochInfo();
  const computation = PoolUtils.computeAmountOut({
    poolInfo: computeInfo,
    tickArrayCache: tickCache,
    baseMint: inputMint,
    amountIn,
    slippage,
    epochInfo,
    catchLiquidityInsufficient: true,
  });

  if (!computation.allTrade) {
    throw new Error("Insufficient liquidity in the pool.");
  }

  const swapTx = await raydium.clmm.swap({
    poolInfo,
    poolKeys: snapshot.poolKeys,
    inputMint,
    amountIn,
    amountOutMin: computation.minAmountOut.amount,
    observationId: new PublicKey(snapshot.poolKeys.observationId),
    ownerInfo: {
      useSOLBalance: inputMint.equals(WSOL_MINT),
      feePayer: ownerPubkey,
    },
    remainingAccounts: computation.remainingAccounts,
  });

  const { txId } = await swapTx.execute({
    sendAndConfirm: true,
    skipPreflight: false,
  });

  return {
    txId,
    amountOut: computation.minAmountOut.amount,
    amountOutUi: formatTokenAmount(
      computation.minAmountOut.amount,
      outputMintInfo.decimals,
    ),
    outputMint,
    outputSymbol: outputMintInfo.symbol,
  };
}

function detectCluster(connection: Connection): SolanaCluster {
  const endpoint =
    (connection as Connection & { rpcEndpoint?: string }).rpcEndpoint ??
    (connection as { _rpcEndpoint?: string })._rpcEndpoint ??
    "";

  if (endpoint.includes("devnet")) return "devnet";
  if (endpoint.includes("mainnet") || endpoint.includes("solana.com")) {
    return "mainnet";
  }
  return DEFAULT_CLUSTER === "devnet" ? "devnet" : "mainnet";
}

async function createRaydiumContext(
  connection: Connection,
  wallet: WalletContextState,
): Promise<RaydiumContext> {
  if (!wallet.publicKey) {
    throw new Error("Wallet is not connected.");
  }

  const signAllTransactions = resolveSignAllTransactions(wallet);

  const raydium = await Raydium.load({
    connection,
    owner: wallet.publicKey,
    cluster: detectCluster(connection),
    disableLoadToken: true,
    disableFeatureCheck: true,
    signAllTransactions: signAllTransactions as WalletSignAll,
  });

  return { raydium, ownerPubkey: wallet.publicKey };
}

function resolveSignAllTransactions(wallet: WalletContextState): SignAllV0 {
  if (typeof wallet.signAllTransactions === "function") {
    return wallet.signAllTransactions.bind(wallet) as SignAllV0;
  }

  if (typeof wallet.signTransaction === "function") {
    const fallback: SignAllV0 = async (
      transactions: VersionedTransaction[],
    ) => {
      const signed: VersionedTransaction[] = [];
      for (const tx of transactions) {
        const signedTx = await wallet.signTransaction!(tx);
        signed.push(signedTx as VersionedTransaction);
      }
      return signed;
    };
    return fallback;
  }

  throw new Error("Wallet cannot sign transactions via signAllTransactions.");
}

async function ensureAtaExists(
  connection: Connection,
  wallet: WalletContextState,
  owner: PublicKey,
  mint: PublicKey,
) {
  const ata = getAssociatedTokenAddressSync(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  const info = await connection.getAccountInfo(ata);
  if (info) {
    return ata;
  }

  if (!wallet.sendTransaction) {
    throw new Error("Wallet cannot create an ATA without sendTransaction.");
  }

  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      owner,
      ata,
      owner,
      mint,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
    ),
  );
  tx.feePayer = owner;
  const signature = await wallet.sendTransaction(tx, connection);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    { signature, ...latest },
    "confirmed",
  );
  return ata;
}

function uiAmountToBN(input: string, decimals: number): BN {
  const sanitized = input.trim();
  if (!sanitized) return new BN(0);

  const negative = sanitized.startsWith("-");
  if (negative) {
    return new BN(0);
  }

  const [whole = "0", fraction = ""] = sanitized.split(".");
  const wholeDigits = whole.replace(/^0+(?=\d)/, "") || "0";
  const fractionDigits = fraction.substring(0, decimals).padEnd(decimals, "0");
  const combined = `${wholeDigits}${fractionDigits}`.replace(/^0+/, "") || "0";
  return new BN(combined);
}

async function assertClmmPoolAccount(
  connection: Connection,
  poolId: string,
): Promise<PublicKey> {
  const pubkey = new PublicKey(poolId);
  const info = await connection.getAccountInfo(pubkey);
  if (!info) {
    throw new Error("Pool not found on the selected cluster.");
  }

  const isClmmProgram =
    info.owner.equals(CLMM_PROGRAM_ID) ||
    (DEVNET_CLMM_PROGRAM_ID ? info.owner.equals(DEVNET_CLMM_PROGRAM_ID) : false);
  if (!isClmmProgram) {
    throw new Error(
      "This pool belongs to the Raydium AMM program. Provide a CLMM pool address instead.",
    );
  }

  if (info.data.length < CLMM_POOL_ACCOUNT_SIZE) {
    throw new Error(
      "Pool account size is too small for CLMM. Provide a valid CLMM poolId.",
    );
  }

  return pubkey;
}

export function formatTokenAmount(amount: BN, decimals: number): string {
  if (decimals === 0) return amount.toString();

  const raw = amount.toString().padStart(decimals + 1, "0");
  const whole = raw.slice(0, -decimals) || "0";
  const fraction = raw.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

