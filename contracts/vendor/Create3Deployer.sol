// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

// Trusted source: Solady's CREATE3 utility
// https://github.com/Vectorized/solady
import "solady/src/utils/CREATE3.sol";

/// @title Create3Deployer (vendor)
/// @notice Minimal factory exposing a stable ABI around Solady's CREATE3 utility.
/// @dev Matches the ABI expected by existing types: deploy(bytes32,bytes) and getDeployedAddress(bytes32).
contract Create3Deployer {
    event Deployed(address deployed, bytes32 salt);

    /// @notice Deploy a contract deterministically via CREATE3 with optional value.
    /// @param salt Salt for address derivation.
    /// @param initCode Creation bytecode of the contract to deploy (constructor args encoded inline).
    /// @return deployed Address of the deployed contract.
    function deploy(
        bytes32 salt,
        bytes memory initCode
    ) external payable returns (address deployed) {
        // Solady API: deployDeterministic(value, initCode, salt)
        deployed = CREATE3.deployDeterministic(msg.value, initCode, salt);
        emit Deployed(deployed, salt);
    }

    /// @notice Compute the deployed address for a given salt.
    /// @param salt Salt for address derivation.
    /// @return predicted Predicted deployment address.
    function getDeployedAddress(
        bytes32 salt
    ) external view returns (address predicted) {
        // Solady API: predictDeterministicAddress(salt) uses address(this) as deployer
        predicted = CREATE3.predictDeterministicAddress(salt);
    }
}
