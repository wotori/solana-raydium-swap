import { useMemo, type HTMLInputTypeAttribute } from "react";

import type { Route } from "./+types/home";
import {
  DEFAULT_BASE_MINT,
  DEFAULT_CLUSTER,
  DEFAULT_POOL_ID,
  DEFAULT_QUOTE_MINT,
  TOKEN_ADDRESSES_MAP,
  type SplPoolToken,
} from "../lib/raydium-config";
import {
  useClmmSwap,
  type SwapFormState,
} from "../features/clmm/useClmmSwap";

type FieldSchema = {
  name: keyof SwapFormState;
  label: string;
  placeholder: string;
  helper: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: "decimal" | "numeric";
};

const initialFormState: SwapFormState = {
  poolAddress: DEFAULT_POOL_ID,
  tokenInAddress: DEFAULT_BASE_MINT,
  tokenOutAddress: DEFAULT_QUOTE_MINT,
  amount: "0.05",
};

const fieldConfig: FieldSchema[] = [
  {
    name: "poolAddress",
    label: "Pool address",
    placeholder: "Eg. EoK9...a8mv",
    helper: "Raydium AMM pool public key that routes the swap.",
  },
  {
    name: "tokenInAddress",
    label: "Token in address",
    placeholder: "Eg. So111...1112",
    helper: "Mint account for the token you want to pay with.",
  },
  {
    name: "tokenOutAddress",
    label: "Token out address",
    placeholder: "Eg. EPjFW...Dt1v",
    helper: "Mint account for the token you want to receive.",
  },
  {
    name: "amount",
    label: "Amount to swap",
    placeholder: "0.00",
    helper: "Enter the amount of the input token to swap.",
    type: "number",
    inputMode: "decimal",
  },
];

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Raydium CLMM swap (devnet)" },
    {
      name: "description",
      content:
        "Raydium CLMM helper for devnet — configure pool, tokens and send swaps.",
    },
  ];
}

