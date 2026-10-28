// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/**
 * @title Math14
 * @notice Fixed-point math library specifically designed for Portaldot 14-decimal $POT tokens.
 * @dev Scale = 1e14. Standard WAD math (1e18) results in a 10,000x decimal displacement.
 */
library Math14 {
    uint256 internal constant SCALE = 1e14;
    uint256 internal constant BIPS_DIVISOR = 10_000;

    error Math14Overflow();
    error Math14ZeroDivision();

    function mul14(uint256 x, uint256 y) internal pure returns (uint256 z) {
        if (x == 0 || y == 0) return 0;
        if (x > type(uint256).max / y) revert Math14Overflow();
        z = (x * y) / SCALE;
    }

    function div14(uint256 x, uint256 y) internal pure returns (uint256 z) {
        if (y == 0) revert Math14ZeroDivision();
        if (x > type(uint256).max / SCALE) revert Math14Overflow();
        z = (x * SCALE) / y;
    }

    function mulBips(uint256 amount, uint256 bips) internal pure returns (uint256) {
        if (amount == 0 || bips == 0) return 0;
        return (amount * bips) / BIPS_DIVISOR;
    }

    function from18to14(uint256 amt18) internal pure returns (uint256) {
        return amt18 / 10_000;
    }

    function from14to18(uint256 amt14) internal pure returns (uint256) {
        return amt14 * 10_000;
    }
}
