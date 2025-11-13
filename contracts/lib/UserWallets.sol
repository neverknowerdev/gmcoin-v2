// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library UserWallets {
    error WalletAlreadyAdded();
    error WalletNotLinked();
    error WalletNotExists();
    error WrongStartIndex();
    error NoPrimaryWalletSet();

    event WalletLinked(uint256 indexed userId, address indexed wallet);

    // mapping(uint256 => address[]) walletsByUserId;
    // mapping(uint256 => address) primaryWalletByUserId;
    // mapping(address => uint256) userIdByWallet;

    // walletId by userId => walletIds[walletIndexByUserId[userId]]
    // userId by walletId => userIdByWalletId[walletId]
    // walletIndex by walletId => walletIndexByUserId[userIdByWalletId[walletId]]
    // primary wallet by userId => primaryWalletByUserId[userId]
    struct Storage {
        mapping(uint256 => address[]) _walletsByUserId;
        mapping(uint256 => address) _primaryWalletByUserId;
        mapping(address => uint256) _userIdByWallet;
    }

    function addWallet(
        Storage storage self,
        uint256 userId,
        address wallet
    ) internal {
        if (self._userIdByWallet[wallet] != 0) revert WalletAlreadyAdded();

        self._walletsByUserId[userId].push(wallet);
        self._userIdByWallet[wallet] = userId;

        // If this is the first wallet for the user, set it as primary
        if (self._primaryWalletByUserId[userId] == address(0)) {
            self._primaryWalletByUserId[userId] = wallet;
        }
    }

    function removeWallet(
        Storage storage self,
        uint256 userId,
        address wallet
    ) internal {
        if (self._userIdByWallet[wallet] == 0) revert WalletNotExists();
        if (self._userIdByWallet[wallet] != userId) revert WalletNotLinked();

        uint256 walletIndex = type(uint256).max;
        for (uint256 i = 0; i < self._walletsByUserId[userId].length; i++) {
            if (self._walletsByUserId[userId][i] == wallet) {
                walletIndex = i;
                break;
            }
        }

        if (walletIndex == type(uint256).max) revert WalletNotLinked();

        self._walletsByUserId[userId][walletIndex] = self._walletsByUserId[
            userId
        ][self._walletsByUserId[userId].length - 1];
        self._walletsByUserId[userId].pop();

        delete self._userIdByWallet[wallet];

        if (self._primaryWalletByUserId[userId] == wallet) {
            if (self._walletsByUserId[userId].length > 0) {
                self._primaryWalletByUserId[userId] = self._walletsByUserId[
                    userId
                ][0];
            } else {
                delete self._primaryWalletByUserId[userId];
            }
        }
    }

    function removeAllWallets(Storage storage self, uint256 userId) internal {
        for (uint256 i = 0; i < self._walletsByUserId[userId].length; i++) {
            delete self._userIdByWallet[self._walletsByUserId[userId][i]];
        }
        delete self._walletsByUserId[userId];
        delete self._primaryWalletByUserId[userId];
    }

    function setPrimaryWallet(
        Storage storage self,
        uint256 userId,
        address wallet
    ) internal {
        if (self._userIdByWallet[wallet] != userId) revert WalletNotLinked();

        self._primaryWalletByUserId[userId] = wallet;
    }

    function primaryWalletByUserId(
        Storage storage self,
        uint256 userId
    ) internal view returns (address) {
        return self._primaryWalletByUserId[userId];
    }

    function mergeUsers(
        Storage storage self,
        uint256 fromUserId,
        uint256 toUserId,
        address newPrimaryWallet
    ) internal {
        if (
            self._userIdByWallet[newPrimaryWallet] != toUserId ||
            self._userIdByWallet[newPrimaryWallet] != fromUserId
        ) revert WalletNotLinked();

        for (uint256 i = 0; i < self._walletsByUserId[fromUserId].length; i++) {
            self._walletsByUserId[toUserId].push(
                self._walletsByUserId[fromUserId][i]
            );
            self._userIdByWallet[
                self._walletsByUserId[fromUserId][i]
            ] = toUserId;
        }

        self._primaryWalletByUserId[toUserId] = newPrimaryWallet;

        delete self._primaryWalletByUserId[fromUserId];
    }

    function userIdByWallet(
        Storage storage self,
        address wallet
    ) internal view returns (uint256) {
        return self._userIdByWallet[wallet];
    }
}
