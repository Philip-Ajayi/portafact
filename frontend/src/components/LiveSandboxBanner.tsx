"use client";

import React, { useState } from "react";
import { PlayCircle, CheckCircle2, Wallet, Droplets, Loader2 } from "lucide-react";
import { formatAddress } from "../lib/substrate";

interface BannerProps {
  isSandbox: boolean;
  setIsSandbox: (v: boolean) => void;
  onReset: () => void;
  walletAddress: string | null;
  onConnectWallet: () => Promise<void>;
  onClaimFaucet: () => Promise<void>;
  isClaimingFaucet: boolean;
}

export default function LiveSandboxBanner({
  isSandbox,
  setIsSandbox,
  onReset,
  walletAddress,
  onConnectWallet,
  onClaimFaucet,
  isClaimingFaucet,
}: BannerProps) {
  return (
    <div className="bg-indigo-950/70 border-b border-indigo-500/30 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
        </span>
        <p className="text-sm font-medium text-indigo-200">
          <strong className="text-white">Portaldot Hackathon Evaluation Engine:</strong> Complete testnet & instant in-browser interactive simulator.
        </p>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {/* Toggle Mode Button */}
        <button
          onClick={() => setIsSandbox(!isSandbox)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
            isSandbox
              ? "bg-amber-600/30 text-amber-200 border border-amber-500/50 hover:bg-amber-600/40"
              : "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
          }`}
        >
          {isSandbox ? <PlayCircle size={14} /> : <CheckCircle2 size={14} />}
          {isSandbox ? "Sandbox Mode Active (Simulated)" : "Live EVM Testnet Mode Active"}
        </button>

        {!isSandbox && (
          <>
            {/* Live Wallet Connect */}
            <button
              onClick={onConnectWallet}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-gray-700 hover:border-gray-500 text-white flex items-center gap-1.5"
            >
              <Wallet size={14} className="text-primary" />
              {walletAddress ? formatAddress(walletAddress) : "Connect Wallet"}
            </button>

            {/* 1-Click Testnet POT Faucet */}
            <button
              onClick={onClaimFaucet}
              disabled={isClaimingFaucet || !walletAddress}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5"
              title="Mints 10,000 $POT directly on-chain to your wallet"
            >
              {isClaimingFaucet ? <Loader2 size={14} className="animate-spin" /> : <Droplets size={14} />}
              Claim 10,000 $POT Faucet
            </button>
          </>
        )}

        {isSandbox && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-white underline underline-offset-2"
          >
            Reset Simulator
          </button>
        )}
      </div>
    </div>
  );
}
