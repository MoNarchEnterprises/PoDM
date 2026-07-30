// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract PoDMPaymentProtocol is Ownable, Pausable, ReentrancyGuard {
    address public platformTreasury;
    uint256 public platformFeeBps;

    struct RecurringAllowance {
        uint256 maxAmountPerPeriod;
        uint256 periodInSeconds;
        uint256 lastRenewalAt;
        bool active;
    }

    mapping(address => mapping(address => RecurringAllowance)) public allowances;

    event SubscriptionPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        bytes32 tierIdHash,
        uint256 platformFee,
        uint256 creatorAmount
    );

    event TipPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 creatorAmount
    );

    event PPVPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        bytes32 contentIdHash,
        uint256 platformFee,
        uint256 creatorAmount
    );

    event SubscriptionApproved(
        address indexed fan,
        address indexed creator,
        uint256 maxAmountPerPeriod,
        uint256 periodInSeconds
    );

    event SubscriptionRevoked(address indexed fan, address indexed creator);

    event SubscriptionRenewed(
        address indexed fan,
        address indexed creator,
        uint256 amount,
        uint256 renewedAt
    );

    event PayoutCompleted(address indexed creator, uint256 amount);

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(address _platformTreasury, uint256 _platformFeeBps) Ownable(msg.sender) {
        require(_platformTreasury != address(0), "Invalid treasury address");
        require(_platformFeeBps <= 3000, "Fee cannot exceed 30%");
        platformTreasury = _platformTreasury;
        platformFeeBps = _platformFeeBps;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function setPlatformTreasury(address _newTreasury) external onlyOwner {
        require(_newTreasury != address(0), "Invalid treasury address");
        emit TreasuryUpdated(platformTreasury, _newTreasury);
        platformTreasury = _newTreasury;
    }

    function setPlatformFeeBps(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= 3000, "Fee cannot exceed 30%");
        emit FeeUpdated(platformFeeBps, _newFeeBps);
        platformFeeBps = _newFeeBps;
    }

    function paySubscription(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 tierIdHash
    ) external whenNotPaused nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit SubscriptionPaid(msg.sender, creator, tokenAddress, amount, tierIdHash, platformFee, creatorAmount);
    }

    function payTip(
        address tokenAddress,
        address creator,
        uint256 amount
    ) external whenNotPaused nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit TipPaid(msg.sender, creator, tokenAddress, amount, platformFee, creatorAmount);
    }

    function payPPV(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 contentIdHash
    ) external whenNotPaused nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit PPVPaid(msg.sender, creator, tokenAddress, amount, contentIdHash, platformFee, creatorAmount);
    }

    function approveRecurringSubscription(
        address creator,
        uint256 maxAmountPerPeriod,
        uint256 periodInSeconds
    ) external whenNotPaused {
        require(creator != address(0), "Invalid creator address");
        require(maxAmountPerPeriod > 0, "Amount must be greater than zero");
        require(periodInSeconds >= 1 days, "Period must be at least 1 day");

        allowances[msg.sender][creator] = RecurringAllowance({
            maxAmountPerPeriod: maxAmountPerPeriod,
            periodInSeconds: periodInSeconds,
            lastRenewalAt: block.timestamp,
            active: true
        });

        emit SubscriptionApproved(msg.sender, creator, maxAmountPerPeriod, periodInSeconds);
    }

    function revokeRecurringSubscription(address creator) external {
        require(creator != address(0), "Invalid creator address");
        require(allowances[msg.sender][creator].active, "No active allowance");

        allowances[msg.sender][creator].active = false;

        emit SubscriptionRevoked(msg.sender, creator);
    }

    function processRenewal(
        address tokenAddress,
        address fan,
        address creator,
        uint256 amount
    ) external whenNotPaused nonReentrant returns (bool) {
        RecurringAllowance storage allowance = allowances[fan][creator];
        require(allowance.active, "No active allowance");
        require(amount > 0 && amount <= allowance.maxAmountPerPeriod, "Amount exceeds allowance");
        require(
            block.timestamp >= allowance.lastRenewalAt + allowance.periodInSeconds,
            "Renewal period has not elapsed"
        );

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        require(token.transferFrom(fan, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(fan, creator, creatorAmount), "Creator payout transfer failed");

        allowance.lastRenewalAt = block.timestamp;

        emit SubscriptionRenewed(fan, creator, amount, block.timestamp);
        return true;
    }

    function processPayout(
        address tokenAddress,
        address creator,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        IERC20 token = IERC20(tokenAddress);
        require(token.transfer(creator, amount), "Payout transfer failed");

        emit PayoutCompleted(creator, amount);
    }

    function getAllowance(address fan, address creator) external view returns (RecurringAllowance memory) {
        return allowances[fan][creator];
    }
}
