"use client";

import React, { useState } from "react";
import { Wallet, Droplets, Loader2, Link2 } from "lucide-react";
import { formatAddress } from "../lib/substrate";
import { Math14 } from "../lib/contracts";

interface Props {
  blockNumber: bigint;
  walletAddress: string | null;
  potBalance: bigint;
  onConnectWallet: () => Promise<void>;
  onClaimFaucet: (target?: string, amount?: string) => Promise<void>;
  isClaimingFaucet: boolean;
}

export default function LiveSandboxBanner({
  blockNumber,
  walletAddress,
  potBalance,
  onConnectWallet,
  onClaimFaucet,
  isClaimingFaucet,
}: Props) {
  const [faucetAmt, setFaucetAmt] = useState("10000");

  return (
    <div className="bg-gray-950 border-b border-border px-6 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white uppercase tracking-wider">Live EVM Testnet</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-400 font-mono">Block #{blockNumber.toString()}</span>
        </div>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {walletAddress && (
          <div className="bg-surface border border-gray-800 px-3 py-1 rounded-md text-gray-300 font-mono flex items-center gap-1.5">
            <span className="text-gray-500">Balance:</span>
            <span className="font-bold text-emerald-400">{Math14.format(potBalance)} $POT</span>
          </div>
        )}

        <button
          onClick={onConnectWallet}
          className="px-3 py-1.5 font-semibold rounded-lg bg-surface border border-gray-700 hover:border-gray-500 text-white flex items-center gap-1.5 transition-all"
        >
          <Wallet size={13} className="text-primary" />
          {walletAddress ? formatAddress(walletAddress) : "Connect EVM Wallet"}
        </button>

        <div className="flex items-center bg-surface border border-gray-800 rounded-lg overflow-hidden">
          <input
            type="number"
            value={faucetAmt}
            onChange={(e) => setFaucetAmt(e.target.value)}
            className="w-20 bg-transparent px-2 py-1 text-white text-xs focus:outline-none font-mono"
            placeholder="Amount"
          />
          <button
            onClick={() => onClaimFaucet(walletAddress || undefined, faucetAmt)}
            disabled={isClaimingFaucet || !walletAddress}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white px-3 py-1 font-semibold flex items-center gap-1 text-xs"
            title="Calls MockPOT.faucet() directly on-chain"
          >
            {isClaimingFaucet ? <Loader2 size={12} className="animate-spin" /> : <Droplets size={12} />}
            Claim Faucet
          </button>
        </div>
      </div>
    </div>
  );
}