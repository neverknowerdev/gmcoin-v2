// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./lib/Timelock.sol";

contract GMMinter is ERC1967Proxy {
    constructor(
        address _logic,
        bytes memory _data
    ) ERC1967Proxy(_logic, _data) {}
}

contract Minter is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using Timelock for Timelock.Storage;

    Timelock.Storage public timelockStorage;

    enum Platform {
        Twitter,
        Farcaster
    }

    Batch[] emptyArray;

    address gelatoDedicatedMsgSender;
    address relayerAddress;

    struct Batch {
        uint64 startIndex;
        uint64 endIndex;
        string nextCursor;
        uint8 errorCount;
    }

    uint256 COINS_MULTIPLICATOR;
    uint EPOCH_DAYS;
    uint256 POINTS_PER_POST;
    uint256 POINTS_PER_LIKE;
    uint256 POINTS_PER_HASHTAG;
    uint256 POINTS_PER_CASHTAG;

    uint256[10] __gap;

    struct UserPoints {
        uint256 farcasterPoints;
        uint256 twitterPoints;
    }

    uint32 epochNumber;
    uint32 epochStartedAt;

    UserPoints lastEpochPoints;
    UserPoints currentEpochPoints;
    UserPoints mintingDayPointsFromUsers;

    bool mintingFinishedForTwitter;
    bool mintingFinishedForFarcaster;

    uint32 mintingInProgressForDay;
    uint32 lastMintedDay;
    // public

    address trustedSigner;

    modifier onlyGelato() {
        require(
            msg.sender == gelatoDedicatedMsgSender,
            "only Gelato can call this function"
        );
        _;
    }

    modifier onlyRelayer() {
        require(
            msg.sender == relayerAddress,
            "only relayer can call this function"
        );
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        uint256 coinsPerPost,
        address _gelatoAddress,
        uint _epochDays
    ) public initializer {
        POINTS_PER_POST = 1;
        POINTS_PER_LIKE = 1;
        POINTS_PER_HASHTAG = 3;
        POINTS_PER_CASHTAG = 5;

        EPOCH_DAYS = _epochDays;

        COINS_MULTIPLICATOR = coinsPerPost * 10 ** 18;

        epochStartedAt = uint32(
            block.timestamp - (block.timestamp % 1 days) - 1 days
        );

        // pre-yesterday
        lastMintedDay = uint32(
            block.timestamp - (block.timestamp % 1 days) - 2 days
        );

        gelatoDedicatedMsgSender = _gelatoAddress;
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

    event NewEpochStarted(
        uint32 indexed epochNumber,
        uint256 multiplicator,
        uint256 lastEpochPoints,
        uint256 lastEpochPointsTwitter,
        uint256 lastEpochPointsFarcaster
    );
    event ChangedComplexity(uint256 newMultiplicator);

    event MintingProcessed(
        Platform indexed platform,
        uint32 indexed mintingDayTimestamp,
        Batch[] batches
    );

    event MintingErrored(
        Platform indexed platform,
        uint32 indexed mintingDayTimestamp,
        Batch[] errorBatches
    );

    event MintingStarted(Platform platform, uint32 indexed mintingDayTimestamp);

    event MintingFinished(
        Platform indexed platform,
        uint32 indexed mintingDayTimestamp,
        string runningHash
    );
    event MintingFinishedForAllPlatforms(uint32 indexed mintingDayTimestamp);

    event MintingFinished_UploadedToIPFS(
        Platform indexed platform,
        uint32 indexed mintingDayTimetsamp,
        string runningHash,
        string cid
    );

    function startMinting() public onlyGelato {
        // continue minting for not finished day if any

        uint32 yesterday = getStartOfYesterday();
        uint32 dayToMint = lastMintedDay + 1 days;

        // if minting for previous day is not finished - continue it
        if (
            mintingInProgressForDay > 0 && mintingInProgressForDay < yesterday
        ) {
            if (!mintingFinishedForTwitter) {
                emit MintingProcessed(
                    Platform.Twitter,
                    mintingInProgressForDay,
                    emptyArray
                );
            }
            if (!mintingFinishedForFarcaster) {
                emit MintingProcessed(
                    Platform.Farcaster,
                    mintingInProgressForDay,
                    emptyArray
                );
            }
            return;
        }

        require(
            dayToMint <= yesterday,
            "dayToMint should be not further than yesterday"
        );
        require(
            mintingInProgressForDay == 0,
            "minting process already started"
        );

        mintingInProgressForDay = dayToMint;

        mintingDayPointsFromUsers.twitterPoints = 0;
        mintingDayPointsFromUsers.farcasterPoints = 0;

        // complexity calculation
        // start new epoch
        if (
            dayToMint > epochStartedAt &&
            dayToMint - epochStartedAt >= EPOCH_DAYS * 1 days
        ) {
            epochStartedAt = dayToMint;

            uint256 newCoinMultiplicator = changeComplexity(
                COINS_MULTIPLICATOR,
                lastEpochPoints,
                currentEpochPoints
            );
            if (newCoinMultiplicator > 0) {
                COINS_MULTIPLICATOR = newCoinMultiplicator;
                emit ChangedComplexity(COINS_MULTIPLICATOR);
            }
            epochNumber++;

            lastEpochPoints.twitterPoints = currentEpochPoints.twitterPoints;
            lastEpochPoints.farcasterPoints = currentEpochPoints
                .farcasterPoints;
            currentEpochPoints.twitterPoints = 0;
            currentEpochPoints.farcasterPoints = 0;

            emit NewEpochStarted(
                epochNumber,
                COINS_MULTIPLICATOR,
                lastEpochPoints.twitterPoints + lastEpochPoints.farcasterPoints,
                lastEpochPoints.twitterPoints,
                lastEpochPoints.farcasterPoints
            );
        }

        mintingFinishedForTwitter = false;
        mintingFinishedForFarcaster = false;

        emit MintingStarted(Platform.Twitter, dayToMint);
        emit MintingStarted(Platform.Farcaster, dayToMint);
    }

    // manual calling continue minting for a day if there was any unexpected error
    function continueMintingForADay(Platform platform) public onlyOwner {
        require(
            mintingInProgressForDay != 0,
            "not found any in progress minting days"
        );

        emit MintingProcessed(platform, mintingInProgressForDay, emptyArray);
    }

    function processMintingBatches(
        Platform platform,
        uint256 userPoints,
        uint32 mintingDayTimestamp,
        Batch[] calldata batches
    ) public onlyGelato {
        require(mintingInProgressForDay != 0, "no ongoing minting process");
        require(
            mintingDayTimestamp == mintingInProgressForDay,
            "wrong mintingDay"
        );

        if (platform == Platform.Twitter) {
            mintingDayPointsFromUsers.twitterPoints += userPoints;
        } else if (platform == Platform.Farcaster) {
            mintingDayPointsFromUsers.farcasterPoints += userPoints;
        }

        if (batches.length > 0) {
            emit MintingProcessed(platform, mintingDayTimestamp, batches);
        }
    }

    error MintingFinishedAlready(Platform platform);

    function finishMinting(
        Platform platform,
        uint32 mintingDayTimestamp,
        string calldata runningHash
    ) public onlyGelato {
        if (mintingFinishedForTwitter && platform == Platform.Twitter) {
            revert MintingFinishedAlready(platform);
        }
        if (mintingFinishedForFarcaster && platform == Platform.Farcaster) {
            revert MintingFinishedAlready(platform);
        }

        if (platform == Platform.Twitter) {
            mintingFinishedForTwitter = true;
        } else if (platform == Platform.Farcaster) {
            mintingFinishedForFarcaster = true;
        }

        emit MintingFinished(platform, mintingDayTimestamp, runningHash);

        if (mintingFinishedForTwitter && mintingFinishedForFarcaster) {
            _finishMinting(mintingDayTimestamp);
        }
    }

    function _finishMinting(uint32 mintingDayTimestamp) internal {
        require(
            mintingDayTimestamp == mintingInProgressForDay,
            "wrong mintingDay"
        );
        require(
            lastMintedDay < mintingDayTimestamp,
            "wrong mintingDayTimestamp"
        );

        currentEpochPoints.twitterPoints += mintingDayPointsFromUsers
            .twitterPoints;
        currentEpochPoints.farcasterPoints += mintingDayPointsFromUsers
            .farcasterPoints;

        lastMintedDay = mintingDayTimestamp;

        mintingInProgressForDay = 0;

        emit MintingFinishedForAllPlatforms(mintingDayTimestamp);

        uint32 yesterday = getStartOfYesterday();
        if (lastMintedDay < yesterday) {
            startMinting();
        }
    }

    function attachIPFSFile(
        Platform platform,
        uint32 mintingDayTimestamp,
        string calldata finalHash,
        string calldata cid
    ) public onlyRelayer {
        emit MintingFinished_UploadedToIPFS(
            platform,
            mintingDayTimestamp,
            finalHash,
            cid
        );
    }

    function logErrorBatches(
        Platform platform,
        uint32 mintingDayTimestamp,
        Batch[] calldata batches
    ) public onlyGelato {
        emit MintingErrored(platform, mintingDayTimestamp, batches);
    }

    function getMintingSettings()
        external
        view
        returns (
            uint256 pointsPerPost,
            uint256 pointsPerLike,
            uint256 pointsPerHashtag,
            uint256 pointsPerCashtag,
            uint256 coinsMultiplicator
        )
    {
        return (
            POINTS_PER_POST,
            POINTS_PER_LIKE,
            POINTS_PER_HASHTAG,
            POINTS_PER_CASHTAG,
            COINS_MULTIPLICATOR
        );
    }

    function getStartOfYesterday() public view returns (uint32) {
        // Calculate the start of today (midnight) by rounding down block.timestamp to the nearest day.
        uint32 startOfToday = uint32((block.timestamp / 1 days) * 1 days);
        // Subtract one day to get the start of yesterday.
        return startOfToday - 1 days;
    }

    function changeComplexity(
        uint256 _currentComplexity,
        UserPoints memory _lastEpochPoints,
        UserPoints memory _currentEpochPoints
    ) internal pure returns (uint256) {
        uint256 newMultiplicator = 0;

        uint256 lastEpochPointsSum = _lastEpochPoints.twitterPoints +
            _lastEpochPoints.farcasterPoints;
        uint256 currentEpochPointsSum = _currentEpochPoints.twitterPoints +
            _currentEpochPoints.farcasterPoints;

        if (lastEpochPointsSum != 0) {
            // more GMs now that in previous epoch
            if (currentEpochPointsSum > lastEpochPointsSum) {
                if (currentEpochPointsSum / lastEpochPointsSum >= 5) {
                    // 1/2
                    newMultiplicator = _currentComplexity / 5;
                } else if (currentEpochPointsSum / lastEpochPointsSum >= 2) {
                    // 1/2
                    newMultiplicator = _currentComplexity / 2;
                } else {
                    // minus 30%
                    newMultiplicator = (_currentComplexity * 70) / 100;
                }
            }
            if (currentEpochPointsSum < lastEpochPointsSum) {
                if (lastEpochPointsSum / currentEpochPointsSum >= 3) {
                    newMultiplicator = _currentComplexity * 2;
                } else {
                    // plus 20%
                    newMultiplicator = (_currentComplexity * 120) / 100;
                }
            }
        }

        return newMultiplicator;
    }
}
