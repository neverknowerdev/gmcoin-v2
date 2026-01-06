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

    error OnlyICPCanisterCanCall();

    // Storage variables
    Timelock.Storage public timelockStorage;
    UserAccount.Storage internal farcasterAccounts;
    UserAccount.Storage internal twitterAccounts;
    UserWallets.Storage internal userWallets;

    address icpGmAccountManagementMsgSender;

    uint256[10] __gap;

    uint256[] allUsers; // All user IDs for iteration
    mapping(uint256 => uint256) userIndexById; // User ID -> index in allUsers
    uint256[10] __gap2;

    // human verified
    mapping(uint256 => HumanVerification) humanVerificationByUserId;
    // Coinbase verification attestation UIDs
    mapping(uint256 => bytes32) coinbaseAttestationUIDByUserId;
    // stat
    mapping(uint256 => uint32) createdAtByUserId;

    modifier onlyICPCanister() {
        if (_msgSender() != icpGmAccountManagementMsgSender)
            revert OnlyICPCanisterCanCall();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _icpGmAccountManagementMsgSender,
        uint256 _timeDelay
    ) public initializer {
        __Ownable_init(_msgSender());
        __UUPSUpgradeable_init();
        icpGmAccountManagementMsgSender = _icpGmAccountManagementMsgSender;
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

    event VerifyCoinbaseRequested(
        address indexed wallet,
        bytes32 attestationUID
    );
    event CoinbaseVerificationResult(
        address indexed wallet,
        bytes32 attestationUID,
        bool isSuccess,
        string errorMsg
    );

    function twitterVerificationError(
        address wallet,
        uint256 twitterID,
        string calldata errorMsg
    ) public onlyICPCanister {
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

    // Coinbase verification functions
    function requestCoinbaseVerification(bytes32 attestationUID) public {
        emit VerifyCoinbaseRequested(_msgSender(), attestationUID);
    }

    function coinbaseVerificationError(
        address wallet,
        bytes32 attestationUID,
        string calldata errorMsg
    ) public onlyICPCanister {
        emit CoinbaseVerificationResult(
            wallet,
            attestationUID,
            false,
            errorMsg
        );
    }

    function setCoinbaseVerification(
        address wallet,
        bytes32 attestationUID
    ) public onlyICPCanister {
        uint256 userId = userWallets.userIdByWallet(wallet);
        if (userId == 0) {
            revert UserNotExist();
        }

        // Store attestation UID
        coinbaseAttestationUIDByUserId[userId] = attestationUID;

        // Set human verification status
        humanVerificationByUserId[userId] = HumanVerification
            .CoinbaseVerification;

        emit HumanVerificationUpdated(
            userId,
            HumanVerification.CoinbaseVerification
        );
        emit CoinbaseVerificationResult(wallet, attestationUID, true, "");
    }

    // Account management events
    event UserCreated(
        uint256 indexed userId,
        address indexed primaryWallet,
        uint256 twitterId,
        uint256 farcasterFid
    );
    event UserRemoved(uint256 indexed userId);
    event SocialAccountLinked(
        uint256 indexed userId,
        string platform,
        uint256 platformId
    );
    event PrimaryWalletUpdated(
        uint256 indexed userId,
        address indexed primaryWallet
    );
    event WalletLinked(uint256 indexed userId, address indexed wallet);
    event HumanVerificationUpdated(
        uint256 indexed userId,
        HumanVerification verification
    );

    // Unified User System Functions

    function createOrUpdateUser(
        uint256 userId,
        address[] wallets,
        uint256 twitterId,
        uint256 farcasterFid,
        HumanVerification humanVerification
    ) public onlyICPCanister returns (uint256) {
        for (uint256 i = 0; i < wallets.length; i++) {
            if (userWallets.userIdByWallet(wallets[i]) != userId) {
                _removeUser(userWallets.userIdByWallet(wallets[i]), true);
            }
        }

        if (twitterAccounts.userIdByAccountId(twitterId) != userId) {
            _removeUser(twitterAccounts.userIdByAccountId(twitterId), true);
        }

        if (farcasterAccounts.userIdByAccountId(farcasterFid) != userId) {
            _removeUser(
                farcasterAccounts.userIdByAccountId(farcasterFid),
                true
            );
        }

        return _createOrUpdateUser(userId, wallets, twitterId, farcasterFid, humanVerification);
    }

    function _createOrUpdateUser(
        uint256 userId,
        address[] wallets,
        uint256 twitterId,
        uint256 farcasterFid
        HumanVerification humanVerification
    ) internal returns (uint256) {
        if (userIndexById[userId] == 0) {
            allUsers.push(userId);
            userIndexById[userId] = allUsers.length - 1;
            createdAtByUserId[userId] = uint32(block.timestamp);

            emit UserCreated(userId, wallets[0], twitterId, farcasterFid);
        }

        for (uint256 i = 0; i < wallets.length; i++) {
            if (userWallets.userIdByWallet(wallets[i]) != 0) {
                userWallets.addWallet(userId, wallets[i]);
            }
        }

        if (userWallets.primaryWalletByUserId(userId) != wallets[0]) {
            userWallets.setPrimaryWallet(userId, wallets[0]);
            emit PrimaryWalletUpdated(userId, wallets[0]);
        }

        if (
            twitterId != 0 && twitterAccounts.userIdByAccountId(twitterId) == 0
        ) {
            twitterAccounts.addAccount(userId, twitterId);
        }
        if (
            farcasterFid != 0 &&
            farcasterAccounts.userIdByAccountId(farcasterFid) == 0
        ) {
            farcasterAccounts.addAccount(userId, farcasterFid);
        }

        if (wallets.length > 1) {
            for (uint256 i = 1; i < wallets.length; i++) {
                emit WalletLinked(userId, wallets[i]);
            }
        }

        if(humanVerificationByUserId[userId] != humanVerification) {
            humanVerificationByUserId[userId] = humanVerification;
            emit HumanVerificationUpdated(userId, humanVerification);
        }

        return userId;
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

        _linkWalletToUser(userWallets.userIdByWallet(_msgSender()), newWallet);
    }

    function _linkWalletToUser(uint256 userId, address newWallet) internal {
        if (userWallets.userIdByWallet(newWallet) != 0) {
            revert WalletAlreadyLinked();
        }

        userWallets.addWallet(
            userWallets.userIdByWallet(_msgSender()),
            newWallet
        );

        emit WalletLinked(userId, wallet);
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

    // function removeUser(uint256 userId) internal {
    //     _removeUser(userId);
    // }

    // function removeMe() public {
    //     removeUser(userWallets.userIdByWallet(_msgSender()));
    // }

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
        bytes32 coinbaseAttestationUID; // Coinbase attestation UID (0x0 if not verified)
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
                farcasterAccounts.accountIdByUserId(userId),
                coinbaseAttestationUIDByUserId[userId]
            );
    }

    function getUserByTwitterID(
        uint256 twitterID
    ) public view returns (UnifiedUser memory) {
        uint256 userId = twitterAccounts.userIdByAccountId(twitterID);
        if (userId == 0) revert UserNotExist();
        return getUnifiedUser(userId);
    }

    function getUserByFarcasterFID(
        uint256 farcasterFID
    ) public view returns (UnifiedUser memory) {
        uint256 userId = farcasterAccounts.userIdByAccountId(farcasterFID);
        if (userId == 0) revert UserNotExist();
        return getUnifiedUser(userId);
    }

    function getPrimaryWalletByUserID(
        uint256 userId
    ) public view returns (address) {
        return userWallets.primaryWalletByUserId(userId);
    }

    function getUserByWallet(
        address wallet
    ) public view returns (UnifiedUser memory) {
        uint256 userId = userWallets.userIdByWallet(wallet);
        if (userId == 0) revert UserNotExist();
        return getUnifiedUser(userId);
    }

    function _removeUser(uint256 userId, bool ignoreIfNotExist) internal {
        uint256 userIndex = userIndexById[userId];
        if (allUsers[userIndex] != userId) {
            if (!ignoreIfNotExist) revert UserNotExist();
            return;
        }
        if (userIndex >= allUsers.length) revert UserNotExist();

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
        delete coinbaseAttestationUIDByUserId[userId];
        delete createdAtByUserId[userId];

        emit UserRemoved(userId);
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
