// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./lib/Timelock.sol";

contract GMCoin is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}

contract GMCoinImplementation is
    Initializable,
    OwnableUpgradeable,
    ERC20Upgradeable,
    UUPSUpgradeable
{
    using Timelock for Timelock.Storage;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    error OnlyGelatoDedicatedMsgSender();

    Timelock.Storage public timelockStorage;

    address public feeAddress;
    address public treasuryAddress;
    address public relayServerAddress;
    uint256 public coinsMultiplicator;
    uint256 public epochDays;

    address public gelatoDedicatedMsgSender;

    function initialize(
        address _owner,
        address _feeAddress,
        address _treasuryAddress,
        uint256 _coinsMultiplicator,
        uint256 _epochDays,
        address _gelatoDedicatedMsgSender,
        uint256 _timeDelay
    ) public initializer {
        feeAddress = _feeAddress;
        treasuryAddress = _treasuryAddress;

        coinsMultiplicator = _coinsMultiplicator;
        epochDays = _epochDays;

        gelatoDedicatedMsgSender = _gelatoDedicatedMsgSender;

        __Ownable_init(_owner);
        __ERC20_init("GM Coin", "GM");
        __UUPSUpgradeable_init();

        timelockStorage.timeDelay = _timeDelay;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    function scheduleUpgrade(address newImplementation) public onlyOwner {
        timelockStorage.scheduleUpgrade(newImplementation);
    }

    function upgradeToAndCall(
        address newImplementation,
        bytes memory data
    ) public payable override onlyOwner {
        timelockStorage.checkTimeDelay(newImplementation);
        super.upgradeToAndCall(newImplementation, data);
        timelockStorage.clearUpgrade();
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override {
        // minting
        if (from == address(0) && to != address(0)) {
            super._update(
                address(0),
                treasuryAddress,
                (value * coinsMultiplicator) / 10000
            );

            // if transfer
        } else if (from != address(0) && to != address(0)) {
            // taking fee only for transfer operation
            uint256 feeAmount = (value * coinsMultiplicator) / 10000;
            value = value - feeAmount;

            super._update(from, feeAddress, feeAmount);
        }

        super._update(from, to, value);
    }

    function mintFromGelatoW3F(
        address[] memory to,
        uint256[] memory amounts
    ) public {
        if (msg.sender != gelatoDedicatedMsgSender) {
            revert OnlyGelatoDedicatedMsgSender();
        }

        for (uint256 i = 0; i < to.length; i++) {
            _mint(to[i], amounts[i]);
        }
    }
}