export default function Home() {
  const {
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
  } = useClmmSwap(initialFormState);

  const amountIsValid =
    !Number.isNaN(Number(form.amount)) && Number(form.amount) > 0;

  const presets = useMemo(() => Object.entries(TOKEN_ADDRESSES_MAP), []);

  const applyPreset = (token: SplPoolToken) => {
    const preset = TOKEN_ADDRESSES_MAP[token];
    updateForm({
      poolAddress: preset.poolId,
      tokenInAddress: preset.baseMint,
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 pb-16 pt-32 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-300">
            {DEFAULT_CLUSTER} · CLMM
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Raydium tools
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Stage a swap transaction
          </h1>
          <p className="text-base text-slate-300 md:text-lg">
            Provide the AMM pool and token mint addresses to preview the swap
            payload before wiring it into your wallet or backend.
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.7fr_1fr]">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-sky-500/20 backdrop-blur-md"
          >
            <div className="space-y-6">
              {fieldConfig.map(
                ({ name, label, placeholder, helper, type, inputMode }) => (
                  <label key={name} className="block space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium uppercase tracking-wide text-slate-300">
                        {label}
                      </span>
                      {name !== "amount" && (
                        <span className="font-mono text-[11px] text-slate-500">
                          32-byte key
                        </span>
                      )}
                    </div>
                    <input
                      id={`field-${name}`}
                      name={name}
                      value={form[name]}
                      onChange={handleChange(name)}
                      placeholder={placeholder}
                      type={type ?? "text"}
                      inputMode={inputMode}
                      autoComplete="off"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 font-mono text-sm tracking-wide text-white placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                    />
                    <p className="text-xs text-slate-400">{helper}</p>
                  </label>
                ),
              )}
            </div>

            <div className="mt-10 flex flex-col gap-4 md:flex-row md:items-center">
              <button
                type="submit"
                disabled={swapDisabled}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-sky-500 px-6 py-3 text-base font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-white/20 md:w-max"
              >
                {status === "submitting"
                  ? "Routing swap..."
                  : status === "success"
                    ? "Swap ready"
                    : "Swap now"}
              </button>
              <p
                className="text-sm text-slate-400"
                aria-live="polite"
                aria-atomic="true"
              >
                {statusHint}
              </p>
            </div>
            <div className="mt-4 text-xs text-slate-500">
              Need sample params? Tap a preset:
              <div className="mt-2 flex flex-wrap gap-2">
                {presets.map(([symbol]) => (
                  <button
                    type="button"
                    key={symbol}
                    onClick={() => applyPreset(symbol as SplPoolToken)}
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-200 hover:bg-white/10"
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            </div>
          </form>

          <aside className="rounded-3xl border border-white/10 bg-slate-900/40 p-6 backdrop-blur">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Preview
              </p>
              <h2 className="text-2xl font-semibold">Swap summary</h2>
              <p className="text-sm text-slate-400">
                Double-check the route information before sending it to your
                signer or automation.
              </p>
            </div>
            {snapshotError && (
              <p className="mt-4 text-xs text-amber-300">{snapshotError}</p>
            )}
            {snapshotLoading && (
              <p className="mt-4 text-xs text-slate-500">
                Loading pool data from Raydium...
              </p>
            )}
            <dl className="mt-8 space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">
                  Pool
                </dt>
                <dd className="font-mono text-sm text-slate-200">
                  {displayValue(form.poolAddress)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">
                  Token in
                </dt>
                <dd className="font-mono text-sm text-emerald-300">
                  {displayValue(form.tokenInAddress)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">
                  Token out
                </dt>
                <dd className="font-mono text-sm text-amber-200">
                  {displayValue(form.tokenOutAddress)}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">
                  Amount
                </dt>
                <dd className="text-lg font-semibold text-white">
                  {amountIsValid ? `${form.amount} units` : "—"}
                </dd>
              </div>
            </dl>
            <div className="mt-10 rounded-2xl border border-white/5 bg-white/5 p-4 text-xs text-slate-300">
              <p className="font-semibold text-slate-100">Next steps</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Fetch quotes via Raydium&apos;s API.</li>
                <li>Assemble the transaction &amp; sign with your wallet.</li>
                <li>Broadcast to Solana RPC once satisfied.</li>
              </ul>
            </div>
            {poolSnapshot && (
              <div className="mt-6 rounded-2xl border border-white/5 bg-slate-900/30 p-4 text-xs text-slate-400">
                <p className="text-sm font-semibold text-slate-100">
                  CLMM pool snapshot
                </p>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between gap-2">
                    <span>Mint A</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {truncateAddress(poolSnapshot.mintA.address)} ·{" "}
                      {poolSnapshot.mintA.symbol ?? "—"} ·{" "}
                      {poolSnapshot.mintA.decimals}d
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Mint B</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {truncateAddress(poolSnapshot.mintB.address)} ·{" "}
                      {poolSnapshot.mintB.symbol ?? "—"} ·{" "}
                      {poolSnapshot.mintB.decimals}d
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Price</span>
                    <span className="text-slate-200">
                      {poolSnapshot.price.toFixed(6)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Tick</span>
                    <span>{poolSnapshot.tickCurrent}</span>
                  </div>
                </div>
              </div>
            )}
            {lastSwap && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs text-emerald-200">
                <p className="text-sm font-semibold text-emerald-200">
                  Latest swap
                </p>
                <p className="mt-1">
                  Received:&nbsp;
                  <span className="font-semibold">{lastSwap.amountOut}</span>
                </p>
                <a
                  className="mt-2 inline-flex items-center text-[11px] uppercase tracking-widest text-emerald-300 hover:text-emerald-200"
                  href={explorerHref(lastSwap.signature)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in explorer
                </a>
              </div>
            )}
            <div className="mt-6 rounded-2xl border border-white/5 bg-white/5 p-4 text-xs text-slate-400">
              <p className="font-semibold text-slate-100">Devnet presets</p>
              <div className="mt-3 space-y-2">
                {presets.map(([symbol, data]) => (
                  <div key={symbol}>
                    <p className="text-[11px] uppercase tracking-widest text-slate-500">
                      {symbol}
                    </p>
                    <p className="font-mono text-[11px] text-slate-300">
                      Mint: {displayValue(data.baseMint)}
                    </p>
                    <p className="font-mono text-[11px] text-slate-300">
                      Pool: {displayValue(data.poolId)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function displayValue(value: string) {
  if (!value.trim()) {
    return "—";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-6)}`;
}

function truncateAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}...${value.slice(-6)}` : value;
}
