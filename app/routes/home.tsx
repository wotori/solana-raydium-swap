import {
  useState,
  type ChangeEvent,
  type FormEvent,
  type HTMLInputTypeAttribute,
} from "react";

import type { Route } from "./+types/home";

type SwapFormState = {
  poolAddress: string;
  tokenInAddress: string;
  tokenOutAddress: string;
  amount: string;
};

type FieldSchema = {
  name: keyof SwapFormState;
  label: string;
  placeholder: string;
  helper: string;
  type?: HTMLInputTypeAttribute;
  inputMode?: "decimal" | "numeric";
};

const initialFormState: SwapFormState = {
  poolAddress: "",
  tokenInAddress: "",
  tokenOutAddress: "",
  amount: "",
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
    { title: "Raydium swap helper" },
    {
      name: "description",
      content:
        "Quickly stage a Raydium swap by entering pool + token addresses.",
    },
  ];
}

export default function Home() {
  const [form, setForm] = useState<SwapFormState>(initialFormState);
  const [status, setStatus] = useState<"idle" | "submitting" | "success">(
    "idle",
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const parsedAmount = Number(form.amount);
  const amountIsValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const addressesAreValid =
    form.poolAddress.trim() &&
    form.tokenInAddress.trim() &&
    form.tokenOutAddress.trim();

  const swapDisabled =
    status === "submitting" || !amountIsValid || !addressesAreValid;

  const handleChange =
    (name: keyof SwapFormState) => (event: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [name]: event.target.value }));
      if (status !== "idle") {
        setStatus("idle");
      }
      setStatusMessage(null);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (swapDisabled) {
      setStatusMessage("Fill out every field with a valid value to continue.");
      return;
    }

    setStatus("submitting");
    setStatusMessage("Estimating route with Raydium...");

    await new Promise((resolve) => setTimeout(resolve, 900));

    setStatus("success");
    setStatusMessage(
      "Swap request staged. Connect your Solana wallet to broadcast the transaction.",
    );
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-6 pb-16 pt-32 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <header className="space-y-4 text-center">
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
                {statusMessage ??
                  "No transactions are sent from the browser — this is a dry-run preview."}
              </p>
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
