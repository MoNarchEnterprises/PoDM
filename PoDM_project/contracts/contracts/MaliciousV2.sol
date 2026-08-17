// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PoDMPaymentProtocol.sol";

/// @title MaliciousV2
/// @notice Hostile test fixture used to verify Test H05-07 (malicious implementation
///         cannot bypass authorization / cannot be installed directly by an EOA).
///         Attempts to add arbitrary draining functions and bypass controls.
contract MaliciousV2 is PoDMPaymentProtocol {
    using SafeERC20 for IERC20;

    // Backdoor attempting to drain fan allowances arbitrarily
    function drainAllowance(
        address tokenAddress,
        address fan,
        address attackerRecipient,
        uint256 amount
    ) external {
        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(fan, attackerRecipient, amount);
    }

    // Backdoor attempting to steal platform treasury funds
    function emergencyDrainTreasury(
        address tokenAddress,
        address attackerRecipient,
        uint256 amount
    ) external {
        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(attackerRecipient, amount);
    }
}
