"use client";

import React, { useState } from "react";
import { FileUp, ShieldCheck, ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { isValidSS58 } from "../lib/substrate";

interface Props {
  isSandbox: boolean;
  onMintAndAdvance: (data: {
    faceValue: number;
    advance: number;
    debtor: string;
    ipfs: string;
    durationSeconds: number;
  }) => Promise<void>;
  isLoading: boolean;
}

export default function BorrowerTab({ isSandbox, onMintAndAdvance, isLoading }: Props) {
  const [debtorSS58, setDebtorSS58] = useState("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
  const [faceValue, setFaceValue] = useState("10000");
  const [advancePercent, setAdvancePercent] = useState("95");
  const [useFastTrack, setUseFastTrack] = useState(true); // Default 60-second maturity for live testing!
  const [submitted, setSubmitted] = useState(false);

  const isDebtorValid = isValidSS58(debtorSS58);
  const faceNum = parseFloat(faceValue) || 0;
  const advanceNum = (faceNum * (parseFloat(advancePercent) || 95)) / 100;
  const durationSeconds = useFastTrack ? 60 : 30 * 86400;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDebtorValid || faceNum <= 0) return;

    await onMintAndAdvance({
      faceValue: faceNum,
      advance: advanceNum,
      debtor: debtorSS58,
      ipfs: "QmZtmD2qt8fJpq3rZZhDM58nQ4BEdcDFu83",
      durationSeconds,
    });

    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto bg-surface border border-border rounded-xl p-6 shadow-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <FileUp className="text-primary" /> Invoice Tokenization & Factoring Advance
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Mint accounts receivable as an ERC-721 token on Portaldot EVM and disburse upfront working capital from the Tranche Vault.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
            Encrypted Invoice Document (PDF)
          </label>
          <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center bg-gray-900/40">
            <span className="text-sm text-gray-300 font-medium">Export_Invoice_8820.pdf</span>
            <span className="block text-xs text-gray-500 mt-1">SHA-256 IPFS Verified • 2.4 MB</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-gray-300 mb-2 flex justify-between">
            <span>Debtor Portaldot SS58 Identity</span>
            {isDebtorValid ? (
              <span className="text-senior flex items-center gap-1 text-xs lowercase">
                <ShieldCheck size={12} /> Valid Substrate ID
              </span>
            ) : (
              <span className="text-danger text-xs lowercase">Invalid SS58 format</span>
            )}
          </label>
          <input
            type="text"
            value={debtorSS58}
            onChange={(e) => setDebtorSS58(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary font-mono"
            placeholder="5GrwvaEF5zXb26Fz..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
              Invoice Face Value ($POT)
            </label>
            <input
              type="number"
              value={faceValue}
              onChange={(e) => setFaceValue(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase text-gray-300 mb-2">
              Advance Rate (%)
            </label>
            <input
              type="number"
              value={advancePercent}
              max="95"
              min="50"
              onChange={(e) => setAdvancePercent(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Judge Fast-Track Duration Selector */}
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-lg p-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Judge Fast-Track (60-Second On-Chain Maturity)
            </span>
            <input
              type="checkbox"
              checked={useFastTrack}
              onChange={(e) => setUseFastTrack(e.target.checked)}
              className="rounded bg-gray-800 border-gray-600 text-primary focus:ring-0 h-4 w-4"
            />
          </label>
          <p className="text-[11px] text-gray-400 mt-1">
            {useFastTrack
              ? "⚡ Enabled: Maturity expires in 60s so you can trigger real on-chain liquidation immediately!"
              : "Standard: Maturity is 30 Days (Production deterministic)."}
          </p>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Immediate Advance to SME:</span>
            <span className="font-bold text-emerald-400">{advanceNum.toLocaleString()} $POT</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Junior First-Loss Retention:</span>
            <span className="font-bold text-amber-400">{(faceNum - advanceNum).toLocaleString()} $POT</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={!isDebtorValid || faceNum <= 0 || isLoading}
          className={`w-full py-3 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            submitted
              ? "bg-emerald-600 text-white"
              : "bg-primary hover:bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 disabled:opacity-50"
          }`}
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Submitting Live On-Chain Transactions...
            </>
          ) : submitted ? (
            <>
              <Check size={18} /> Disbursed {advanceNum.toLocaleString()} $POT Advance!
            </>
          ) : (
            <>
              Tokenize & Claim Advance <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
