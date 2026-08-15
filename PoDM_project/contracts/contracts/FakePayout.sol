// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal fixture that emits the exact PayoutCompleted(address,uint256) event
// the reconcilePayoutReservations job scans for. Used only for local RPC testing
// of the on-chain-fate resolution path; never deployed to a real network.
contract FakePayout {
    event PayoutCompleted(address indexed creator, uint256 amount);

    function emitPayout(address creator, uint256 amountMicro) external {
        emit PayoutCompleted(creator, amountMicro);
    }

    function revertTx() external pure {
        revert('intentional revert for reconciler test');
    }
}