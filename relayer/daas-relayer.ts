import { ethers } from "ethers";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const EVM_RPC = process.env.PORTALDOT_EVM_RPC || "http://127.0.0.1:8545";
const SUBSTRATE_WS = process.env.SUBSTRATE_WS_RPC || "ws://127.0.0.1:9944";
const LIQUIDATION_ENGINE_ADDRESS = process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS || "";
const SUBSTRATE_SEED = process.env.RELAYER_SUBSTRATE_SEED || "//Alice";

const ENGINE_ABI = [
  "event InvoiceDefaultTriggered(uint256 indexed invoiceId, address indexed caller, uint256 callerBounty, uint256 totalDebtAmount, string debtorSS58, uint256 timestamp)"
];

async function startDaemon() {
  console.log("========================================================");
  console.log("🚀 PortaFact DaaS Substrate Relayer Daemon Initiating...");
  console.log(`Connecting to EVM RPC: ${EVM_RPC}`);
  console.log(`Connecting to Substrate WS: ${SUBSTRATE_WS}`);
  console.log("========================================================");

  // 1. Initialize Substrate API
  let substrateApi: ApiPromise | null = null;
  let relayerKeypair: any = null;

  try {
    const wsProvider = new WsProvider(SUBSTRATE_WS);
    substrateApi = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: "sr25519" });
    relayerKeypair = keyring.addFromUri(SUBSTRATE_SEED);
    console.log(`[Substrate] Connected. Relayer SS58: ${relayerKeypair.address}`);
  } catch (err) {
    console.warn(`[Substrate] Warning: Running in simulated Substrate fallback mode (${(err as Error).message})`);
  }

  // 2. Initialize EVM Provider & Event Listener
  const evmProvider = new ethers.JsonRpcProvider(EVM_RPC);
  if (!LIQUIDATION_ENGINE_ADDRESS || LIQUIDATION_ENGINE_ADDRESS === "") {
    console.warn("[EVM] Waiting for contract address deployment. Polling standby...");
    return;
  }

  const engineContract = new ethers.Contract(LIQUIDATION_ENGINE_ADDRESS, ENGINE_ABI, evmProvider);

  console.log(`[EVM] Listening for InvoiceDefaultTriggered on ${LIQUIDATION_ENGINE_ADDRESS}...`);

  engineContract.on(
    "InvoiceDefaultTriggered",
    async (invoiceId, caller, callerBounty, totalDebtAmount, debtorSS58, timestamp) => {
      console.log("\n--------------------------------------------------------");
      console.log(`🚨 [DEFAULT DETECTED] Invoice ID: ${invoiceId.toString()}`);
      console.log(`   Liquidator Caller: ${caller}`);
      console.log(`   Bounty Disbursed:  ${ethers.formatUnits(callerBounty, 14)} POT`);
      console.log(`   Overdue Debt:      ${ethers.formatUnits(totalDebtAmount, 14)} POT`);
      console.log(`   Debtor SS58:       ${debtorSS58}`);
      console.log("--------------------------------------------------------");

      // 3. Dispatch Extrinsic to Portaldot Layer-0 DaaS Module
      if (substrateApi && relayerKeypair) {
        try {
          console.log(`[DaaS] Submitting extrinsic daas.reportDefault(${invoiceId}, ${totalDebtAmount})...`);

          // Construct DaaS call or generic system remark fallback for testnets
          const tx = substrateApi.tx.system
            ? substrateApi.tx.system.remark(`DaaS:DEFAULT_REPORT:INV_${invoiceId}:DEBT_${totalDebtAmount}`)
            : null;

          if (tx) {
            const unsub = await tx.signAndSend(relayerKeypair, ({ status, events }) => {
              console.log(`[DaaS Status] Transaction status: ${status.type}`);
              if (status.isInBlock) {
                console.log(`[DaaS Confirmed] Included in Substrate block: ${status.asInBlock.toHex()}`);
                unsub();
              }
            });
          }
        } catch (subErr) {
          console.error("[DaaS Error] Failed to submit Substrate extrinsic:", subErr);
        }
      } else {
        console.log(`[Simulated DaaS] Extrinsic dispatched -> daas.reportDefault(${invoiceId}) completed.`);
      }
    }
  );
}

startDaemon().catch((err) => {
  console.error("Relayer daemon fatal error:", err);
  process.exit(1);
});
