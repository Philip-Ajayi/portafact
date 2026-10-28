"use client";

import React, { useState, useEffect } from "react";
import { createWalletClient, createPublicClient, custom, http, parseAbiItem } from "viem";
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

export default function Home() {
  const [isSandbox, setIsSandbox] = useState(false); // Default to real live on-chain mode
  const [activeTab, setActiveTab] = useState<"invest" | "borrow" | "liquidate">("invest");
  const [walletAddress, setWalletAddress] = useState<`0x${string}` | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);

  // Live on-chain balances
  const [seniorBalance, setSeniorBalance] = useState(0);
  const [juniorBalance, setJuniorBalance] = useState(0);
  const [seniorVaultTotal, setSeniorVaultTotal] = useState(0);
  const [juniorVaultTotal, setJuniorVaultTotal] = useState(0);
  const [potWalletBalance, setPotWalletBalance] = useState(0);

  // Invoice tracking
  const [invoices, setInvoices] = useState<Array<any>>([]);

  // Sandbox simulation fallback state
  const [sbSenior, setSbSenior] = useState(8000);
  const [sbJunior, setSbJunior] = useState(2000);
  const [sbBounty, setSbBounty] = useState(0);
  const [sbInvoices, setSbInvoices] = useState([
    {
      id: 1,
      faceValue: 10000,
      advance: 9500,
      debtor: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
      dueDate: Math.floor(Date.now() / 1000) + 60,
      isOverdue: false,
      status: "Factored",
    },
  ]);

  // Connect Wallet & ensure correct network
  const connectWallet = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("Please install MetaMask or a compatible Web3 wallet!");
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
      refreshOnChainData(address);
    } catch (err: any) {
      console.error("Wallet connection failed:", err);
    }
  };

  // Read live state from contracts
  const refreshOnChainData = async (userAddr?: `0x${string}`) => {
    const targetAddr = userAddr || walletAddress;
    const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http() });

    try {
      const sTotal = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: "seniorDeposits",
      });
      const jTotal = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: "juniorDeposits",
      });
      setSeniorVaultTotal(Number(sTotal / BigInt(1e14)));
      setJuniorVaultTotal(Number(jTotal / BigInt(1e14)));

      if (targetAddr) {
        const sBal = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.trancheVault,
          abi: TRANCHE_VAULT_ABI,
          functionName: "seniorBalances",
          args: [targetAddr],
        });
        const jBal = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.trancheVault,
          abi: TRANCHE_VAULT_ABI,
          functionName: "juniorBalances",
          args: [targetAddr],
        });
        const potBal = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.potToken,
          abi: MOCK_POT_ABI,
          functionName: "balanceOf",
          args: [targetAddr],
        });

        setSeniorBalance(Number(sBal / BigInt(1e14)));
        setJuniorBalance(Number(jBal / BigInt(1e14)));
        setPotWalletBalance(Number(potBal / BigInt(1e14)));
      }
    } catch (err) {
      console.warn("Contract read notice: Verify local node/testnet is running.");
    }
  };

  useEffect(() => {
    if (walletAddress) refreshOnChainData();
    const interval = setInterval(() => {
      if (walletAddress && !isSandbox) refreshOnChainData();
    }, 5000);
    return () => clearInterval(interval);
  }, [walletAddress, isSandbox]);

  // Live On-Chain Faucet
  const handleClaimFaucet = async () => {
    if (!walletAddress) return;
    setIsClaimingFaucet(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.potToken,
        abi: MOCK_POT_ABI,
        functionName: "faucet",
        args: [walletAddress, Math14.parse("10000")],
        account: walletAddress,
      });
      console.log("Faucet tx:", hash);
      await refreshOnChainData();
      alert("Claimed 10,000 $POT Testnet Tokens directly on-chain!");
    } catch (err: any) {
      alert(`Faucet error: ${err.message}`);
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  // Live On-Chain Deposit
  const handleDeposit = async (isSenior: boolean, amount: number) => {
    if (isSandbox) {
      if (isSenior) setSbSenior((prev) => prev + amount);
      else setSbJunior((prev) => prev + amount);
      return;
    }
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const parsedAmount = Math14.parse(amount);

      // 1. Approve Vault
      const approveHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.potToken,
        abi: MOCK_POT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.trancheVault, parsedAmount],
        account: walletAddress,
      });
      console.log("Approve tx:", approveHash);

      // 2. Deposit
      const depositHash = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: isSenior ? "depositSenior" : "depositJunior",
        args: [parsedAmount],
        account: walletAddress,
      });
      console.log("Deposit tx:", depositHash);

      await refreshOnChainData();
    } catch (err: any) {
      alert(`Deposit failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Live On-Chain Mint & Fund
  const handleMintAndAdvance = async (data: {
    faceValue: number;
    advance: number;
    debtor: string;
    ipfs: string;
    durationSeconds: number;
  }) => {
    if (isSandbox) {
      const newId = sbInvoices.length + 1;
      setSbInvoices((prev) => [
        ...prev,
        {
          id: newId,
          faceValue: data.faceValue,
          advance: data.advance,
          debtor: data.debtor,
          dueDate: Math.floor(Date.now() / 1000) + data.durationSeconds,
          isOverdue: false,
          status: "Factored",
        },
      ]);
      return;
    }

    if (!walletAddress) {
      await connectWallet();
      return;
    }

    setIsLoading(true);
    try {
      const walletClient = createWalletClient({ chain: TARGET_CHAIN, transport: custom((window as any).ethereum) });
      const publicClient = createPublicClient({ chain: TARGET_CHAIN, transport: http() });

      // 1. Mint NFT on-chain
      const mintTx = await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.invoiceNFT,
        abi: INVOICE_NFT_ABI,
        functionName: "mintInvoice",
        args: [
          data.debtor,
          Math14.parse(data.faceValue),
          Math14.parse(data.advance),
          BigInt(data.durationSeconds),
          data.ipfs,
        ],
        account: walletAddress,
      });
      console.log("Mint tx:", mintTx);

      // Simple mock ID increment for live tracking (or read from mint event)
      const invoiceId = BigInt(invoices.length + 1);

      // 2. Approve Vault for NFT
      await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.invoiceNFT,
        abi: INVOICE_NFT_ABI,
        functionName: "approve",
        args: [CONTRACT_ADDRESSES.trancheVault, invoiceId],
        account: walletAddress,
      });

      // 3. Fund and Advance
      await walletClient.writeContract({
        address: CONTRACT_ADDRESSES.trancheVault,
        abi: TRANCHE_VAULT_ABI,
        functionName: "fundAndAdvanceInvoice",
        args: [invoiceId],
        account: walletAddress,
      });

      const newInv = {
        id: Number(invoiceId),
        faceValue: data.faceValue,
        advance: data.advance,
        debtor: data.debtor,
        dueDate: Math.floor(Date.now() / 1000) + data.durationSeconds,
        isOverdue: false,
        status: "Factored",
      };

      setInvoices((prev) => [...prev, newInv]);
      await refreshOnChainData();
    } catch (err: any) {
      alert(`Mint & Advance failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Live On-Chain Default Trigger
  const handleTriggerDefault = async (id: number) => {
    if (isSandbox) {
      setSbInvoices((prev) =>
        prev.map((inv) => {
          if (inv.id === id) {
            const bounty = inv.faceValue * 0.02;
            setSbBounty((b) => b + bounty);
            setSbJunior((j) => (j > inv.advance + bounty ? j - (inv.advance + bounty) : 0));
            return { ...inv, status: "Defaulted", isOverdue: false };
          }
          return inv;
        })
      );
      return;
    }

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
        args: [BigInt(id)],
        account: walletAddress,
      });

      console.log("Trigger default tx:", tx);
      alert(`Default executed on-chain! Tx: ${tx}\nSubstrate DaaS Relayer is dispatching extrinsic!`);

      setInvoices((prev) =>
        prev.map((inv) => (inv.id === id ? { ...inv, status: "Defaulted", isOverdue: false } : inv))
      );
      await refreshOnChainData();
    } catch (err: any) {
      alert(`Default execution failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <LiveSandboxBanner
        isSandbox={isSandbox}
        setIsSandbox={setIsSandbox}
        onReset={() => {
          setSbSenior(8000);
          setSbJunior(2000);
          setSbBounty(0);
        }}
        walletAddress={walletAddress}
        onConnectWallet={connectWallet}
        onClaimFaucet={handleClaimFaucet}
        isClaimingFaucet={isClaimingFaucet}
      />

      {/* Main Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-indigo-500/20">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-white text-lg tracking-tight">PortaFact</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-800">
                Portaldot V3.0 EVM
              </span>
            </div>
            <p className="text-xs text-gray-400">Autonomous RWA Factoring & Insured Tranche Vault</p>
          </div>
        </div>

        {/* Navigation Tabs */}
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
            <Activity size={14} /> Factoring Advance
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

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8">
        {activeTab === "invest" && (
          <InvestorTab
            isSandbox={isSandbox}
            seniorBalance={isSandbox ? sbSenior : seniorBalance}
            juniorBalance={isSandbox ? sbJunior : juniorBalance}
            seniorVaultTotal={isSandbox ? 8000 : seniorVaultTotal}
            juniorVaultTotal={isSandbox ? 2000 : juniorVaultTotal}
            onDeposit={handleDeposit}
            isLoading={isLoading}
          />
        )}
        {activeTab === "borrow" && (
          <BorrowerTab isSandbox={isSandbox} onMintAndAdvance={handleMintAndAdvance} isLoading={isLoading} />
        )}
        {activeTab === "liquidate" && (
          <LiquidatorTab
            isSandbox={isSandbox}
            invoices={isSandbox ? sbInvoices : invoices}
            callerBountyBalance={isSandbox ? sbBounty : potWalletBalance}
            onFastForwardTime={() => setSbInvoices((prev) => prev.map((i) => ({ ...i, isOverdue: true })))}
            onTriggerDefault={handleTriggerDefault}
            isLoading={isLoading}
          />
        )}
      </main>

      <footer className="border-t border-border bg-surface/30 px-6 py-4 text-center text-xs text-gray-500">
        PortaFact Protocol • Real-World Asset Solvency Engine • Powered by Portaldot Layer-0 DaaS & EVM Pallets
      </footer>
    </div>
  );
}
