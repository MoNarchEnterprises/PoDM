// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal fixture that emits the exact SubscriptionRenewed(address,address,uint256,uint256)
// event the renewSubscriptions job's verifyRenewalReceipt checks, and reverts on
// demand so the reverted-on-chain recovery path can be exercised. Used only for
// local RPC testing of the renewal state machine; never deployed to a real network.
contract FakeRenewal {
    event SubscriptionRenewed(address indexed fan, address indexed creator, uint256 amount, uint256 renewedAt);

    address public keeper;
    bool public revertNext;
    // Total successful processRenewal calls — lets tests assert "exactly one charge".
    uint256 public renewCount;

    constructor(address _keeper) {
        keeper = _keeper;
    }

    function setKeeper(address _keeper) external {
        keeper = _keeper;
    }

    function setRevertNext(bool _revert) external {
        revertNext = _revert;
    }

    // Mirrors processRenewal's emitted event. Only the keeper may call it.
    function processRenewal(
        address tokenAddress,
        address fan,
        address creator,
        uint256 amount,
        address referrer,
        uint256 customPlatformFeeBps
    ) external returns (bool) {
        require(msg.sender == keeper, "Not authorized keeper");
        if (revertNext) {
            revertNext = false;
            revert("intentional revert for renewal test");
        }
        renewCount += 1;
        emit SubscriptionRenewed(fan, creator, amount, block.timestamp);
        return true;
    }
}