// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Interface for standard ERC-20 token transfers (USDC)
 */
interface IERC20 {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title PoDMPaymentProtocol
 * @dev Lightweight payment splitter and event logging contract for subscriptions, tips, and PPV
 */
contract PoDMPaymentProtocol {
    address public owner;
    address public platformTreasury;
    uint256 public platformFeeBps; // Base points (e.g., 1000 = 10.00%)

    // For privacy, tierId and contentId references are emitted as abstract bytes32 hashes
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

    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    constructor(address _platformTreasury, uint256 _platformFeeBps) {
        owner = msg.sender;
        platformTreasury = _platformTreasury;
        platformFeeBps = _platformFeeBps;
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

    /**
     * @dev Process subscription payment and split proceeds between creator and platform treasury
     */
    function paySubscription(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 tierIdHash
    ) external {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        
        // Split and transfer tokens directly from fan's wallet
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit SubscriptionPaid(msg.sender, creator, tokenAddress, amount, tierIdHash, platformFee, creatorAmount);
    }

    /**
     * @dev Process tip payment and split proceeds between creator and platform treasury
     */
    function payTip(
        address tokenAddress,
        address creator,
        uint256 amount
    ) external {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        
        // Split and transfer tokens directly from fan's wallet
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit TipPaid(msg.sender, creator, tokenAddress, amount, platformFee, creatorAmount);
    }

    /**
     * @dev Process PPV purchase and split proceeds between creator and platform treasury
     */
    function payPPV(
        address tokenAddress,
        address creator,
        uint256 amount,
        bytes32 contentIdHash
    ) external {
        require(creator != address(0), "Invalid creator address");
        require(amount > 0, "Amount must be greater than zero");

        uint256 platformFee = (amount * platformFeeBps) / 10000;
        uint256 creatorAmount = amount - platformFee;

        IERC20 token = IERC20(tokenAddress);
        
        // Split and transfer tokens directly from fan's wallet
        require(token.transferFrom(msg.sender, platformTreasury, platformFee), "Platform fee transfer failed");
        require(token.transferFrom(msg.sender, creator, creatorAmount), "Creator payout transfer failed");

        emit PPVPaid(msg.sender, creator, tokenAddress, amount, contentIdHash, platformFee, creatorAmount);
    }
}
