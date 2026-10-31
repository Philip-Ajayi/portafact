"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createWalletClient, createPublicClient, custom, http } from "viem";
import LiveSandboxBanner from "../components/LiveSandboxBanner";
import BorrowerTab from "../components/BorrowerTab";
import InvestorTab from "../components/InvestorTab";
import LiquidatorTab from "../components/LiquidatorTab";
import { Coins, Activity, Terminal } from "lucide-react";
import {
  CONTRACT_ADDRESSES,
  TARGET_CHAIN,
  Math14,
  MOCK_POT_ABI,
  INVOICE_NFT_ABI,
  TRANCHE_VAULT_ABI,
  LIQUIDATION_ENGINE_ABI,
} from "../lib/contracts";

export interface OnChainInvoice {
  id: number;
  borrower: `0x${string}`;
  debtorSS58: string;
  faceValue: bigint;
  advanceAmount: bigint;
  dueDate: number;
  ipfsHash: string;
  status: number; // 0: Active, 1: Factored, 2: Repaid, 3: Defaulted
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<"invest" | "borrow" | "liquidate">("invest");
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [blockNumber, setBlockNumber] = useState<bigint>(0n);

  // Live on-chain balances
  const [seniorBalance, setSeniorBalance] = useState<bigint>(0n);
  const [juniorBalance, setJuniorBalance] = useState<bigint>(0n);
  const [seniorVaultTotal, setSeniorVaultTotal] = useState<bigint>(0n);
  const [juniorVaultTotal, setJuniorVaultTotal] = useState<bigint>(0n);
  const [seniorYieldReserve, setSeniorYieldReserve] = useState<bigint>(0n);
  const [juniorYieldReserve, setJuniorYieldReserve] = useState<bigint>(0n);
  const [potWalletBalance, setPotWalletBalance] = useState<bigint>(0n);

  // Live on-chain invoices
  const [invoices, setInvoices] = useState<OnChainInvoice[]>([]);

