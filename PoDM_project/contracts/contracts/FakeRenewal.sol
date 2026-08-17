// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Minimal fixture that emits the exact SubscriptionRenewed(bytes32,address,address,uint256,uint256)
// event the renewSubscriptions job's verifyRenewalReceipt checks, and reverts on
// demand so the reverted-on-chain recovery path can be exercised. Used only for
// local RPC testing of the renewal state machine; never deployed to a real network.
contract FakeRenewal {
    event SubscriptionRenewed(
        bytes32 indexed renewalId,
        address indexed fan,
        address indexed creator,
        uint256 amount,
        uint256 renewedAt
    );

    address public keeper;
    bool public revertNext;
    // Total successful processRenewal calls — lets tests assert "exactly one charge".
    uint256 public renewCount;
    mapping(bytes32 => bool) public processedRenewals;

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
        bytes32 renewalId,
        address tokenAddress,
        address fan,
        address creator,
        uint256 amount,
        address referrer,
        uint256 customPlatformFeeBps
    ) external returns (bool) {
        require(msg.sender == keeper, "Not authorized keeper");
        require(renewalId != bytes32(0), "Invalid renewal ID");
        require(!processedRenewals[renewalId], "Renewal already processed");
        if (revertNext) {
            revertNext = false;
            revert("intentional revert for renewal test");
        }
        processedRenewals[renewalId] = true;
        renewCount += 1;
        emit SubscriptionRenewed(renewalId, fan, creator, amount, block.timestamp);
        return true;
    }
}