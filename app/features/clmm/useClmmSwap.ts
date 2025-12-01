import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";

import { DEFAULT_CLUSTER } from "../../lib/raydium-config";
import {
  fetchClmmPoolSnapshot,
  performClmmSwap,
  type ClmmPoolSnapshot,
} from "../../lib/raydium";

export type SwapFormState = {
  poolAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amount: string;
};

type LastSwapDetails = {
  signature: string;
  amountOut: string;
};

type UseClmmSwapResult = {
  form: SwapFormState;
  handleChange: (
    name: keyof SwapFormState,
  ) => (event: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  updateForm: (updates: Partial<SwapFormState>) => void;
  status: "idle" | "submitting" | "success";
  swapDisabled: boolean;
  statusHint: string;
  poolSnapshot: ClmmPoolSnapshot | null;
  snapshotLoading: boolean;
  snapshotError: string | null;
  lastSwap: LastSwapDetails | null;
  explorerHref: (signature: string) => string;
};

export function useClmmSwap(initialState: SwapFormState): UseClmmSwapResult {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [form, setForm] = useState<SwapFormState>(initialState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [poolSnapshot, setPoolSnapshot] = useState<ClmmPoolSnapshot | null>(
    null,
  );
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [lastSwap, setLastSwap] = useState<LastSwapDetails | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!isValidAddress(form.poolAddress)) {
      setPoolSnapshot(null);
      setSnapshotError("Enter a valid CLMM pool address.");
      return;
    }

    setSnapshotLoading(true);
    setSnapshotError(null);
    fetchClmmPoolSnapshot(connection, form.poolAddress)
      .then((snapshot) => {
        if (cancelled) return;
        setPoolSnapshot(snapshot);
      })
      .catch((error) => {
        if (cancelled) return;
        setPoolSnapshot(null);
        setSnapshotError(
          error instanceof Error
            ? error.message
            : "Unable to load CLMM pool data.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setSnapshotLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [connection, form.poolAddress]);

  const parsedAmount = Number(form.amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const addressesAreValid =
    isValidAddress(form.poolAddress) &&
    isValidAddress(form.tokenInAddress) &&
    isValidAddress(form.tokenOutAddress);
  const walletReady = Boolean(wallet.connected && wallet.publicKey);

  const swapDisabled =
    status === "submitting" ||
    !amountIsValid ||
    !addressesAreValid ||
    !walletReady;

  const handleChange =
    (name: keyof SwapFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setForm((prev) => ({ ...prev, [name]: value }));
      if (status !== "idle") {
        setStatus("idle");
      }
      setStatusMessage(null);
    };

  const updateForm = (updates: Partial<SwapFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    if (status !== "idle") {
      setStatus("idle");
    }
    setStatusMessage(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (swapDisabled) {
      setStatusMessage(
        walletReady
          ? "Fill every field with valid values to continue."
          : "Connect a wallet before submitting a swap.",
      );
      return;
    }

    setStatus("submitting");
    setLastSwap(null);
    setStatusMessage("Submitting swap via Raydium CLMM...");

    try {
      const result = await performClmmSwap({
        connection,
        wallet,
        poolId: form.poolAddress,
        tokenInMint: form.tokenInAddress,
        tokenOutMint: form.tokenOutAddress,
        amount: form.amount,
        slippage: 0.01,
      });

      setStatus("success");
      setStatusMessage("Swap submitted successfully — see details below.");
      setLastSwap({
        signature: result.txId,
        amountOut: `${result.amountOutUi} ${result.outputSymbol ?? ""}`.trim(),
      });
    } catch (error) {
      console.error(error);
      setStatus("idle");
      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Swap failed — please try again.",
      );
    }
  };

  const explorerHref = useCallback(
    (signature: string) =>
      `https://explorer.solana.com/tx/${signature}${
        DEFAULT_CLUSTER === "devnet" ? "?cluster=devnet" : ""
      }`,
    [],
  );

  const statusHint = useMemo(() => {
    if (statusMessage) {
      return statusMessage;
    }

    if (!walletReady) {
      return "Connect a devnet wallet using the top-right button.";
    }

    if (snapshotError) {
      return snapshotError;
    }

    return "No transaction leaves the browser without your explicit approval.";
  }, [snapshotError, statusMessage, walletReady]);

  return {
    form,
    handleChange,
    handleSubmit,
    updateForm,
    status,
    swapDisabled,
    statusHint,
    poolSnapshot,
    snapshotLoading,
    snapshotError,
    lastSwap,
    explorerHref,
  };
}

export function isValidAddress(value: string) {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

