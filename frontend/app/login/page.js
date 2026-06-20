"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserProvider } from "ethers";
import { SiweMessage } from "siwe";
import { api } from "@/lib/api";
import { useWalletStore } from "@/lib/store";

const STEPS = {
  idle: null,
  connecting: "Connecting wallet...",
  signing: "Sign the message in MetaMask...",
  verifying: "Verifying signature...",
  done: "Authenticated!",
};

export default function LoginPage() {
  const router = useRouter();
  const { address, token, setWallet, setToken } = useWalletStore();
  const [step, setStep] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (token) router.push("/dashboard");
  }, [token, router]);

  async function handleConnect() {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install it.");
      return;
    }

    try {
      setStep("connecting");
      const provider = new BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setWallet(addr, Number(network.chainId));

      const { nonce } = await api("/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ walletAddress: addr }),
      });

      setStep("signing");
      const message = new SiweMessage({
        domain: window.location.host,
        address: addr,
        statement: "Sign in to NFT Airdrop Platform",
        uri: window.location.origin,
        version: "1",
        chainId: Number(network.chainId),
        nonce,
      });

      const prepared = message.prepareMessage();
      const signature = await signer.signMessage(prepared);

      setStep("verifying");
      const { token: jwt } = await api("/auth/verify", {
        method: "POST",
        body: JSON.stringify({ message: prepared, signature }),
      });

      localStorage.setItem("jwt", jwt);
      setToken(jwt);
      setStep("done");
    } catch (err) {
      setError(err?.message || "Something went wrong");
      setStep("idle");
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-500/20">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Web3 Sign-In</h1>
          <p className="mt-2 text-sm text-gray-400">
            Connect your wallet and sign a message to authenticate — no password needed.
          </p>
        </div>

        <div className="mb-6 space-y-3 text-sm text-gray-400">
          {[
            { label: "1. Connect wallet", active: step === "connecting" },
            { label: "2. Sign challenge message", active: step === "signing" },
            { label: "3. Backend verifies signature", active: step === "verifying" },
            { label: "4. Receive JWT session token", active: step === "done" },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all ${
                active ? "bg-brand-500/20 text-brand-200" : "bg-white/5"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  active ? "animate-pulse bg-brand-400" : "bg-white/20"
                }`}
              />
              {label}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {step !== "idle" && STEPS[step] && (
          <div className="mb-4 rounded-lg bg-brand-500/10 border border-brand-500/30 px-4 py-3 text-sm text-brand-200 text-center">
            {STEPS[step]}
          </div>
        )}

        <button
          type="button"
          onClick={handleConnect}
          disabled={step !== "idle"}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {step === "idle" ? "Connect Wallet & Sign In" : "Signing in..."}
        </button>

        {address && (
          <p className="mt-3 text-center text-xs text-gray-500">
            Connected: {address.slice(0, 6)}…{address.slice(-4)}
          </p>
        )}
      </div>
    </div>
  );
}
