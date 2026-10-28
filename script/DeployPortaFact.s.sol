// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Script.sol";
import "../src/tokens/MockPOT.sol";
import "../src/InvoiceNFT.sol";
import "../src/TrancheVault.sol";
import "../src/LiquidationEngine.sol";

contract DeployPortaFact is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "DEPLOYER_PRIVATE_KEY",
            uint256(0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)
        );

        vm.startBroadcast(deployerPrivateKey);

        MockPOT pot = new MockPOT();
        InvoiceNFT invoiceNFT = new InvoiceNFT();
        TrancheVault vault = new TrancheVault(address(pot), address(invoiceNFT));
        LiquidationEngine engine = new LiquidationEngine(address(invoiceNFT), address(vault));

        vault.setLiquidationEngine(address(engine));
        invoiceNFT.setVaultAuthorization(address(vault), true);

        // Seed protocol with mock liquidity
        pot.mint(msg.sender, 500_000 * 1e14);

        vm.stopBroadcast();

        console.log("--------------------------------------------------");
        console.log("PortaFact System Successfully Deployed");
        console.log("POT Token:          ", address(pot));
        console.log("Invoice NFT:        ", address(invoiceNFT));
        console.log("Tranche Vault:      ", address(vault));
        console.log("Liquidation Engine: ", address(engine));
        console.log("--------------------------------------------------");
    }
}
