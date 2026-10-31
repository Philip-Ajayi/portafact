import { ethers } from "ethers";
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const EVM_RPC = process.env.PORTALDOT_EVM_RPC || "http://127.0.0.1:8545";
const SUBSTRATE_WS = process.env.SUBSTRATE_WS_RPC || "ws://127.0.0.1:9944";
const LIQUIDATION_ENGINE_ADDRESS =
  process.env.NEXT_PUBLIC_LIQUIDATION_ENGINE_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const SUBSTRATE_SEED = process.env.RELAYER_SUBSTRATE_SEED || "//Alice";

const ENGINE_ABI = [
  "event InvoiceDefaultTriggered(uint256 indexed invoiceId, address indexed caller, uint256 callerBounty, uint256 totalDebtAmount, string debtorSS58, uint256 timestamp)"
];

async function startDaemon() {
  console.log("========================================================");
  console.log("⚡ PortaFact Production Substrate DaaS Relayer Starting");
  console.log(`EVM RPC:        ${EVM_RPC}`);
  console.log(`Substrate WS:   ${SUBSTRATE_WS}`);
  console.log(`Engine Contract: ${LIQUIDATION_ENGINE_ADDRESS}`);
  console.log("========================================================");

  // 1. Establish Real Substrate WebSocket Connection
  const wsProvider = new WsProvider(SUBSTRATE_WS);
  wsProvider.on("error", (err) => {
    console.error(`[Substrate WS Error] Connection error:`, err);
  });

  const substrateApi = await ApiPromise.create({ provider: wsProvider });
  await substrateApi.isReady;

  const keyring = new Keyring({ type: "sr25519" });
  const relayerKeypair = keyring.addFromUri(SUBSTRATE_SEED);

  const [chain, nodeName, nodeVersion] = await Promise.all([
    substrateApi.rpc.system.chain(),
    substrateApi.rpc.system.name(),
    substrateApi.rpc.system.version(),
  ]);

  console.log(`[Substrate] Connected to ${chain} running ${nodeName} v${nodeVersion}`);
  console.log(`[Substrate] Relayer SS58 Address: ${relayerKeypair.address}`);

  // 2. Establish Real EVM JSON-RPC Provider
  const evmProvider = new ethers.JsonRpcProvider(EVM_RPC);
  const network = await evmProvider.getNetwork();
  console.log(`[EVM] Connected to Chain ID: ${network.chainId.toString()}`);

  const engineContract = new ethers.Contract(LIQUIDATION_ENGINE_ADDRESS, ENGINE_ABI, evmProvider);
  console.log(`[EVM] Listening for live InvoiceDefaultTriggered events...`);

  engineContract.on(
    "InvoiceDefaultTriggered",
    async (invoiceId: bigint, caller: string, callerBounty: bigint, totalDebtAmount: bigint, debtorSS58: string, timestamp: bigint) => {
      console.log("\n========================================================");
      console.log(`🚨 LIVE DEFAULT EVENT CAPTURED ON-CHAIN`);
      console.log(`Invoice ID:     #${invoiceId.toString()}`);
      console.log(`Liquidator:     ${caller}`);
      console.log(`Caller Bounty:  ${ethers.formatUnits(callerBounty, 14)} POT`);
      console.log(`Debt Amount:    ${ethers.formatUnits(totalDebtAmount, 14)} POT`);
      console.log(`Debtor SS58:    ${debtorSS58}`);
      console.log(`Timestamp:      ${new Date(Number(timestamp) * 1000).toISOString()}`);
      console.log("========================================================");

      const payload = `DaaS:PORTAFACT:DEBT_DEFAULT:INV=${invoiceId}:AMT=${totalDebtAmount}:DEBTOR=${debtorSS58}`;

      try {
        console.log(`[Substrate DaaS] Submitting extrinsic to Layer-0...`);
        const tx = substrateApi.tx.system.remarkWithEvent
          ? substrateApi.tx.system.remarkWithEvent(payload)
          : substrateApi.tx.system.remark(payload);

        const unsub = await tx.signAndSend(relayerKeypair, ({ status, events, dispatchError }) => {
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = substrateApi.registry.findMetaError(dispatchError.asModule);
              console.error(`[DaaS Dispatch Error] ${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`);
            } else {
              console.error(`[DaaS Dispatch Error] ${dispatchError.toString()}`);
            }
            unsub();
            return;
          }

          if (status.isInBlock) {
            console.log(`[DaaS Confirmed] Extrinsic included in Block Hash: ${status.asInBlock.toHex()}`);
          } else if (status.isFinalized) {
            console.log(`[DaaS Finalized] Extrinsic finalized in Block Hash: ${status.asFinalized.toHex()}`);
            unsub();
          }
        });
      } catch (err) {
        console.error(`[DaaS Relaying Failed]:`, err);
      }
    }
  );
}

startDaemon().catch((err) => {
  console.error("Relayer daemon fatal error:", err);
  process.exit(1);
});