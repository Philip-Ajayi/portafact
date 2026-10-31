// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "forge-std/Test.sol";
import "../src/libraries/Math14.sol";
import "../src/tokens/MockPOT.sol";
import "../src/InvoiceNFT.sol";
import "../src/TrancheVault.sol";
import "../src/LiquidationEngine.sol";

contract PortaFactTest is Test {
    using Math14 for uint256;

    MockPOT pot;
    InvoiceNFT invoiceNFT;
    TrancheVault vault;
    LiquidationEngine engine;

    address deployer = address(this);
    address borrower = address(0xAA11);
    address seniorInvestor = address(0xBB22);
    address juniorInvestor = address(0xCC33);
    address liquidator = address(0xDD44);

    string debtorSS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

    function setUp() public {
        pot = new MockPOT();
        invoiceNFT = new InvoiceNFT();
        vault = new TrancheVault(address(pot), address(invoiceNFT));
        engine = new LiquidationEngine(address(invoiceNFT), address(vault));

        vault.setLiquidationEngine(address(engine));
        invoiceNFT.setVaultAuthorization(address(vault), true);

        pot.mint(seniorInvestor, 80_000 * 1e14);
        pot.mint(juniorInvestor, 20_000 * 1e14);
        pot.mint(borrower, 15_000 * 1e14);
        pot.mint(liquidator, 10 * 1e14);

        vm.prank(seniorInvestor);
        pot.approve(address(vault), type(uint256).max);

        vm.prank(juniorInvestor);
        pot.approve(address(vault), type(uint256).max);

        vm.prank(borrower);
        pot.approve(address(vault), type(uint256).max);
    }

    function testDepositWithdrawalAndEnumeration() public {
        vm.prank(seniorInvestor);
        vault.depositSenior(5_000 * 1e14);
        assertEq(vault.seniorBalances(seniorInvestor), 5_000 * 1e14);

        vm.prank(seniorInvestor);
        vault.withdrawSenior(2_000 * 1e14);
        assertEq(vault.seniorBalances(seniorInvestor), 3_000 * 1e14);

        vm.startPrank(borrower);
        uint256 id1 = invoiceNFT.mintInvoice(debtorSS58, 1_000 * 1e14, 900 * 1e14, 100, "QmHash1");
        uint256 id2 = invoiceNFT.mintInvoice(debtorSS58, 2_000 * 1e14, 1800 * 1e14, 200, "QmHash2");
        vm.stopPrank();

        assertEq(id1, 1);
        assertEq(id2, 2);
        assertEq(invoiceNFT.totalInvoices(), 2);
    }

    function testRepayInvoiceFullLifecycle() public {
        vm.prank(seniorInvestor);
        vault.depositSenior(8_000 * 1e14);
        vm.prank(juniorInvestor);
        vault.depositJunior(2_000 * 1e14);

        vm.startPrank(borrower);
        uint256 invoiceId = invoiceNFT.mintInvoice(debtorSS58, 10_000 * 1e14, 9_500 * 1e14, 30 days, "QmInvoiceDoc");
        invoiceNFT.approve(address(vault), invoiceId);
        vault.fundAndAdvanceInvoice(invoiceId);
        vm.stopPrank();

        assertEq(pot.balanceOf(borrower), 15_000 * 1e14 + 9_500 * 1e14);

        // Repay full 10,000 POT face value
        vm.prank(borrower);
        vault.repayInvoice(invoiceId);

        (uint256 sDep, uint256 jDep, uint256 sReserve, uint256 jReserve, ) = vault.getVaultAccounting();
        assertEq(sDep, 8_000 * 1e14);
        assertEq(jDep, 2_000 * 1e14);
        assertEq(sReserve, (500 * 1e14 * 3000) / 10000); // 30% of 500 spread = 150 POT
        assertEq(jReserve, 500 * 1e14 - sReserve);
        assertEq(uint256(invoiceNFT.getInvoice(invoiceId).status), uint256(InvoiceNFT.InvoiceStatus.Repaid));
    }

    function testLiquidationEngineWorkout() public {
        vm.prank(seniorInvestor);
        vault.depositSenior(8_000 * 1e14);
        vm.prank(juniorInvestor);
        vault.depositJunior(2_000 * 1e14);

        vm.startPrank(borrower);
        uint256 invoiceId = invoiceNFT.mintInvoice(debtorSS58, 5_000 * 1e14, 1_000 * 1e14, 10, "QmHash");
        invoiceNFT.approve(address(vault), invoiceId);
        vault.fundAndAdvanceInvoice(invoiceId);
        vm.stopPrank();

        vm.warp(block.timestamp + 15);

        uint256 initialLiqBal = pot.balanceOf(liquidator);
        vm.prank(liquidator);
        engine.triggerDefault(invoiceId);

        uint256 bounty = (5_000 * 1e14 * 200) / 10000; // 100 POT
        assertEq(pot.balanceOf(liquidator), initialLiqBal + bounty);
        assertEq(uint256(invoiceNFT.getInvoice(invoiceId).status), uint256(InvoiceNFT.InvoiceStatus.Defaulted));
    }
}