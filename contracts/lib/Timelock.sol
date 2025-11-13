// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Timelock {
    error WrongNewImplementationAddress();
    error UpgradeAlreadyPlanned();
    error TimeDelayNotSetOrTooShort();
    error UpgradeNotScheduled();
    error TimeDelayNotPassed();

    struct Storage {
        address plannedNewImplementation;
        uint256 plannedNewImplementationTime;
        uint256 timeDelay;
    }

    event UpgradePlanned(uint256 plannedTime, address newImplementation);
    event UpgradeApplied(uint256 time, address newImplementation);

    function scheduleUpgrade(
        Storage storage self,
        address newImplementation
    ) internal {
        if (newImplementation == address(0)) {
            revert WrongNewImplementationAddress();
        }
        if (self.plannedNewImplementation == newImplementation) {
            revert UpgradeAlreadyPlanned();
        }
        if (self.timeDelay <= 1 days) {
            revert TimeDelayNotSetOrTooShort();
        }

        self.plannedNewImplementation = newImplementation;
        self.plannedNewImplementationTime = block.timestamp + self.timeDelay;

        emit UpgradePlanned(
            self.plannedNewImplementationTime,
            newImplementation
        );
    }

    function checkTimeDelay(
        Storage storage self,
        address newImplementation
    ) internal view {
        if (self.plannedNewImplementation == address(0)) {
            revert WrongNewImplementationAddress();
        }
        if (self.plannedNewImplementation != newImplementation) {
            revert UpgradeNotScheduled();
        }
        if (block.timestamp <= self.plannedNewImplementationTime) {
            revert TimeDelayNotPassed();
        }
    }

    function clearUpgrade(Storage storage self) internal {
        self.plannedNewImplementationTime = 0;
        self.plannedNewImplementation = address(0);
    }

    function getPlannedImplementation(
        Storage storage self
    ) internal view returns (address) {
        return self.plannedNewImplementation;
    }

    function getPlannedTime(
        Storage storage self
    ) internal view returns (uint256) {
        return self.plannedNewImplementationTime;
    }
}
