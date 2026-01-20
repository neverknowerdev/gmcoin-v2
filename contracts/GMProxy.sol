// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

contract GMAccountManager is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}

contract GMCoin is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}
