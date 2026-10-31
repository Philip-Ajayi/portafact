"use client";

import React, { useState } from "react";
import { Shield, Zap, Loader2, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Math14 } from "../lib/contracts";

interface Props {
  seniorBalance: bigint;
  juniorBalance: bigint;
  seniorVaultTotal: bigint;
  juniorVaultTotal: bigint;
  seniorYieldReserve: bigint;
  juniorYieldReserve: bigint;
  onDeposit: (isSenior: boolean, amountStr: string) => Promise<void>;
  onWithdraw: (isSenior: boolean, amountStr: string) => Promise<void>;
  isLoading: boolean;
}

export default function InvestorTab({
  seniorBalance,
  juniorBalance,
  seniorVaultTotal,
  juniorVaultTotal,
  seniorYieldReserve,
  juniorYieldReserve,
  onDeposit,
  onWithdraw,
  isLoading,
}: Props) {
  const [seniorDepositInput, setSeniorDepositInput] = useState("5000");
  const [seniorWithdrawInput, setSeniorWithdrawInput] = useState("");
  const [juniorDepositInput, setJuniorDepositInput] = useState("1000");
  const [juniorWithdrawInput, setJuniorWithdrawInput] = useState("");

  const totalVault = seniorVaultTotal + juniorVaultTotal;
  const seniorRatio =
    totalVault > 0n ? ((Number(seniorVaultTotal) / Number(totalVault)) * 100).toFixed(1) : "80.0";
  const juniorRatio =
    totalVault > 0n ? ((Number(juniorVaultTotal) / Number(totalVault)) * 100).toFixed(1) : "20.0";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-gray-400">Total Capital in Vault</span>
          <p className="text-2xl font-black text-white mt-1 font-mono">{Math14.format(totalVault)} $POT</p>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-mono">
            <span className="text-emerald-400">{seniorRatio}% Senior</span> •{" "}
            <span className="text-amber-400">{juniorRatio}% Junior First-Loss</span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-emerald-400 flex items-center gap-1">
            <Shield size={14} /> Senior Yield Reserve
          </span>
          <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">{Math14.format(seniorYieldReserve)} $POT</p>
          <span className="text-xs text-gray-400 mt-2 block">Accumulated 30% spread share • Target 8.00%</span>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <span className="text-xs font-semibold uppercase text-amber-400 flex items-center gap-1">
            <Zap size={14} /> Junior Yield Reserve
          </span>
          <p className="text-2xl font-black text-amber-400 mt-1 font-mono">{Math14.format(juniorYieldReserve)} $POT</p>
          <span className="text-xs text-gray-400 mt-2 block">Absorbs 1st loss • Retains excess spread upside</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Senior Tranche */}
        <div className="bg-surface border-2 border-emerald-500/30 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 uppercase border border-emerald-800">
                Protected Capital • Fixed Target
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Senior Liquidity Tranche</h3>
            </div>
            <Shield className="text-emerald-400" size={28} />
          </div>

          <div className="bg-gray-900/60 rounded-lg p-3 mb-4 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-gray-300">
              <span>Pool Total:</span>
              <span className="font-semibold text-white">{Math14.format(seniorVaultTotal)} $POT</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Your Deposited Balance:</span>
              <span className="font-bold text-emerald-400">{Math14.format(seniorBalance)} $POT</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Deposit Amount ($POT):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seniorDepositInput}
                  onChange={(e) => setSeniorDepositInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 5000"
                />
                <button
                  onClick={() => onDeposit(true, seniorDepositInput)}
                  disabled={isLoading || !seniorDepositInput}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs whitespace-nowrap flex items-center gap-1"
                >
                  <ArrowDownCircle size={14} /> Deposit
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="text-xs text-gray-400 block mb-1">Withdraw Senior ($POT):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={seniorWithdrawInput}
                  onChange={(e) => setSeniorWithdrawInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  placeholder="Amount to withdraw"
                />
                <button
                  onClick={() => onWithdraw(true, seniorWithdrawInput)}
                  disabled={isLoading || !seniorWithdrawInput}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold px-4 py-2 rounded-lg text-xs whitespace-nowrap flex items-center gap-1"
                >
                  <ArrowUpCircle size={14} /> Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Junior Tranche */}
        <div className="bg-surface border-2 border-amber-500/30 rounded-xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 uppercase border border-amber-800">
                High Yield • First-Loss Buffer
              </span>
              <h3 className="text-lg font-bold text-white mt-2">Junior Underwriter Tranche</h3>
            </div>
            <Zap className="text-amber-400" size={28} />
          </div>

          <div className="bg-gray-900/60 rounded-lg p-3 mb-4 space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-gray-300">
              <span>Pool Total:</span>
              <span className="font-semibold text-white">{Math14.format(juniorVaultTotal)} $POT</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Your Deposited Balance:</span>
              <span className="font-bold text-amber-400">{Math14.format(juniorBalance)} $POT</span>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Deposit Amount ($POT):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={juniorDepositInput}
                  onChange={(e) => setJuniorDepositInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  placeholder="e.g. 1000"
                />
                <button
                  onClick={() => onDeposit(false, juniorDepositInput)}
                  disabled={isLoading || !juniorDepositInput}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-xs whitespace-nowrap flex items-center gap-1"
                >
                  <ArrowDownCircle size={14} /> Deposit
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <label className="text-xs text-gray-400 block mb-1">Withdraw Junior ($POT):</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={juniorWithdrawInput}
                  onChange={(e) => setJuniorWithdrawInput(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                  placeholder="Amount to withdraw"
                />
                <button
                  onClick={() => onWithdraw(false, juniorWithdrawInput)}
                  disabled={isLoading || !juniorWithdrawInput}
                  className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white font-bold px-4 py-2 rounded-lg text-xs whitespace-nowrap flex items-center gap-1"
                >
                  <ArrowUpCircle size={14} /> Withdraw
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}