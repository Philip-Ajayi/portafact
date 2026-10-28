// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title InvoiceNFT
 * @notice Represents legal factoring receivables with linked Portaldot Substrate SS58 identities.
 */
contract InvoiceNFT is ERC721URIStorage, Ownable {
    enum InvoiceStatus { Active, Factored, Repaid, Defaulted }

    struct InvoiceData {
        uint256 id;
        address borrower;
        string debtorSS58;
        uint256 faceValue;      // 14 decimals
        uint256 advanceAmount;  // 14 decimals
        uint256 dueDate;        // Unix timestamp
        string ipfsHash;
        InvoiceStatus status;
    }

    uint256 private _tokenIdTracker;
    mapping(uint256 => InvoiceData) public invoices;
    mapping(address => bool) public authorizedVaults;

    event InvoiceMinted(
        uint256 indexed id,
        address indexed borrower,
        string debtorSS58,
        uint256 faceValue,
        uint256 dueDate,
        string ipfsHash
    );
    event InvoiceStatusUpdated(uint256 indexed id, InvoiceStatus status);

    modifier onlyVault() {
        require(authorizedVaults[msg.sender], "Caller is not authorized vault");
        _;
    }

    constructor() ERC721("PortaFact Invoice Receivable", "PF-INV") Ownable(msg.sender) {}

    function setVaultAuthorization(address vault, bool authorized) external onlyOwner {
        authorizedVaults[vault] = authorized;
    }

    function mintInvoice(
        string memory debtorSS58,
        uint256 faceValue,
        uint256 advanceAmount,
        uint256 durationInSeconds,
        string memory ipfsHash
    ) external returns (uint256) {
        require(faceValue > 0, "Invalid face value");
        require(advanceAmount < faceValue, "Advance must be less than face value");
        require(durationInSeconds > 0, "Invalid duration");

        _tokenIdTracker += 1;
        uint256 newId = _tokenIdTracker;

        _safeMint(msg.sender, newId);
        _setTokenURI(newId, string(abi.encodePacked("ipfs://", ipfsHash)));

        invoices[newId] = InvoiceData({
            id: newId,
            borrower: msg.sender,
            debtorSS58: debtorSS58,
            faceValue: faceValue,
            advanceAmount: advanceAmount,
            dueDate: block.timestamp + durationInSeconds,
            ipfsHash: ipfsHash,
            status: InvoiceStatus.Active
        });

        emit InvoiceMinted(newId, msg.sender, debtorSS58, faceValue, block.timestamp + durationInSeconds, ipfsHash);
        return newId;
    }

    function updateStatus(uint256 id, InvoiceStatus status) external onlyVault {
        require(_ownerOf(id) != address(0), "Invoice does not exist");
        invoices[id].status = status;
        emit InvoiceStatusUpdated(id, status);
    }

    function getInvoice(uint256 id) external view returns (InvoiceData memory) {
        require(_ownerOf(id) != address(0), "Invoice does not exist");
        return invoices[id];
    }
}
