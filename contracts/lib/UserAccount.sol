// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library UserAccount {
    error AccountAlreadyAdded();

    // userId by AccountId => userIdByAccountId
    // accountId by userId => accountIds[accountIndexByUserId[userId]]
    // accountIndex by accountId => accountIndexByUserId[userIdByAccountId[accountId]]
    // accountIndex by userId => accountIndexByUserId[userId]
    struct Storage {
        uint256[] accountIDs;
        mapping(uint256 => uint256) _userIdByAccountId;
        // it's designed to support storing multiple accounts per user, but currently we work with only one account per user
        mapping(uint256 => uint256[]) _accountIndexByUserId;
    }

    function addAccount(
        Storage storage self,
        uint256 userId,
        uint256 accountId
    ) internal {
        if (self._userIdByAccountId[accountId] != 0)
            revert AccountAlreadyAdded();

        self.accountIDs.push(accountId);
        self._userIdByAccountId[accountId] = userId;
        self._accountIndexByUserId[userId].push(self.accountIDs.length - 1);
    }

    error AccountNotLinked();

    function removeAccount(
        Storage storage self,
        uint256 userId,
        uint256 accountId
    ) internal {
        if (self._userIdByAccountId[accountId] != userId)
            revert AccountNotLinked();

        uint256 accountIndex = self._accountIndexByUserId[userId][0];
        uint256 lastAccountId = self.accountIDs[self.accountIDs.length - 1];
        uint256 lastUserId = self._userIdByAccountId[lastAccountId];

        self.accountIDs[accountIndex] = lastAccountId;
        self._accountIndexByUserId[lastUserId][0] = accountIndex;
        self.accountIDs.pop();

        delete self._userIdByAccountId[accountId];
        delete self._accountIndexByUserId[userId];
    }

    function userIdByAccountId(
        Storage storage self,
        uint256 accountId
    ) internal view returns (uint256) {
        return self._userIdByAccountId[accountId];
    }

    function accountIdByUserId(
        Storage storage self,
        uint256 userId
    ) internal view returns (uint256) {
        uint256[] memory accountIndices = self._accountIndexByUserId[userId];
        if (accountIndices.length == 0) {
            return 0; // No account linked for this user
        }
        return self.accountIDs[accountIndices[0]];
    }

    function isAccountExists(
        Storage storage self,
        uint256 accountId
    ) internal view returns (bool) {
        return self._userIdByAccountId[accountId] != 0;
    }

    error WrongStartIndex();

    function getAccounts(
        Storage storage self,
        uint64 start,
        uint16 count
    ) internal view returns (uint256[] memory) {
        uint64 end = start + count;
        if (end > self.accountIDs.length) {
            end = uint64(self.accountIDs.length);
        }

        if (start > end) revert WrongStartIndex();

        uint16 batchSize = uint16(end - start);
        uint256[] memory batchArr = new uint256[](batchSize);
        for (uint16 i = 0; i < batchSize; i++) {
            batchArr[i] = self.accountIDs[start + i];
        }

        return batchArr;
    }
}
