// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./lib/Timelock.sol";
import "./lib/UserAccount.sol";
import "./lib/UserWallets.sol";
import "hardhat/console.sol";

contract GMAccountManager is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}

contract AccountManager is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using Timelock for Timelock.Storage;
    using UserAccount for UserAccount.Storage;
    using UserWallets for UserWallets.Storage;

    // Enums
    enum HumanVerification {
        None,
        WorldUniqueDevice,
        WorldOrb,
        BinanceBAB,
        CoinbaseVerification
    }

    // Custom errors
    error UserAlreadyLinked();
    error WalletAlreadyLinked();
    error WalletAlreadyLinkedToFid();
    error FarcasterAccountAlreadyLinked();
    error InvalidSignature();
    error WalletAlreadyRegistered();
    error CallerNotRegistered();
    error FromUserNotExist();
    error ToUserNotExist();
    error CannotMergeSameUser();
    error UserNotExist();
    error TwitterIdAlreadyLinked();
    error FarcasterFidAlreadyLinked();
    error WalletNotLinked();
    error CannotRemoveUserActiveWorkers();

    error GelatoOnly();

    // Storage variables
    Timelock.Storage public timelockStorage;
    UserAccount.Storage internal farcasterAccounts;
    UserAccount.Storage internal twitterAccounts;
    UserWallets.Storage internal userWallets;

    address gelatoDedicatedMsgSender;
    uint256 nextUserId; // Auto-increment user ID counter

    uint256[10] __gap;

    uint256[] allUsers; // All user IDs for iteration
    mapping(uint256 => uint256) userIndexById; // User ID -> index in allUsers
    uint256[10] __gap2;

    // human verified
    mapping(uint256 => HumanVerification) humanVerificationByUserId;
    // stat
    mapping(uint256 => uint32) createdAtByUserId;

    modifier onlyGelato() {
        if (_msgSender() != gelatoDedicatedMsgSender) revert GelatoOnly();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _gelatoDedicatedMsgSender,
        uint256 _timeDelay
    ) public initializer {
        __Ownable_init(_msgSender());
        __UUPSUpgradeable_init();
        gelatoDedicatedMsgSender = _gelatoDedicatedMsgSender;
        timelockStorage.timeDelay = _timeDelay;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyOwner {}

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

    // Twitter events
    event VerifyTwitterRequested(
        string accessCodeEncrypted,
        uint256 twitterID,
        address indexed wallet
    );
    event TwitterVerificationResult(
        uint256 twitterID,
        address indexed wallet,
        bool isSuccess,
        string errorMsg
    );
    event VerifyTwitterByAuthCodeRequested(
        address wallet,
        string authCode,
        string tweetID,
        uint256 twitterID
    );

    event VerifyFarcasterRequested(
        uint256 indexed farcasterFid,
        address indexed wallet
    );
    event FarcasterVerificationResult(
        uint256 indexed farcasterFid,
        address indexed wallet,
        bool isSuccess,
        string errorMsg
    );

    function twitterVerificationError(
        address wallet,
        uint256 twitterID,
        string calldata errorMsg
    ) public onlyGelato {
        emit TwitterVerificationResult(twitterID, wallet, false, errorMsg);
    }

    function requestTwitterVerificationByAuthCode(
        string calldata authCode,
        uint256 twitterID,
        string calldata tweetID
    ) public {
        if (twitterAccounts.isAccountExists(twitterID))
            revert TwitterIdAlreadyLinked();

        emit VerifyTwitterByAuthCodeRequested(
            _msgSender(),
            authCode,
            tweetID,
            twitterID
        );
    }

    function requestTwitterVerification(
        string calldata accessCodeEncrypted,
        uint256 twitterID
    ) public {
        if (twitterAccounts.isAccountExists(twitterID))
            revert TwitterIdAlreadyLinked();

        emit VerifyTwitterRequested(
            accessCodeEncrypted,
            twitterID,
            _msgSender()
        );
    }

    function getTwitterAccounts(
        uint64 start,
        uint16 count
    ) public view returns (uint256[] memory) {
        return twitterAccounts.getAccounts(start, count);
    }

    function getFarcasterAccounts(
        uint64 start,
        uint16 count
    ) public view returns (uint256[] memory) {
        return farcasterAccounts.getAccounts(start, count);
    }

    struct UserAccountInfo {
        address wallet;
        uint256 accountId;
        uint256 userId;
    }

    function getTwitterAcoountsInfo(
        uint64 start,
        uint16 count
    ) public view returns (UserAccountInfo[] memory) {
        uint256[] memory accountIds = twitterAccounts.getAccounts(start, count);
        UserAccountInfo[] memory accountInfos = new UserAccountInfo[](
            accountIds.length
        );
        for (uint256 i = 0; i < accountIds.length; i++) {
            accountInfos[i] = UserAccountInfo(
                userWallets.primaryWalletByUserId(
                    twitterAccounts.userIdByAccountId(accountIds[i])
                ),
                accountIds[i],
                twitterAccounts.userIdByAccountId(accountIds[i])
            );
        }
        return accountInfos;
    }

    function getFarcasterAccountsInfo(
        uint64 start,
        uint16 count
    ) public view returns (UserAccountInfo[] memory) {
        uint256[] memory accountIds = farcasterAccounts.getAccounts(
            start,
            count
        );
        UserAccountInfo[] memory accountInfos = new UserAccountInfo[](
            accountIds.length
        );
        for (uint256 i = 0; i < accountIds.length; i++) {
            accountInfos[i] = UserAccountInfo(
                userWallets.primaryWalletByUserId(
                    farcasterAccounts.userIdByAccountId(accountIds[i])
                ),
                accountIds[i],
                farcasterAccounts.userIdByAccountId(accountIds[i])
            );
        }
        return accountInfos;
    }

    // Farcaster verification functions
    function requestFarcasterVerification(
        uint256 farcasterFid,
        address wallet
    ) external {
        if (farcasterAccounts.isAccountExists(farcasterFid))
            revert FarcasterAccountAlreadyLinked();

        emit VerifyFarcasterRequested(farcasterFid, wallet);
    }

    function farcasterVerificationError(
        uint256 farcasterFid,
        address wallet,
        string calldata errorMsg
    ) external {
        emit FarcasterVerificationResult(farcasterFid, wallet, false, errorMsg);
    }

    // Account management events
    event UserCreated(
        uint256 indexed userId,
        address indexed primaryWallet,
        uint256 twitterId,
        uint256 farcasterFid
    );
    event SocialAccountLinked(
        uint256 indexed userId,
        string platform,
        uint256 platformId
    );
    event WalletLinked(uint256 indexed userId, address indexed wallet);
    event HumanVerificationUpdated(
        uint256 indexed userId,
        HumanVerification verification
    );

    // Unified User System Functions

    function createOrLinkUser(
        address wallet,
        uint256 twitterId,
        uint256 farcasterFid
    ) public onlyGelato returns (uint256) {
        console.log("createOrLinkUser", wallet, twitterId, farcasterFid);
        return _createOrLinkUser(wallet, twitterId, farcasterFid);
    }

    function linkAdditionalWallet(
        address newWallet,
        bytes calldata signature
    ) public {
        if (userWallets.userIdByWallet(_msgSender()) == 0)
            revert CallerNotRegistered();

        address recoveredSigner = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(
                bytes("I want to link this wallet to my GMCoin account")
            ),
            signature
        );
        if (recoveredSigner != newWallet) revert InvalidSignature();

        if (userWallets.userIdByWallet(newWallet) != 0) {
            _mergeUsers(
                userWallets.userIdByWallet(_msgSender()),
                userWallets.userIdByWallet(newWallet),
                true,
                true
            );
            return;
        }

        userWallets.addWallet(
            userWallets.userIdByWallet(_msgSender()),
            newWallet
        );
    }

    function setUserHumanVerification(
        uint256 userId,
        HumanVerification verification
    ) public {
        _setUserHumanVerification(_msgSender(), userId, verification);
        emit HumanVerificationUpdated(userId, verification);
    }

    function setPrimaryWallet(uint256 userId, address newPrimaryWallet) public {
        userWallets.setPrimaryWallet(userId, newPrimaryWallet);
    }

    function removeUser(uint256 userId) internal {
        _removeUser(userId);
    }

    function removeMe() public {
        removeUser(userWallets.userIdByWallet(_msgSender()));
    }

    // Query functions for unified users
    function totalUsersCount() public view returns (uint256) {
        return allUsers.length;
    }

    // Unified User Structure
    struct UnifiedUser {
        uint256 userId; // Unique user identifier
        address primaryWallet; // Primary wallet for minting
        HumanVerification humanVerification; // Human verification status
        uint32 createdAt; // Creation timestamp
        uint256 twitterId; // Twitter ID (0 if not linked)
        uint256 farcasterFid; // Farcaster FID (0 if not linked)
        // Future social platforms can be added here
    }

    // Internal library functions (merged from AccountManagerLib)
    function getUnifiedUser(
        uint256 userId
    ) internal view returns (UnifiedUser memory) {
        return
            UnifiedUser(
                userId,
                userWallets.primaryWalletByUserId(userId),
                humanVerificationByUserId[userId],
                createdAtByUserId[userId],
                twitterAccounts.accountIdByUserId(userId),
                farcasterAccounts.accountIdByUserId(userId)
            );
    }

    function getUserByTwitterID(
        uint256 twitterID
    ) public view returns (UnifiedUser memory) {
        uint256 userId = twitterAccounts.userIdByAccountId(twitterID);
        console.log("found userId", userId);
        if (userId == 0) revert UserNotExist();
        return getUnifiedUser(userId);
    }

    function getUserByFarcasterFID(
        uint256 farcasterFID
    ) public view returns (UnifiedUser memory) {
        uint256 userId = farcasterAccounts.userIdByAccountId(farcasterFID);
        console.log("found userId", userId);
        if (userId == 0) revert UserNotExist();
        return getUnifiedUser(userId);
    }

    function getPrimaryWalletByUserID(
        uint256 userId
    ) public view returns (address) {
        return userWallets.primaryWalletByUserId(userId);
    }

    function _createUser(
        address primaryWallet,
        uint256 twitterId,
        uint256 farcasterFid
    ) internal returns (uint256) {
        nextUserId++;
        uint256 userId = nextUserId;

        allUsers.push(userId);
        userIndexById[userId] = allUsers.length - 1;

        userWallets.addWallet(userId, primaryWallet);

        if (twitterId != 0) {
            twitterAccounts.addAccount(userId, twitterId);
            emit TwitterVerificationResult(twitterId, primaryWallet, true, "");
        }
        if (farcasterFid != 0) {
            farcasterAccounts.addAccount(userId, farcasterFid);
            emit FarcasterVerificationResult(
                farcasterFid,
                primaryWallet,
                true,
                ""
            );
        }

        createdAtByUserId[userId] = uint32(block.timestamp);

        return userId;
    }

    function _removeUser(uint256 userId) internal {
        uint256 userIndex = userIndexById[userId];
        if (userIndex >= allUsers.length || allUsers[userIndex] != userId)
            revert UserNotExist();

        uint256 twitterId = twitterAccounts.accountIdByUserId(userId);
        if (twitterId != 0) {
            twitterAccounts.removeAccount(userId, twitterId);
        }
        uint256 farcasterFid = farcasterAccounts.accountIdByUserId(userId);
        if (farcasterFid != 0) {
            farcasterAccounts.removeAccount(userId, farcasterFid);
        }

        userWallets.removeAllWallets(userId);

        uint256 currentUserIndex = userIndexById[userId];
        if (currentUserIndex < allUsers.length - 1) {
            uint256 lastUserId = allUsers[allUsers.length - 1];
            allUsers[currentUserIndex] = lastUserId;
            userIndexById[lastUserId] = currentUserIndex;
        }
        allUsers.pop();
        delete userIndexById[userId];

        delete humanVerificationByUserId[userId];
        delete createdAtByUserId[userId];
    }

    function _mergeUsers(
        uint256 fromUserId,
        uint256 toUserId,
        bool overrideTwitterId,
        bool overrideFarcasterFid
    ) internal returns (uint256) {
        uint256 fromUserIndex = userIndexById[fromUserId];
        uint256 toUserIndex = userIndexById[toUserId];
        if (
            fromUserIndex >= allUsers.length ||
            allUsers[fromUserIndex] != fromUserId
        ) revert FromUserNotExist();
        if (toUserIndex >= allUsers.length || allUsers[toUserIndex] != toUserId)
            revert ToUserNotExist();
        if (fromUserId == toUserId) revert CannotMergeSameUser();

        // Move social accounts if not already present
        // twitter
        uint256 oldTwitterId = twitterAccounts.accountIdByUserId(fromUserId);
        uint256 newTwitterId = twitterAccounts.accountIdByUserId(toUserId);
        if (
            oldTwitterId != 0 &&
            (newTwitterId == 0 || overrideTwitterId) &&
            oldTwitterId != newTwitterId
        ) {
            // if no new twitterId exists, add the old one
            if (newTwitterId == 0) {
                twitterAccounts.addAccount(toUserId, oldTwitterId);
            } else if (overrideTwitterId) {
                // if overriding, remove the new one and add the old one
                twitterAccounts.removeAccount(toUserId, newTwitterId);
                twitterAccounts.addAccount(toUserId, oldTwitterId);
            }
        }

        uint256 oldFarcasterFid = farcasterAccounts.accountIdByUserId(
            fromUserId
        );
        uint256 newFarcasterFid = farcasterAccounts.accountIdByUserId(toUserId);
        if (
            oldFarcasterFid != 0 &&
            (newFarcasterFid == 0 || overrideFarcasterFid) &&
            oldFarcasterFid != newFarcasterFid
        ) {
            // if no new farcasterFid exists, add the old one
            if (newFarcasterFid == 0) {
                farcasterAccounts.addAccount(toUserId, oldFarcasterFid);
            } else if (overrideFarcasterFid) {
                // if overriding, remove the new one and add the old one
                farcasterAccounts.removeAccount(toUserId, newFarcasterFid);
                farcasterAccounts.addAccount(toUserId, oldFarcasterFid);
            }
        }

        // Move all wallets from fromUser to toUser

        userWallets.mergeUsers(
            fromUserId,
            toUserId,
            userWallets.primaryWalletByUserId(toUserId)
        );

        _removeUser(fromUserId);

        return toUserId;
    }

    function _linkSocialAccountToUser(
        uint256 userId,
        address wallet,
        uint256 twitterId,
        uint256 farcasterFid
    ) internal {
        uint256 userIndex = userIndexById[userId];
        if (userIndex >= allUsers.length || allUsers[userIndex] != userId)
            revert UserNotExist();

        if (twitterId != 0) {
            uint256 existingTwitterId = twitterAccounts.accountIdByUserId(
                userId
            );
            if (existingTwitterId != twitterId && existingTwitterId != 0) {
                twitterAccounts.removeAccount(userId, existingTwitterId);
            }
            twitterAccounts.addAccount(userId, twitterId);
            emit TwitterVerificationResult(twitterId, wallet, true, "");
        }
        if (farcasterFid != 0) {
            uint256 existingFarcasterFid = farcasterAccounts.accountIdByUserId(
                userId
            );
            if (
                existingFarcasterFid != farcasterFid &&
                existingFarcasterFid != 0
            ) {
                farcasterAccounts.removeAccount(userId, existingFarcasterFid);
            }
            farcasterAccounts.addAccount(userId, farcasterFid);
            emit FarcasterVerificationResult(farcasterFid, wallet, true, "");
        }
    }

    function _createOrLinkUser(
        address wallet,
        uint256 twitterId,
        uint256 farcasterFid
    ) internal returns (uint256) {
        uint256 existingUserId = userWallets.userIdByWallet(wallet);

        if (existingUserId != 0) {
            _linkSocialAccountToUser(
                existingUserId,
                wallet,
                twitterId,
                farcasterFid
            );
            return existingUserId;
        }

        // If wallet has no unified user yet, try to attach to an existing user by social IDs
        uint256 userIdByTwitter = twitterId != 0
            ? twitterAccounts.userIdByAccountId(twitterId)
            : 0;
        uint256 userIdByFarcaster = farcasterFid != 0
            ? farcasterAccounts.userIdByAccountId(farcasterFid)
            : 0;

        if (
            userIdByTwitter != 0 &&
            userIdByFarcaster != 0 &&
            userIdByTwitter != userIdByFarcaster
        ) {
            uint256 userId = _mergeUsers(
                userIdByTwitter,
                userIdByFarcaster,
                true,
                false
            );
            if (userWallets.userIdByWallet(wallet) == 0) {
                userWallets.addWallet(userId, wallet);
            }
            return userId;
        }

        uint256 targetUserId = userIdByTwitter != 0
            ? userIdByTwitter
            : userIdByFarcaster;
        if (targetUserId != 0) {
            // Link socials to the target user if missing
            _linkSocialAccountToUser(
                targetUserId,
                wallet,
                twitterId,
                farcasterFid
            );

            // Link the wallet to that unified user if not linked yet
            if (userWallets.userIdByWallet(wallet) == 0) {
                userWallets.addWallet(targetUserId, wallet);
            }

            return targetUserId;
        }

        // Otherwise, create a new unified user
        return _createUser(wallet, twitterId, farcasterFid);
    }

    function _setUserHumanVerification(
        address ownerWallet,
        uint256 userId,
        HumanVerification verification
    ) internal {
        uint256 userIndex = userIndexById[userId];
        if (userIndex >= allUsers.length || allUsers[userIndex] != userId)
            revert UserNotExist();
        if (userWallets.userIdByWallet(ownerWallet) != userId)
            revert WalletNotLinked();

        humanVerificationByUserId[userId] = verification;
    }
}
