// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./InvoiceNFT.sol";
import "./TrancheVault.sol";
import "./libraries/Math14.sol";

/**
 * @title LiquidationEngine
 * @notice Permissionless engine that triggers workouts, distributes bounties, and notifies DaaS.
 */
contract LiquidationEngine is Ownable, ReentrancyGuard {
    using Math14 for uint256;

    InvoiceNFT public immutable invoiceNFT;
    TrancheVault public immutable trancheVault;

    uint256 public constant BOUNTY_BIPS = 200; // 2% caller bounty

    event InvoiceDefaultTriggered(
        uint256 indexed invoiceId,
        address indexed caller,
        uint256 callerBounty,
        uint256 totalDebtAmount,
        string debtorSS58,
        uint256 timestamp
    );

    constructor(address _invoiceNFT, address _trancheVault) Ownable(msg.sender) {
        invoiceNFT = InvoiceNFT(_invoiceNFT);
        trancheVault = TrancheVault(_trancheVault);
    }

    /**
     * @notice Permissionlessly triggered by any user/liquidator once invoice is overdue.
     */
    function triggerDefault(uint256 invoiceId) external nonReentrant {
        InvoiceNFT.InvoiceData memory inv = invoiceNFT.getInvoice(invoiceId);

        require(inv.status == InvoiceNFT.InvoiceStatus.Factored, "Invoice is not active/factored");
        require(block.timestamp > inv.dueDate, "Invoice has not reached maturity");

        uint256 callerBounty = inv.faceValue.mulBips(BOUNTY_BIPS);

        // Execute loss absorption in vault and disburse bounty to caller
        trancheVault.executeDefaultLoss(invoiceId, msg.sender, callerBounty);

        emit InvoiceDefaultTriggered(
            invoiceId,
            msg.sender,
            callerBounty,
            inv.faceValue,
            inv.debtorSS58,
            block.timestamp
        );
    }
}
