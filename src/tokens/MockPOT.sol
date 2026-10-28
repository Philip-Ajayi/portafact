// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockPOT
 * @notice Mock implementation of Portaldot native token with 14 decimal places.
 */
contract MockPOT is ERC20, Ownable {
    constructor() ERC20("Portaldot Token", "POT") Ownable(msg.sender) {
        _mint(msg.sender, 1_000_000 * 1e14); // 1 Million POT initial supply
    }

    function decimals() public pure override returns (uint8) {
        return 14;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet(address to, uint256 amount) external {
        require(amount <= 50_000 * 1e14, "Exceeds faucet max limit");
        _mint(to, amount);
    }
}
