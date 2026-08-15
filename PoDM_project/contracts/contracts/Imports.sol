// SPDX-License-Identifier: MIT
// Centralized imports so Hardhat compiles artifacts for OZ modules that the
// project uses via the deploy/upgrade ritual and the contract tests, but
// that are NOT directly imported from PoDMPaymentProtocol.sol. Removing or
// trimming this file will break the deploy/upgrade scripts and the
// TimelockController-backed tests.
pragma solidity ^0.8.20;

// Non-upgradeable TimelockController. We deliberately use the non-upgradeable
// variant: a TimelockController that itself sat behind an upgradeable proxy
// could have its delay logic swapped, defeating the upgrade-timelock guarantee.
// The timelock is intended to be immutable once deployed.
import "@openzeppelin/contracts/governance/TimelockController.sol";