  const publicClient = createPublicClient({
    chain: TARGET_CHAIN,
    transport: http(),
  });

  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask or a compatible EVM Web3 wallet.");
      return;
    }
    try {
      const client = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const [address] = await client.requestAddresses();
      setWalletAddress(address);

      try {
        await (window as any).ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: `0x${TARGET_CHAIN.id.toString(16)}` }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await (window as any).ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${TARGET_CHAIN.id.toString(16)}`,
                chainName: TARGET_CHAIN.name,
                rpcUrls: TARGET_CHAIN.rpcUrls.default.http,
                nativeCurrency: TARGET_CHAIN.nativeCurrency,
              },
            ],
          });
        }
      }
      await refreshOnChainData(address);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    }
  };

  const refreshOnChainData = useCallback(async (userAddr?: `0x${string}`) => {
    const targetAddr = userAddr || walletAddress;

    try {
      const [currentBlock, accounting] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.trancheVault,
          abi: TRANCHE_VAULT_ABI,
          functionName: "getVaultAccounting",
        }),
      ]);

      setBlockNumber(currentBlock);
      setSeniorVaultTotal(accounting[0]);
      setJuniorVaultTotal(accounting[1]);
      setSeniorYieldReserve(accounting[2]);
      setJuniorYieldReserve(accounting[3]);

      if (targetAddr) {
        const [sBal, jBal, potBal] = await Promise.all([
          publicClient.readContract({
            address: CONTRACT_ADDRESSES.trancheVault,
            abi: TRANCHE_VAULT_ABI,
            functionName: "seniorBalances",
            args: [targetAddr],
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESSES.trancheVault,
            abi: TRANCHE_VAULT_ABI,
            functionName: "juniorBalances",
            args: [targetAddr],
          }),
          publicClient.readContract({
            address: CONTRACT_ADDRESSES.potToken,
            abi: MOCK_POT_ABI,
            functionName: "balanceOf",
            args: [targetAddr],
          }),
        ]);

        setSeniorBalance(sBal);
        setJuniorBalance(jBal);
        setPotWalletBalance(potBal);
      }

      // Read real on-chain invoices
      const totalCount = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.invoiceNFT,
        abi: INVOICE_NFT_ABI,
        functionName: "totalInvoices",
      });

      const count = Number(totalCount);
      if (count > 0) {
        const invoicePromises = [];
        for (let i = 1; i <= count; i++) {
          invoicePromises.push(
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.invoiceNFT,
              abi: INVOICE_NFT_ABI,
              functionName: "getInvoice",
              args: [BigInt(i)],
            })
          );
        }
        const results = await Promise.all(invoicePromises);
        const mapped: OnChainInvoice[] = results.map((inv) => ({
          id: Number(inv.id),
          borrower: inv.borrower as `0x${string}`,
          debtorSS58: inv.debtorSS58,
          faceValue: inv.faceValue,
          advanceAmount: inv.advanceAmount,
          dueDate: Number(inv.dueDate),
          ipfsHash: inv.ipfsHash,
          status: inv.status,
        }));
        setInvoices(mapped);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.warn("Live query notice (verify RPC is reachable):", err);
    }
  }, [publicClient, walletAddress]);

  useEffect(() => {
    refreshOnChainData();
    const interval = setInterval(() => {
      refreshOnChainData();
    }, 4000);
    return () => clearInterval(interval);
  }, [refreshOnChainData]);

  // Live Real Faucet Call
  const handleClaimFaucet = async (targetWallet?: string, customAmount?: string) => {
    const dest = (targetWallet || walletAddress) as `0x${string}`;
    if (!dest) {
      alert("Connect a wallet or specify a recipient address!");
      return;
    }
    setIsClaimingFaucet(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const parsedAmount = Math14.parse(customAmount || "10000");

      const tx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.potToken,
        abi: MOCK_POT_ABI,
        functionName: "faucet",
        args: [dest, parsedAmount],
        account: dest,
      });

      console.log("Faucet Tx:", tx);
      await publicClient.waitForTransactionReceipt({ hash: tx });
      await refreshOnChainData();
      alert(`Claimed ${customAmount || "10000"} $POT on-chain!\nTx Hash: ${tx}`);
    } catch (err: any) {
      alert(`Faucet error: ${err.message}`);
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  // Live Real Deposits & Withdrawals
  const handleDeposit = async (isSenior: boolean, amountStr: string) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const parsed = Math14.parse(amountStr);

      const approveTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.potToken,
        abi: MOCK_POT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.trancheVault, parsed],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      const depTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: isSenior ? "depositSenior" : "depositJunior",
        args: [parsed],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: depTx });

      await refreshOnChainData();
      alert(`Successfully deposited ${amountStr} $POT on-chain!`);
    } catch (err: any) {
      alert(`Deposit failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (isSenior: boolean, amountStr: string) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const parsed = Math14.parse(amountStr);

      const tx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: isSenior ? "withdrawSenior" : "withdrawJunior",
        args: [parsed],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });

      await refreshOnChainData();
      alert(`Withdrawn ${amountStr} $POT successfully!`);
    } catch (err: any) {
      alert(`Withdrawal failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Live Real Minting & Factoring Advance
  const handleMintInvoice = async (data: {
    debtorSS58: string;
    faceValue: string;
    advanceAmount: string;
    durationSeconds: number;
    ipfsHash: string;
  }) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const fValue = Math14.parse(data.faceValue);
      const advValue = Math14.parse(data.advanceAmount);

      const tx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.invoiceNFT,
        abi: INVOICE_NFT_ABI,
        functionName: "mintInvoice",
        args: [data.debtorSS58, fValue, advValue, BigInt(data.durationSeconds), data.ipfsHash],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });

      await refreshOnChainData();
      alert(`Invoice Minted on-chain! Tx: ${tx}`);
    } catch (err: any) {
      alert(`Minting failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFundAndAdvance = async (invoiceId: number) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const idBig = BigInt(invoiceId);

      const appTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.invoiceNFT,
        abi: INVOICE_NFT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.trancheVault, idBig],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: appTx });

      const fundTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: "fundAndAdvanceInvoice",
        args: [idBig],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: fundTx });

      await refreshOnChainData();
      alert(`Advance Disbursed to your wallet on-chain!`);
    } catch (err: any) {
      alert(`Advance funding failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepayInvoice = async (invoiceId: number, faceValue: bigint) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const idBig = BigInt(invoiceId);

      const appTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.potToken,
        abi: MOCK_POT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.trancheVault, faceValue],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: appTx });

      const repayTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: "repayInvoice",
        args: [idBig],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: repayTx });

      await refreshOnChainData();
      alert(`Invoice #${invoiceId} settled on-chain! Yield allocated.`);
    } catch (err: any) {
      alert(`Repayment failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Live Liquidation Default Workout
  const handleTriggerDefault = async (invoiceId: number) => {
    if (!walletAddress) {
      await connectWallet();
      return;
    }
    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const tx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.liquidationEngine,
        abi: LIQUIDATION_ENGINE_ABI,
        functionName: "triggerDefault",
        args: [BigInt(invoiceId)],
        account: walletAddress,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });

      await refreshOnChainData();
      alert(`Default executed on-chain! Liquidator bounty paid.\nSubstrate DaaS daemon captured event.\nTx: ${tx}`);
    } catch (err: any) {
      alert(`Liquidation failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-gray-100">
      <LiveSandboxBanner
        blockNumber={blockNumber}
        walletAddress={walletAddress}
        potBalance={potWalletBalance}
        onConnectWallet={connectWallet}
        onClaimFaucet={handleClaimFaucet}
        isClaimingFaucet={isClaimingFaucet}
      />

      <header className="border-b border-border bg-surface/60 backdrop-blur-md px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-lg tracking-tight">PortaFact Protocol</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live Portaldot EVM
              </span>
            </div>
            <p className="text-xs text-gray-400">Autonomous RWA Factoring & Insured Tranche Vault</p>
          </div>
        </div>

        <nav className="flex items-center bg-gray-900 border border-border rounded-xl p-1">
          <button
            onClick={() => setActiveTab("invest")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "invest" ? "bg-primary text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Coins size={14} /> Dual Tranches
          </button>
          <button
            onClick={() => setActiveTab("borrow")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "borrow" ? "bg-primary text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Activity size={14} /> Borrower Advance
          </button>
          <button
            onClick={() => setActiveTab("liquidate")}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === "liquidate" ? "bg-danger text-white" : "text-gray-400 hover:text-white"
            }`}
          >
            <Terminal size={14} /> Liquidator Terminal
          </button>
        </nav>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {activeTab === "invest" && (
          <InvestorTab
            seniorBalance={seniorBalance}
            juniorBalance={juniorBalance}
            seniorVaultTotal={seniorVaultTotal}
            juniorVaultTotal={juniorVaultTotal}
            seniorYieldReserve={seniorYieldReserve}
            juniorYieldReserve={juniorYieldReserve}
            onDeposit={handleDeposit}
            onWithdraw={handleWithdraw}
            isLoading={isLoading}
          />
        )}
        {activeTab === "borrow" && (
          <BorrowerTab
            walletAddress={walletAddress}
            invoices={invoices}
            onMintInvoice={handleMintInvoice}
            onFundAndAdvance={handleFundAndAdvance}
            onRepayInvoice={handleRepayInvoice}
            isLoading={isLoading}
          />
        )}
        {activeTab === "liquidate" && (
          <LiquidatorTab
            invoices={invoices}
            callerBountyBalance={potWalletBalance}
            onTriggerDefault={handleTriggerDefault}
            isLoading={isLoading}
          />
        )}
      </main>

      <footer className="border-t border-border bg-surface/30 px-6 py-4 text-center text-xs text-gray-500">
        PortaFact Protocol • Production Live On-Chain Accounting • 14-Decimal Portaldot EVM Native
      </footer>
    </div>
  );
}