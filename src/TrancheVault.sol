// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./libraries/Math14.sol";
import "./InvoiceNFT.sol";

/**
 * @title TrancheVault
 * @notice Dual-tranche liquidity pool with first-loss default absorption and 14-decimal accounting.
 */
contract TrancheVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math14 for uint256;

    IERC20 public immutable potToken;
    InvoiceNFT public immutable invoiceNFT;
    address public liquidationEngine;

    // Tranche accounting
    uint256 public seniorDeposits;
    uint256 public juniorDeposits;
    uint256 public seniorYieldReserve;
    uint256 public juniorYieldReserve;

    uint256 public constant SENIOR_TARGET_APY_BIPS = 800;  // 8.00% fixed target
    uint256 public constant PROTOCOL_SAFETY_BIPS = 500;    // 5.00% safety buffer

    mapping(address => uint256) public seniorBalances;
    mapping(address => uint256) public juniorBalances;
    mapping(uint256 => bool) public activeFactoredInvoices;

    event Deposited(address indexed user, bool isSenior, uint256 amount);
    event Withdrawn(address indexed user, bool isSenior, uint256 amount);
    event AdvanceDisbursed(uint256 indexed invoiceId, address indexed borrower, uint256 amount);
    event InvoiceSettled(uint256 indexed invoiceId, uint256 repaymentAmount);
    event DefaultAbsorptionExecuted(uint256 indexed invoiceId, uint256 lossCoveredByJunior, uint256 bountyPaid);

    modifier onlyLiquidationEngine() {
        require(msg.sender == liquidationEngine, "Only LiquidationEngine permitted");
        _;
    }

    constructor(address _potToken, address _invoiceNFT) Ownable(msg.sender) {
        potToken = IERC20(_potToken);
        invoiceNFT = InvoiceNFT(_invoiceNFT);
    }

    function setLiquidationEngine(address _engine) external onlyOwner {
        liquidationEngine = _engine;
    }

    function depositSenior(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        potToken.safeTransferFrom(msg.sender, address(this), amount);
        seniorDeposits += amount;
        seniorBalances[msg.sender] += amount;
        emit Deposited(msg.sender, true, amount);
    }

    function depositJunior(uint256 amount) external nonReentrant {
        require(amount > 0, "Invalid amount");
        potToken.safeTransferFrom(msg.sender, address(this), amount);
        juniorDeposits += amount;
        juniorBalances[msg.sender] += amount;
        emit Deposited(msg.sender, false, amount);
    }

    function withdrawSenior(uint256 amount) external nonReentrant {
        require(seniorBalances[msg.sender] >= amount, "Insufficient senior balance");
        seniorBalances[msg.sender] -= amount;
        seniorDeposits -= amount;
        potToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, true, amount);
    }

    function withdrawJunior(uint256 amount) external nonReentrant {
        require(juniorBalances[msg.sender] >= amount, "Insufficient junior balance");
        juniorBalances[msg.sender] -= amount;
        juniorDeposits -= amount;
        potToken.safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, false, amount);
    }

    function fundAndAdvanceInvoice(uint256 invoiceId) external nonReentrant {
        InvoiceNFT.InvoiceData memory inv = invoiceNFT.getInvoice(invoiceId);
        require(inv.status == InvoiceNFT.InvoiceStatus.Active, "Invoice not active");
        require(invoiceNFT.ownerOf(invoiceId) == msg.sender, "Caller must own invoice");

        uint256 totalAvailable = seniorDeposits + juniorDeposits;
        require(totalAvailable >= inv.advanceAmount, "Insufficient vault liquidity");

        // Lock NFT into vault
        invoiceNFT.transferFrom(msg.sender, address(this), invoiceId);
        invoiceNFT.updateStatus(invoiceId, InvoiceNFT.InvoiceStatus.Factored);
        activeFactoredInvoices[invoiceId] = true;

        // Disburse liquidity to borrower
        potToken.safeTransfer(inv.borrower, inv.advanceAmount);
        emit AdvanceDisbursed(invoiceId, inv.borrower, inv.advanceAmount);
    }

    function repayInvoice(uint256 invoiceId) external nonReentrant {
        InvoiceNFT.InvoiceData memory inv = invoiceNFT.getInvoice(invoiceId);
        require(activeFactoredInvoices[invoiceId], "Invoice not currently factored");

        uint256 fullRepayment = inv.faceValue;
        potToken.safeTransferFrom(msg.sender, address(this), fullRepayment);

        uint256 grossProfit = fullRepayment - inv.advanceAmount;
        // Senior receives fixed fee fraction; junior absorbs excess margin
        uint256 seniorYieldShare = grossProfit.mulBips(3000); // 30% of factoring spread
        uint256 juniorYieldShare = grossProfit - seniorYieldShare;

        seniorYieldReserve += seniorYieldShare;
        juniorYieldReserve += juniorYieldShare;
        activeFactoredInvoices[invoiceId] = false;

        invoiceNFT.updateStatus(invoiceId, InvoiceNFT.InvoiceStatus.Repaid);
        emit InvoiceSettled(invoiceId, fullRepayment);
    }

    function executeDefaultLoss(
        uint256 invoiceId,
        address bountyRecipient,
        uint256 bountyAmount
    ) external onlyLiquidationEngine nonReentrant {
        InvoiceNFT.InvoiceData memory inv = invoiceNFT.getInvoice(invoiceId);
        require(activeFactoredInvoices[invoiceId], "Invoice not currently active/factored");

        uint256 unrecoveredAdvance = inv.advanceAmount;
        uint256 totalJuniorLoss = unrecoveredAdvance + bountyAmount;

        // Junior absorbs default first
        if (juniorDeposits >= totalJuniorLoss) {
            juniorDeposits -= totalJuniorLoss;
        } else {
            uint256 remainingLoss = totalJuniorLoss - juniorDeposits;
            juniorDeposits = 0;
            // Extreme tail-risk: senior only absorbs if junior is fully wiped out
            if (seniorDeposits > remainingLoss) {
                seniorDeposits -= remainingLoss;
            } else {
                seniorDeposits = 0;
            }
        }

        activeFactoredInvoices[invoiceId] = false;
        invoiceNFT.updateStatus(invoiceId, InvoiceNFT.InvoiceStatus.Defaulted);

        // Transfer liquidator bounty
        potToken.safeTransfer(bountyRecipient, bountyAmount);

        emit DefaultAbsorptionExecuted(invoiceId, totalJuniorLoss, bountyAmount);
    }
}
