import { defineChain } from "viem";

export const CONTRACT_ADDRESSES = {
  potToken: (process.env.NEXT_PUBLIC_POT_TOKEN_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3") as `0x${string}`,
  invoiceNFT: (process.env.NEXT_PUBLIC_INVOICE_NFT_ADDRESS || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512") as `0x${string}`,
  trancheVault: (process.env.NEXT_PUBLIC_TRANCHE_VAULT_ADDRESS || "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0") as `0x${string}`,
  liquidationEngine: (process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9") as `0x${string}`,
};

export const TARGET_CHAIN = defineChain({
  id: 31337,
  name: "Portaldot EVM Testnet",
  nativeCurrency: { name: "Portaldot Token", symbol: "POT", decimals: 14 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_PORTALDOT_EVM_RPC ||
        process.env.PORTALDOT_EVM_RPC ||
        "http://127.0.0.1:8545",
      ],
    },
  },
});

export const Math14 = {
  SCALE: 10n ** 14n,
  format(val: bigint | number): string {
    const bVal = typeof val === "number" ? BigInt(Math.floor(val)) * (10n ** 14n) : val;
    const intPart = bVal / (10n ** 14n);
    const fracPart = bVal % (10n ** 14n);
    const fracStr = fracPart.toString().padStart(14, "0").slice(0, 2);
    return `${intPart.toLocaleString()}.${fracStr}`;
  },
  parse(val: string | number): bigint {
    const sVal = val.toString();
    const parts = sVal.split(".");
    const intPart = BigInt(parts[0] || "0") * (10n ** 14n);
    let fracPart = 0n;
    if (parts[1]) {
      const padded = parts[1].slice(0, 14).padEnd(14, "0");
      fracPart = BigInt(padded);
    }
    return intPart + fracPart;
  },
};

export const MOCK_POT_ABI = [
  { inputs: [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }], name: "faucet", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const INVOICE_NFT_ABI = [
  { inputs: [{ name: "debtorSS58", type: "string" }, { name: "faceValue", type: "uint256" }, { name: "advanceAmount", type: "uint256" }, { name: "durationInSeconds", type: "uint256" }, { name: "ipfsHash", type: "string" }], name: "mintInvoice", outputs: [{ type: "uint256" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "to", type: "address" }, { name: "tokenId", type: "uint256" }], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "id", type: "uint256" }], name: "getInvoice", outputs: [{ components: [{ name: "id", type: "uint256" }, { name: "borrower", type: "address" }, { name: "debtorSS58", type: "string" }, { name: "faceValue", type: "uint256" }, { name: "advanceAmount", type: "uint256" }, { name: "dueDate", type: "uint256" }, { name: "ipfsHash", type: "string" }, { name: "status", type: "uint8" }], type: "tuple" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ type: "address" }], stateMutability: "view", type: "function" },
] as const;

export const TRANCHE_VAULT_ABI = [
  { inputs: [{ name: "amount", type: "uint256" }], name: "depositSenior", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "amount", type: "uint256" }], name: "depositJunior", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "invoiceId", type: "uint256" }], name: "fundAndAdvanceInvoice", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "seniorDeposits", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "juniorDeposits", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "seniorBalances", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "", type: "address" }], name: "juniorBalances", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
] as const;

export const LIQUIDATION_ENGINE_ABI = [
  { inputs: [{ name: "invoiceId", type: "uint256" }], name: "triggerDefault", outputs: [], stateMutability: "nonpayable", type: "function" },
] as const;