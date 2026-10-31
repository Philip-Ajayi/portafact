"use client";

import React, { useState } from "react";
import { Shield, Zap, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface Props {
  isSandbox: boolean;
  seniorBalance: number;
  juniorBalance: number;
  seniorVaultTotal: number;
  juniorVaultTotal: number;
  onDeposit: (isSenior: boolean, amount: number) => Promise<void>;
  onWithdraw?: (isSenior: boolean, amount: number) => Promise<void>;
  isLoading: boolean;
}

export default function InvestorTab({
  seniorBalance,
  juniorBalance,
  seniorVaultTotal,
  juniorVaultTotal,
  onDeposit,
  onWithdraw,
  isLoading,
}: Props) {
  const [seniorInput, setSeniorInput] = useState("5000");
  const [juniorInput, setJuniorInput] = useState("1000");
  const [seniorMode, setSeniorMode] = useState<"deposit" | "withdraw">("deposit");
  const [juniorMode, setJuniorMode] = useState<"deposit" | "withdraw">("deposit");
  const [actionType, setActionType] = useState<"senior" | "junior" | null>(null);

  const totalVault = seniorVaultTotal + juniorVaultTotal;
  const seniorRatio = totalVault > 0 ? ((seniorVaultTotal / totalVault) * 100).toFixed(1) : "80.0";
  const juniorRatio = totalVault > 0 ? ((juniorVaultTotal / totalVault) * 100).toFixed(1) : "20.0";

  const handleAction = async (isSenior: boolean) => {
    const amtStr = isSenior ? seniorInput : juniorInput;
    const mode = isSenior ? seniorMode : juniorMode;
    const amt = parseFloat(amtStr) || 0;
    if (amt <= 0) return;

    setActionType(isSenior ? "senior" : "junior");
    if (mode === "deposit") {
      await onDeposit(isSenior, amt);
    } else if (onWithdraw) {
      await onWithdraw(isSenior, amt);
    }
    setActionType(null);
  };

  return (
    <div className="space-y-6">
      {/* Metrics Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-gray-400">Total Value Locked (Vault)</span>
          <p className="text-2xl font-black text-white mt-1">{totalVault.toLocaleString()} $POT</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            <span className="text-emerald-400">{seniorRatio}% Senior</span> •{" "}
            <span className="text-amber-400">{juniorRatio}% Junior Buffer</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-emerald-400 flex items-center gap-1">
            <Shield size={14} /> Senior Protected APY
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1">8.00%</p>
          <span className="text-xs text-gray-400 mt-2 block">100% Capital Insured via Junior First-Loss</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-amber-400 flex items-center gap-1">
            <Zap size={14} /> Junior High-Yield APY
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1">22.40%</p>
          <span className="text-xs text-gray-400 mt-2 block">Absorbs First Loss • Protocol Fee Upside</span>
        </div>
      </div>

      {/* Tranche Allocation Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Senior Tranche Card */}
        <div className="bg-surface border-2 border-emerald-500/30 rounded-xl p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 uppercase border border-emerald-800">
                Low Risk • Fixed Yield
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Senior Liquidity Tranche</h3>
            </div>
            <Shield className="text-emerald-400" size={28} />
          </div>

          <div className="bg-gray-900/60 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Pool Total:</span>
              <span className="font-semibold">{seniorVaultTotal.toLocaleString()} $POT</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Your Deposited Balance:</span>
              <span className="font-bold text-emerald-400">{seniorBalance.toLocaleString()} $POT</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSeniorMode("deposit")}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                seniorMode === "deposit" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setSeniorMode("withdraw")}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                seniorMode === "withdraw" ? "bg-emerald-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Withdraw
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="number"
              value={seniorInput}
              onChange={(e) => setSeniorInput(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              placeholder="Amount in POT"
            />
            <button
              onClick={() => handleAction(true)}
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2"
            >
              {isLoading && actionType === "senior" ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing On-Chain Transaction...
                </>
              ) : seniorMode === "deposit" ? (
                <>
                  <ArrowDownCircle size={16} /> Supply Capital to Senior (8% APY)
                </>
              ) : (
                <>
                  <ArrowUpCircle size={16} /> Withdraw Senior Capital
                </>
              )}
            </button>
          </div>
        </div>

        {/* Junior Tranche Card */}
        <div className="bg-surface border-2 border-amber-500/30 rounded-xl p-6 relative">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 uppercase border border-amber-800">
                High Yield • First Loss
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Junior Underwriter Tranche</h3>
            </div>
            <Zap className="text-amber-400" size={28} />
          </div>

          <div className="bg-gray-900/60 rounded-lg p-3 mb-4 space-y-1 text-sm">
            <div className="flex justify-between text-gray-300">
              <span>Pool Total:</span>
              <span className="font-semibold">{juniorVaultTotal.toLocaleString()} $POT</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Your Deposited Balance:</span>
              <span className="font-bold text-amber-400">{juniorBalance.toLocaleString()} $POT</span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setJuniorMode("deposit")}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                juniorMode === "deposit" ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Deposit
            </button>
            <button
              onClick={() => setJuniorMode("withdraw")}
              className={`flex-1 py-1 rounded text-xs font-bold transition-all ${
                juniorMode === "withdraw" ? "bg-amber-600 text-white" : "bg-gray-800 text-gray-400"
              }`}
            >
              Withdraw
            </button>
          </div>

          <div className="space-y-3">
            <input
              type="number"
              value={juniorInput}
              onChange={(e) => setJuniorInput(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              placeholder="Amount in POT"
            />
            <button
              onClick={() => handleAction(false)}
              disabled={isLoading}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2"
            >
              {isLoading && actionType === "junior" ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing On-Chain Transaction...
                </>
              ) : juniorMode === "deposit" ? (
                <>
                  <ArrowDownCircle size={16} /> Underwrite Junior Pool (22.4% APY)
                </>
              ) : (
                <>
                  <ArrowUpCircle size={16} /> Withdraw Junior Capital
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}