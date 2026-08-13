// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PoDMPaymentProtocol is Initializable, OwnableUpgradeable, PausableUpgradeable, ReentrancyGuard, UUPSUpgradeable {
    using SafeERC20 for IERC20;

    address public platformTreasury;
    uint256 public platformFeeBps;
    uint256 public referralFeeBps;

    struct RecurringAllowance {
        uint256 maxAmountPerPeriod;
        uint256 periodInSeconds;
        uint256 lastRenewalAt;
        bool active;
    }

    mapping(address => mapping(address => RecurringAllowance)) public allowances;

    mapping(address => bool) public keepers;

    address public usdcToken;

    event KeeperUpdated(address indexed keeper, bool active);
    event UsdcTokenUpdated(address indexed oldUsdc, address indexed newUsdc);

    modifier onlyKeeper() {
        require(keepers[msg.sender] || msg.sender == owner(), "Not authorized keeper");
        _;
    }

    modifier onlyUsdc(address tokenAddress) {
        require(usdcToken != address(0), "USDC token not configured");
        require(tokenAddress == usdcToken, "Only canonical USDC payments supported");
        _;
    }

    function setKeeper(address _keeper, bool _active) external onlyOwner {
        require(_keeper != address(0), "Invalid keeper address");
        keepers[_keeper] = _active;
        emit KeeperUpdated(_keeper, _active);
    }

    function setUsdcToken(address _usdcToken) external onlyOwner {
        require(_usdcToken != address(0), "Invalid USDC address");
        emit UsdcTokenUpdated(usdcToken, _usdcToken);
        usdcToken = _usdcToken;
    }

    event SubscriptionPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        bytes32 tierIdHash,
        uint256 platformFee,
        uint256 referralFee,
        uint256 creatorAmount,
        address referrer
    );

    event TipPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        uint256 platformFee,
        uint256 referralFee,
        uint256 creatorAmount,
        address referrer
    );

    event PPVPaid(
        address indexed fan,
        address indexed creator,
        address indexed token,
        uint256 totalAmount,
        bytes32 contentIdHash,
        uint256 platformFee,
        uint256 referralFee,
        uint256 creatorAmount,
        address referrer
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
    event ReferralFeeUpdated(uint256 oldFee, uint256 newFee);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address _platformTreasury, uint256 _platformFeeBps) public initializer {
        require(_platformTreasury != address(0), "Invalid treasury address");
        require(_platformFeeBps <= 3000, "Fee cannot exceed 30%");
        __Ownable_init(msg.sender);
        __Pausable_init();
        platformTreasury = _platformTreasury;
        platformFeeBps = _platformFeeBps;
        referralFeeBps = 100;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

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

    function setReferralFeeBps(uint256 _newFeeBps) external onlyOwner {
        require(_newFeeBps <= platformFeeBps, "Referral fee cannot exceed platform fee");
        emit ReferralFeeUpdated(referralFeeBps, _newFeeBps);
        referralFeeBps = _newFeeBps;
    }

    /**
     * Compute the fee split for a payment. The referral fee is taken from the
     * platform commission, so the creator's payout is never reduced.
     * If customPlatformFeeBps is 0, defaults to contract platformFeeBps.
     * Returns (treasuryFee, referralFee, creatorAmount).
     */
    function _computeFeeSplit(
        uint256 amount,
        address referrer,
        uint256 customPlatformFeeBps
    ) internal view returns (uint256, uint256, uint256) {
        uint256 feeBps = customPlatformFeeBps;
        if (feeBps == 0) {
            feeBps = platformFeeBps;
        }
        require(feeBps <= 3000, "Fee cannot exceed 30%");

        uint256 platformFee = (amount * feeBps) / 10000;
        uint256 referralFee = 0;
        if (referrer != address(0)) {
            referralFee = (amount * referralFeeBps) / 10000;
            if (referralFee > platformFee) {
                referralFee = platformFee;
            }
        }
        return (platformFee - referralFee, referralFee, amount - platformFee);
    }

    function paySubscription(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 tierIdHash,
        address referrer,
        uint256 customPlatformFeeBps
    ) external whenNotPaused nonReentrant onlyUsdc(tokenAddress) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        (uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, referrer, customPlatformFeeBps);

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
        token.safeTransferFrom(msg.sender, creator, creatorAmount);
        if (referralFee > 0) {
            token.safeTransferFrom(msg.sender, referrer, referralFee);
        }

        emit SubscriptionPaid(msg.sender, creator, tokenAddress, amount, tierIdHash, treasuryFee + referralFee, referralFee, creatorAmount, referrer);
    }

    function payTip(
        address tokenAddress,
        address creator,
        uint256 amount,
        address referrer,
        uint256 customPlatformFeeBps
    ) external whenNotPaused nonReentrant onlyUsdc(tokenAddress) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        (uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, referrer, customPlatformFeeBps);

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
        token.safeTransferFrom(msg.sender, creator, creatorAmount);
        if (referralFee > 0) {
            token.safeTransferFrom(msg.sender, referrer, referralFee);
        }

        emit TipPaid(msg.sender, creator, tokenAddress, amount, treasuryFee + referralFee, referralFee, creatorAmount, referrer);
    }

    function payPPV(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 contentIdHash,
        address referrer,
        uint256 customPlatformFeeBps
    ) external whenNotPaused nonReentrant onlyUsdc(tokenAddress) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        (uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, referrer, customPlatformFeeBps);

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(msg.sender, platformTreasury, treasuryFee);
        token.safeTransferFrom(msg.sender, creator, creatorAmount);
        if (referralFee > 0) {
            token.safeTransferFrom(msg.sender, referrer, referralFee);
        }

        emit PPVPaid(msg.sender, creator, tokenAddress, amount, contentIdHash, treasuryFee + referralFee, referralFee, creatorAmount, referrer);
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
        uint256 amount,
        address referrer,
        uint256 customPlatformFeeBps
    ) external whenNotPaused nonReentrant onlyKeeper onlyUsdc(tokenAddress) returns (bool) {
        RecurringAllowance storage allowance = allowances[fan][creator];
        require(allowance.active, "No active allowance");
        require(amount > 0 && amount <= allowance.maxAmountPerPeriod, "Amount exceeds allowance");
        require(
            block.timestamp >= allowance.lastRenewalAt + allowance.periodInSeconds,
            "Renewal period has not elapsed"
        );

        (uint256 treasuryFee, uint256 referralFee, uint256 creatorAmount) = _computeFeeSplit(amount, referrer, customPlatformFeeBps);

        IERC20 token = IERC20(tokenAddress);
        token.safeTransferFrom(fan, platformTreasury, treasuryFee);
        token.safeTransferFrom(fan, creator, creatorAmount);
        if (referralFee > 0) {
            token.safeTransferFrom(fan, referrer, referralFee);
        }

        allowance.lastRenewalAt = block.timestamp;

        emit SubscriptionRenewed(fan, creator, amount, block.timestamp);
        return true;
    }

    function processPayout(
        address tokenAddress,
        address creator,
        uint256 amount
    ) external onlyOwner whenNotPaused nonReentrant onlyUsdc(tokenAddress) {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        IERC20 token = IERC20(tokenAddress);
        token.safeTransfer(creator, amount);

        emit PayoutCompleted(creator, amount);
    }

    function getAllowance(address fan, address creator) external view returns (RecurringAllowance memory) {
        return allowances[fan][creator];
    }
}
