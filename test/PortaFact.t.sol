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

    string debtorSS58 = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"; // Alice Substrate SS58

    function setUp() public {
        pot = new MockPOT();
        invoiceNFT = new InvoiceNFT();
        vault = new TrancheVault(address(pot), address(invoiceNFT));
        engine = new LiquidationEngine(address(invoiceNFT), address(vault));

        vault.setLiquidationEngine(address(engine));
        invoiceNFT.setVaultAuthorization(address(vault), true);

        // Fund accounts (14 decimal POT tokens)
        pot.mint(seniorInvestor, 80_000 * 1e14);
        pot.mint(juniorInvestor, 20_000 * 1e14);
        pot.mint(liquidator, 10 * 1e14); // small gas buffer

        vm.prank(seniorInvestor);
        pot.approve(address(vault), type(uint256).max);

        vm.prank(juniorInvestor);
        pot.approve(address(vault), type(uint256).max);
    }

    function testMath14Scaling() public pure {
        uint256 a = 10_000 * 1e14;
        uint256 b = 2 * 1e14;
        uint256 multiplied = a.mul14(b);
        assertEq(multiplied, 20_000 * 1e14);

        uint256 bipsResult = a.mulBips(200); // 2%
        assertEq(bipsResult, 200 * 1e14);
    }

    function testTrancheDepositAndBorrowerAdvance() public {
        vm.prank(seniorInvestor);
        vault.depositSenior(8_000 * 1e14);

        vm.prank(juniorInvestor);
        vault.depositJunior(2_000 * 1e14);

        assertEq(vault.seniorDeposits(), 8_000 * 1e14);
        assertEq(vault.juniorDeposits(), 2_000 * 1e14);

        // Borrower mints invoice for 10,000 POT face value, 9,500 advance, 30 days duration
        vm.startPrank(borrower);
        uint256 invoiceId = invoiceNFT.mintInvoice(
            debtorSS58,
            10_000 * 1e14,
            9_500 * 1e14,
            30 days,
            "QmZtmD2qt8fJpq3rZZhDM58nQ4BEdcDFu83"
        );
        invoiceNFT.approve(address(vault), invoiceId);
        vault.fundAndAdvanceInvoice(invoiceId);
        vm.stopPrank();

        assertEq(pot.balanceOf(borrower), 9_500 * 1e14);
        assertEq(uint256(invoiceNFT.getInvoice(invoiceId).status), uint256(InvoiceNFT.InvoiceStatus.Factored));
    }

    function testPermissionlessDefaultWorkoutAndLiquidatorBounty() public {
        // Setup positions
        vm.prank(seniorInvestor);
        vault.depositSenior(8_000 * 1e14);

        vm.prank(juniorInvestor);
        vault.depositJunior(2_000 * 1e14);

        vm.startPrank(borrower);
        uint256 invoiceId = invoiceNFT.mintInvoice(
            debtorSS58,
            10_000 * 1e14,
            1_500 * 1e14, // Advance is safely within junior coverage
            30 days,
            "QmZtmD2qt8fJpq3rZZhDM58nQ4BEdcDFu83"
        );
        invoiceNFT.approve(address(vault), invoiceId);
        vault.fundAndAdvanceInvoice(invoiceId);
        vm.stopPrank();

        // Warp time beyond 30 days maturity
        vm.warp(block.timestamp + 31 days);

        uint256 liquidatorBalanceBefore = pot.balanceOf(liquidator);

        // Independent liquidator calls permissionless liquidation
        vm.prank(liquidator);
        engine.triggerDefault(invoiceId);

        // 2% of 10,000 POT = 200 POT bounty paid directly to liquidator
        uint256 expectedBounty = 200 * 1e14;
        assertEq(pot.balanceOf(liquidator), liquidatorBalanceBefore + expectedBounty);

        // Senior principal remains 100% intact!
        assertEq(vault.seniorDeposits(), 8_000 * 1e14);
        // Junior deposits absorbed the loss (1,500 advance + 200 bounty = 1,700 loss)
        assertEq(vault.juniorDeposits(), 2_000 * 1e14 - 1_700 * 1e14);
        assertEq(uint256(invoiceNFT.getInvoice(invoiceId).status), uint256(InvoiceNFT.InvoiceStatus.Defaulted));
    }
}
