"use client";

import React, { useState, useEffect } from "react";
import { Award, ShieldAlert, CheckCircle, Loader2, Search } from "lucide-react";
import { formatAddress } from "../lib/substrate";
import { OnChainInvoice } from "../app/page";
import { Math14 } from "../lib/contracts";

interface Props {
  invoices: OnChainInvoice[];
  callerBountyBalance: bigint;
  onTriggerDefault: (id: number) => Promise<void>;
  isLoading: boolean;
}

export default function LiquidatorTab({
  invoices,
  callerBountyBalance,
  onTriggerDefault,
  isLoading,
}: Props) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [manualInvoiceId, setManualInvoiceId] = useState("");

  useEffect(() => {
    const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const factoredInvoices = invoices.filter((i) => i.status === 1 || i.status === 3);

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border rounded-xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase text-danger flex items-center gap-1.5">
            <ShieldAlert size={16} /> Autonomous Permissionless Liquidation Console
          </span>
          <h2 className="text-xl font-bold text-white mt-1">
            Earn 2.0% Caller Bounty on Overdue Portaldot Factoring Debt
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Calls <code className="text-indigo-300">LiquidationEngine.triggerDefault()</code> on-chain. Junior deposits absorb first-loss and the Substrate Layer-0 relayer logs the default report.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-right">
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Your POT Balance</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{Math14.format(callerBountyBalance)} $POT</span>
          </div>

          <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden p-1">
            <input
              type="number"
              placeholder="Invoice ID"
              value={manualInvoiceId}
              onChange={(e) => setManualInvoiceId(e.target.value)}
              className="bg-transparent px-2 py-1 text-xs text-white font-mono w-24 focus:outline-none"
            />
            <button
              onClick={() => onTriggerDefault(parseInt(manualInvoiceId))}
              disabled={!manualInvoiceId || isLoading}
              className="bg-danger hover:bg-red-600 disabled:opacity-40 text-white px-3 py-1 rounded text-xs font-bold"
            >
              Liquidate
            </button>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs font-mono text-gray-300">
          <thead className="bg-gray-900/80 text-[10px] uppercase tracking-wider text-gray-400 border-b border-border">
            <tr>
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Debtor SS58</th>
              <th className="px-6 py-4">Face Value</th>
              <th className="px-6 py-4">Maturity / Overdue Status</th>
              <th className="px-6 py-4">2% Bounty</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {factoredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No active or defaulted factored receivables on-chain. Fund an invoice in the Borrower tab first.
                </td>
              </tr>
            ) : (
              factoredInvoices.map((inv) => {
                const bounty = (Number(inv.faceValue) * 0.02) / 1e14;
                const secondsLeft = inv.dueDate - now;
                const isOverdue = inv.status === 1 && secondsLeft <= 0;

                return (
                  <tr key={inv.id} className="hover:bg-gray-900/30">
                    <td className="px-6 py-4 font-bold text-white">#{inv.id}</td>
                    <td className="px-6 py-4 text-gray-300">{formatAddress(inv.debtorSS58)}</td>
                    <td className="px-6 py-4 font-semibold text-white">{Math14.format(inv.faceValue)} $POT</td>
                    <td className="px-6 py-4">
                      {inv.status === 3 ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-danger/20 text-danger border border-danger/40">
                          Liquidated / DaaS Extrinsic Dispatched
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600 animate-pulse">
                          Delinquent ({Math.abs(secondsLeft)}s overdue)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Active ({secondsLeft}s until maturity)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-emerald-400">+{bounty.toFixed(2)} $POT</td>
                    <td className="px-6 py-4 text-right">
                      {inv.status === 3 ? (
                        <span className="text-gray-500 flex items-center justify-end gap-1">
                          <CheckCircle size={14} className="text-emerald-500" /> Settled
                        </span>
                      ) : (
                        <button
                          disabled={!isOverdue || isLoading}
                          onClick={() => onTriggerDefault(inv.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ml-auto ${
                            isOverdue
                              ? "bg-danger hover:bg-red-600 text-white shadow-lg shadow-red-900/50"
                              : "bg-gray-800 text-gray-500 cursor-not-allowed"
                          }`}
                        >
                          <Award size={14} />
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