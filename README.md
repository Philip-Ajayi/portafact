# PortaFact: Autonomous RWA Invoice Factoring & Default-Insured Tranche Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Foundry](https://img.shields.io/badge/Foundry-Solidity%200.8.24-orange.svg)](https://getfoundry.sh/)
[![Portaldot EVM](https://img.shields.io/badge/Portaldot-V3.0%20EVM-purple.svg)](https://portaldot.network)

PortaFact bridges real-world SME factoring with on-chain dual-tranche capital pools, featuring automated default workouts and Layer-0 Default-as-a-Service (DaaS) arbitration.

---

## Architecture Highlights
1. **Precision 14-Decimal Math (`Math14.sol`)**: Tailored specifically for Portaldot native `$POT` token arithmetic (`1e14`), preventing the 10,000x decimal mismatch caused by standard 18-decimal libraries.
2. **Dual-Tranche Capital Protection (`TrancheVault.sol`)**:
   - **Senior Tranche (80%)**: Fixed target yield (8%), principal preserved by first-loss buffer.
   - **Junior Tranche (20%)**: First-loss absorption, receives protocol factoring fees and high variable upside (22%).
3. **Permissionless Liquidation Engine (`LiquidationEngine.sol`)**: Overdue invoices can be triggered by *any* wallet on-chain, immediately granting a 2% caller bounty in `$POT` and emitting events for Substrate Layer-0 dispute settlement.
4. **Substrate DaaS Relayer (`daas-relayer.ts`)**: Bridges EVM defaults to Portaldot's native Layer-0 debt auction module.
5. **Interactive Judge Sandbox**: The included Next.js interface features a live test mode that allows evaluators to simulate the complete lifecycle in 60 seconds directly in the browser or on live testnet.

---

## Quickstart (Local Dev & Test)

### 1. Requirements
- Node.js >= 18.x
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`)

### 2. Contract Build & Tests
```bash
git clone https://github.com/team/portafact-protocol.git
cd portafact-protocol
forge install foundry-rs/forge-std openzeppelin/openzeppelin-contracts --no-commit
forge test -vvv
```

### 3. Deploy Local Contracts
```bash
# In terminal 1 (start local EVM node or anvil with 14-decimal support):
anvil --chain-id 31337

# In terminal 2:
forge script script/DeployPortaFact.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 4. Run DaaS Event Relayer
```bash
cd relayer
npm install
npm run start
```

### 5. Run Web Interface
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the UI and interactive sandbox.
