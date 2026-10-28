"use client";

import React, { useState, useEffect } from "react";
import { Clock, Award, ShieldAlert, CheckCircle, Loader2 } from "lucide-react";
import { formatAddress } from "../lib/substrate";

interface Props {
  isSandbox: boolean;
  invoices: Array<{
    id: number;
    faceValue: number;
    advance: number;
    debtor: string;
    dueDate: number;
    isOverdue: boolean;
    status: string;
  }>;
  callerBountyBalance: number;
  onFastForwardTime: () => void;
  onTriggerDefault: (id: number) => Promise<void>;
  isLoading: boolean;
}

export default function LiquidatorTab({
  isSandbox,
  invoices,
  callerBountyBalance,
  onFastForwardTime,
  onTriggerDefault,
  isLoading,
}: Props) {
  const [liquidatingId, setLiquidatingId] = useState<number | null>(null);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAction = async (id: number) => {
    setLiquidatingId(id);
    await onTriggerDefault(id);
    setLiquidatingId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase text-danger flex items-center gap-1.5">
            <ShieldAlert size={16} /> Autonomous Permissionless Liquidator Terminal
          </span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Earn 2.0% Instant Caller Bounty on Delinquent Receivables
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Executes <code className="text-indigo-300">LiquidationEngine.triggerDefault()</code> on-chain. Junior absorbs loss, Senior is preserved, and the Substrate L0 relayer is triggered.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Your Bounty Wallet</span>
            <span className="text-lg font-black text-emerald-400">{callerBountyBalance.toLocaleString()} $POT</span>
          </div>

          {isSandbox && (
            <button
              onClick={onFastForwardTime}
              className="px-4 py-2.5 text-xs font-bold rounded-lg border bg-danger/20 text-danger border-danger/40 hover:bg-danger hover:text-white transition-all flex items-center gap-2"
            >
              <Clock size={16} /> Fast-Forward 31 Days (Simulate Overdue)
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-900/80 text-[11px] uppercase tracking-wider text-gray-400 border-b border-border">
            <tr>
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Debtor SS58 ID</th>
              <th className="px-6 py-4">Face Value</th>
              <th className="px-6 py-4">Maturity / Overdue Status</th>
              <th className="px-6 py-4">2% Caller Bounty</th>
              <th className="px-6 py-4 text-right">Workout Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No active invoices found. Mint an invoice in the Borrower tab first.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => {
                const bounty = inv.faceValue * 0.02;
                const secondsLeft = inv.dueDate - now;
                const isDelinquent = isSandbox ? inv.isOverdue : secondsLeft <= 0;

                return (
                  <tr key={inv.id} className="hover:bg-gray-900/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-white">#00{inv.id}</td>
                    <td className="px-6 py-4 font-mono text-xs">{formatAddress(inv.debtor)}</td>
                    <td className="px-6 py-4 font-semibold text-white">{inv.faceValue.toLocaleString()} $POT</td>
                    <td className="px-6 py-4">
                      {inv.status === "Defaulted" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/20 text-danger border border-danger/40">
                          Liquidated / DaaS Dispatched
                        </span>
                      ) : isDelinquent ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600 animate-pulse">
                          Overdue (Eligible for Liquidation)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Active ({secondsLeft}s until maturity)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">+{bounty.toLocaleString()} $POT</td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === "Defaulted" ? (
                        <span className="text-xs text-gray-500 flex items-center justify-end gap-1">
                          <CheckCircle size={14} className="text-emerald-500" /> Settled
                        </span>
                      ) : (
                        <button
                          disabled={!isDelinquent || isLoading}
                          onClick={() => handleAction(inv.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                            isDelinquent
                              ? "bg-danger hover:bg-red-600 text-white shadow-lg shadow-red-900/50"
                              : "bg-gray-800 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          {isLoading && liquidatingId === inv.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Award size={14} />
                          )}
                          Trigger Default Workout
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
