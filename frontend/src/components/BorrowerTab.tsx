"use client";

import React, { useState } from "react";
import { FileUp, ShieldCheck, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { isValidSS58, formatAddress } from "../lib/substrate";
import { OnChainInvoice } from "../app/page";
import { Math14 } from "../lib/contracts";

interface Props {
  walletAddress: `0x${string}` | null;
  invoices: OnChainInvoice[];
  onMintInvoice: (data: {
    debtorSS58: string;
    faceValue: string;
    advanceAmount: string;
    durationSeconds: number;
    ipfsHash: string;
  }) => Promise<void>;
  onFundAndAdvance: (invoiceId: number) => Promise<void>;
  onRepayInvoice: (invoiceId: number, faceValue: bigint) => Promise<void>;
  isLoading: boolean;
}

export default function BorrowerTab({
  walletAddress,
  invoices,
  onMintInvoice,
  onFundAndAdvance,
  onRepayInvoice,
  isLoading,
}: Props) {
  const [debtorSS58, setDebtorSS58] = useState("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
  const [faceValue, setFaceValue] = useState("10000");
  const [advancePercent, setAdvancePercent] = useState("90");
  const [durationUnit, setDurationUnit] = useState<"seconds" | "days">("seconds");
  const [durationValue, setDurationValue] = useState("120"); // 120 seconds default for live testing
  const [ipfsHash, setIpfsHash] = useState("QmZtmD2qt8fJpq3rZZhDM58nQ4BEdcDFu83");

  const isDebtorValid = isValidSS58(debtorSS58);
  const faceNum = parseFloat(faceValue) || 0;
  const advPct = parseFloat(advancePercent) || 0;
  const advanceCalculated = ((faceNum * advPct) / 100).toFixed(2);
  const durationInSeconds =
    durationUnit === "days" ? Math.max(1, parseFloat(durationValue) || 1) * 86400 : Math.max(1, parseInt(durationValue) || 60);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDebtorValid || faceNum <= 0 || advPct <= 0 || advPct >= 100) return;

    await onMintInvoice({
      debtorSS58,
      faceValue,
      advanceAmount: advanceCalculated,
      durationSeconds: durationInSeconds,
      ipfsHash,
    });
  };

  const userInvoices = invoices.filter(
    (inv) => !walletAddress || inv.borrower.toLowerCase() === walletAddress.toLowerCase()
  );

  return (
    <div className="space-y-8">
      {/* Mint Invoice Form */}
      <div className="max-w-2xl mx-auto bg-surface border border-border rounded-xl p-6 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileUp className="text-primary" /> Invoice Tokenization & Factoring
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Mint real accounts receivable as an ERC-721 token on Portaldot EVM and request upfront capital disbursement.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-300 mb-1 flex justify-between">
              <span>Debtor Portaldot SS58 Identity</span>
              {isDebtorValid ? (
                <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-mono">
                  <ShieldCheck size={12} /> Valid SS58
                </span>
              ) : (
                <span className="text-danger text-[11px]">Invalid Substrate SS58 format</span>
              )}
            </label>
            <input
              type="text"
              value={debtorSS58}
              onChange={(e) => setDebtorSS58(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              placeholder="5GrwvaEF5zXb26Fz..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
                Face Value ($POT)
              </label>
              <input
                type="number"
                value={faceValue}
                onChange={(e) => setFaceValue(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
                Advance Rate (%)
              </label>
              <input
                type="number"
                value={advancePercent}
                max="99"
                min="1"
                onChange={(e) => setAdvancePercent(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
                Maturity Duration
              </label>
              <input
                type="number"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <select
                value={durationUnit}
                onChange={(e) => setDurationUnit(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="seconds">Seconds</option>
                <option value="days">Days</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-gray-300 mb-1">
              IPFS Document Hash (Receivable Proof)
            </label>
            <input
              type="text"
              value={ipfsHash}
              onChange={(e) => setIpfsHash(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary font-mono"
              placeholder="Qm..."
            />
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-xs font-mono space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>Advance to Disburse:</span>
              <span className="text-emerald-400 font-bold">{advanceCalculated} $POT</span>
            </div>
            <div className="flex justify-between text-gray-400">
              <span>Junior Retention:</span>
              <span className="text-amber-400 font-bold">{(faceNum - parseFloat(advanceCalculated) || 0).toFixed(2)} $POT</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!isDebtorValid || faceNum <= 0 || isLoading}
            className="w-full py-2.5 rounded-lg font-bold text-xs bg-primary hover:bg-indigo-600 disabled:opacity-50 text-white flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/30"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <FileUp size={16} />}
            Mint Invoice Receivable NFT
          </button>
        </form>
      </div>

      {/* Real Invoices Management */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-4">Your On-Chain Receivables & Actions</h3>
        {userInvoices.length === 0 ? (
          <p className="text-xs text-gray-500 py-4 text-center">No invoices found for this wallet. Mint an invoice above.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-gray-900/80 text-gray-400 uppercase text-[10px] border-b border-border">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Debtor</th>
                  <th className="px-4 py-3">Face Value</th>
                  <th className="px-4 py-3">Advance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-900/40">
                    <td className="px-4 py-3 font-bold text-white">#{inv.id}</td>
                    <td className="px-4 py-3 text-gray-300">{formatAddress(inv.debtorSS58)}</td>
                    <td className="px-4 py-3 text-white font-semibold">{Math14.format(inv.faceValue)} $POT</td>
                    <td className="px-4 py-3 text-emerald-400">{Math14.format(inv.advanceAmount)} $POT</td>
                    <td className="px-4 py-3">
                      {inv.status === 0 && (
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                          Minted (Active)
                        </span>
                      )}
                      {inv.status === 1 && (
                        <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          Factored / Funded
                        </span>
                      )}
                      {inv.status === 2 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          Repaid & Settled
                        </span>
                      )}
                      {inv.status === 3 && (
                        <span className="px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                          Defaulted
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 0 && (
                        <button
                          onClick={() => onFundAndAdvance(inv.id)}
                          disabled={isLoading}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-[11px] font-bold"
                        >
                          Lock & Disburse Advance
                        </button>
                      )}
                      {inv.status === 1 && (
                        <button
                          onClick={() => onRepayInvoice(inv.id, inv.faceValue)}
                          disabled={isLoading}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded text-[11px] font-bold"
                        >
                          Repay Invoice
                        </button>
                      )}
                      {inv.status === 2 && <span className="text-gray-500">Fully Settled</span>}
                      {inv.status === 3 && <span className="text-red-400">Liquidated</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}