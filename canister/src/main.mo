import HashMap "mo:base/HashMap";
import Array "mo:base/Array";
import Nat "mo:base/Nat";
import Nat64 "mo:base/Nat64";
import Nat32 "mo:base/Nat32";
import Text "mo:base/Text";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Error "mo:base/Error";
import Buffer "mo:base/Buffer";
import Iter "mo:base/Iter";
import Int "mo:base/Int";
import Hash "mo:base/Hash";
import Time "mo:base/Time";
import EvmRpc "canister:evm_rpc";
import Cycles "mo:base/ExperimentalCycles";
import Debug "mo:base/Debug";
import Nat8 "mo:base/Nat8";
import Char "mo:base/Char";

// Main canister actor
persistent actor GMCoinVerifier {
    // Type aliases for EVM interactions
    type ChainId = Nat;
    type Address = Text;
    type TxHash = Text;

    // Wallet structure with chain support
    type Wallet = {
        address : Address;
        chain : ChainId;
    };

    // User structure matching AccountManager.sol UnifiedUser
    type User = {
        userId : Nat;
        twitterId : Nat; // 0 if not linked
        primaryWallet : Address;
        farcasterId : Nat; // 0 if not linked
        wallets : [Wallet];
        registeredAt : Nat64; // timestamp
        isVerified : Bool;
    };

    // Transaction receipt structure
    type TransactionReceipt = {
        transactionHash : TxHash;
        transactionIndex : Nat;
        blockNumber : Nat;
        blockHash : Text;
        from : Address;
        to : ?Address;
        cumulativeGasUsed : Nat;
        gasUsed : Nat;
        contractAddress : ?Address;
        logs : [LogEntry];
        status : ?Nat; // 1 for success, 0 for failure
    };

    type LogEntry = {
        address : Address;
        topics : [Text];
        data : Text;
        blockNumber : Nat;
        transactionHash : TxHash;
        transactionIndex : Nat;
        logIndex : Nat;
        blockHash : Text;
    };

    // Event structures
    type VerifyTwitterRequestedEvent = {
        accessCodeEncrypted : Text;
        twitterID : Nat;
        wallet : Address;
    };

    type VerifyFarcasterRequestedEvent = {
        farcasterFid : Nat;
        wallet : Address;
    };

    // Storage
    private var nextUserId : Nat = 1;
    private transient var users = HashMap.HashMap<Nat, User>(0, Nat.equal, Hash.hash);
    private transient var userIdByTwitterId = HashMap.HashMap<Nat, Nat>(0, Nat.equal, Hash.hash);
    private transient var userIdByFarcasterId = HashMap.HashMap<Nat, Nat>(0, Nat.equal, Hash.hash);
    private transient var userIdByWallet = HashMap.HashMap<Address, Nat>(0, Text.equal, Text.hash);

    // Configuration
    private transient var baseContractAddress : ?Address = null;
    private transient var baseRpcUrl : ?Text = null;
    private var baseChainId : ChainId = 8453; // Base mainnet
    private transient var canisterEvmAddress : ?Address = null; // Dedicated EVM address for canister

    // Event signatures (keccak256 hashes of event signatures)
    // keccak256("VerifyTwitterRequested(string,uint256,address)")
    private transient let VERIFY_TWITTER_REQUESTED_SIG = "0x86a32547e5117138a4d48f65f420f0ac0bc06f91be0c2abe77bedd581e7fda3d";
    // keccak256("VerifyFarcasterRequested(uint256,address)")
    private transient let VERIFY_FARCASTER_REQUESTED_SIG = "0x97f98b2d30a159c52786acc5e6743f8c7b1eadd7dfdb3eeb94a1f5d1a5e4ca18";

    // Helper function to compare addresses (case-insensitive)
    private func addressesEqual(a : Address, b : Address) : Bool {
        let aLower = Text.map(a, func(c : Char) : Char {
            if (c >= 'A' and c <= 'F') {
                Char.fromNat32(Char.toNat32(c) + 32)
            } else {
                c
            }
        });
        let bLower = Text.map(b, func(c : Char) : Char {
            if (c >= 'A' and c <= 'F') {
                Char.fromNat32(Char.toNat32(c) + 32)
            } else {
                c
            }
        });
        aLower == bLower
    };

    // Check if wallet exists in wallet array
    private func walletExistsInArray(wallets : [Wallet], wallet : Address, chain : ChainId) : Bool {
        for (w in wallets.vals()) {
            if (addressesEqual(w.address, wallet) and w.chain == chain) {
                return true
            }
        };
        false
    };

    // Helper to find or create user by social IDs
    private func findOrCreateUserBySocial(
        wallet : Address,
        twitterId : ?Nat,
        farcasterId : ?Nat,
    ) : Nat {
        // Try Twitter ID first
        switch (twitterId) {
            case (?tid) {
                if (tid != 0) {
                    switch (userIdByTwitterId.get(tid)) {
                        case (?userId) {
                            return linkWalletToUser(userId, wallet, twitterId, farcasterId)
                        };
                        case (null) {};
                    }
                }
            };
            case (null) {};
        };
        
        // Try Farcaster ID
        switch (farcasterId) {
            case (?fid) {
                if (fid != 0) {
                    switch (userIdByFarcasterId.get(fid)) {
                        case (?userId) {
                            return linkWalletToUser(userId, wallet, twitterId, farcasterId)
                        };
                        case (null) {};
                    }
                }
            };
            case (null) {};
        };
        
        // Create new user
        createNewUser(wallet, twitterId, farcasterId)
    };

    // Update existing user with new data
    private func updateExistingUser(
        existingUserId : Nat,
        wallet : Address,
        twitterId : ?Nat,
        farcasterId : ?Nat,
    ) : Nat {
        switch (users.get(existingUserId)) {
            case (?existingUser) {
                var updatedWallets = Buffer.fromArray<Wallet>(existingUser.wallets);
                
                // Add wallet if not already present
                if (not walletExistsInArray(existingUser.wallets, wallet, baseChainId)) {
                    updatedWallets.add({ address = wallet; chain = baseChainId })
                };

                let updatedUser : User = {
                    userId = existingUser.userId;
                    twitterId = switch (twitterId) {
                        case (?tid) tid;
                        case (null) existingUser.twitterId;
                    };
                    primaryWallet = existingUser.primaryWallet;
                    farcasterId = switch (farcasterId) {
                        case (?fid) fid;
                        case (null) existingUser.farcasterId;
                    };
                    wallets = Buffer.toArray(updatedWallets);
                    registeredAt = existingUser.registeredAt;
                    isVerified = true;
                };

                users.put(existingUserId, updatedUser);

                // Update mappings
                switch (twitterId) {
                    case (?tid) {
                        if (tid != 0) {
                            userIdByTwitterId.put(tid, existingUserId)
                        }
                    };
                    case (null) {};
                };

                switch (farcasterId) {
                    case (?fid) {
                        if (fid != 0) {
                            userIdByFarcasterId.put(fid, existingUserId)
                        }
                    };
                    case (null) {};
                };

                existingUserId
            };
            case (null) {
                // Should not happen, but create new user if it does
                createNewUser(wallet, twitterId, farcasterId)
            };
        }
    };

    // Create or update user
    private func createOrUpdateUser(
        wallet : Address,
        twitterId : ?Nat,
        farcasterId : ?Nat,
    ) : Nat {
        // Check if wallet already has a userId
        switch (userIdByWallet.get(wallet)) {
            case (?existingUserId) {
                updateExistingUser(existingUserId, wallet, twitterId, farcasterId)
            };
            case (null) {
                findOrCreateUserBySocial(wallet, twitterId, farcasterId)
            };
        }
    };

    private func createNewUser(
        wallet : Address,
        twitterId : ?Nat,
        farcasterId : ?Nat,
    ) : Nat {
        let userId = nextUserId;
        nextUserId := nextUserId + 1;

        let twitterIdValue = switch (twitterId) {
            case (?tid) tid;
            case (null) 0;
        };

        let farcasterIdValue = switch (farcasterId) {
            case (?fid) fid;
            case (null) 0;
        };

        let user : User = {
            userId = userId;
            twitterId = twitterIdValue;
            primaryWallet = wallet;
            farcasterId = farcasterIdValue;
            wallets = [{ address = wallet; chain = baseChainId }];
            registeredAt = Nat64.fromIntWrap(Int.abs(Time.now() / 1_000_000_000)); // Unix timestamp in seconds
            isVerified = true;
        };

        users.put(userId, user);
        userIdByWallet.put(wallet, userId);

        if (twitterIdValue != 0) {
            userIdByTwitterId.put(twitterIdValue, userId)
        };

        if (farcasterIdValue != 0) {
            userIdByFarcasterId.put(farcasterIdValue, userId)
        };

        userId
    };

    private func linkWalletToUser(
        userId : Nat,
        wallet : Address,
        twitterId : ?Nat,
        farcasterId : ?Nat,
    ) : Nat {
        switch (users.get(userId)) {
            case (?user) {
                var updatedWallets = Buffer.fromArray<Wallet>(user.wallets);
                
                // Add wallet if not already present
                if (not walletExistsInArray(user.wallets, wallet, baseChainId)) {
                    updatedWallets.add({ address = wallet; chain = baseChainId })
                };

                let updatedUser : User = {
                    userId = user.userId;
                    twitterId = switch (twitterId) {
                        case (?tid) if (tid != 0) tid else user.twitterId;
                        case (null) user.twitterId;
                    };
                    primaryWallet = user.primaryWallet;
                    farcasterId = switch (farcasterId) {
                        case (?fid) if (fid != 0) fid else user.farcasterId;
                        case (null) user.farcasterId;
                    };
                    wallets = Buffer.toArray(updatedWallets);
                    registeredAt = user.registeredAt;
                    isVerified = true;
                };

                users.put(userId, updatedUser);
                userIdByWallet.put(wallet, userId);

                switch (twitterId) {
                    case (?tid) {
                        if (tid != 0) {
                            userIdByTwitterId.put(tid, userId)
                        }
                    };
                    case (null) {};
                };

                switch (farcasterId) {
                    case (?fid) {
                        if (fid != 0) {
                            userIdByFarcasterId.put(fid, userId)
                        }
                    };
                    case (null) {};
                };

                userId
            };
            case (null) {
                // User doesn't exist, create new
                createNewUser(wallet, twitterId, farcasterId)
            };
        }
    };

    // Parse VerifyTwitterRequested event from log entry
    private func parseVerifyTwitterEvent(log : LogEntry) : ?VerifyTwitterRequestedEvent {
        // Check if first topic matches the event signature
        if (Array.size(log.topics) < 3) {
            null
        } else if (log.topics[0] != VERIFY_TWITTER_REQUESTED_SIG) {
            null
        } else {

        // Second topic is indexed twitterID (uint256)
        // Third topic is indexed wallet (address)
        // Note: string accessCodeEncrypted is not indexed, so it's in the data field
        
        // Parse wallet from topic[2] (address is in last 20 bytes = 40 hex chars)
        let walletTopic = log.topics[2];
        // Extract last 40 characters (address is in last 20 bytes = 40 hex chars)
        let wallet = if (walletTopic.size() >= 42) {
            let chars = Iter.toArray(Text.toIter(walletTopic));
            let startIdx = chars.size() - 40;
            let addrChars = Array.tabulate<Char>(40, func(i) { chars[startIdx + i] });
            "0x" # Text.fromIter(addrChars.vals())
        } else {
            "0x" # walletTopic
        };
        
        // Parse twitterID from topic[1] (convert hex to Nat)
        let twitterId = hexToNat(log.topics[1]);

        // TODO: Parse accessCodeEncrypted from data field
        // This requires ABI decoding of the data field
        // For now, we'll use an empty string as placeholder
        let accessCodeEncrypted = "";

        ?{
            accessCodeEncrypted = accessCodeEncrypted;
            twitterID = twitterId;
            wallet = wallet;
        }
        }
    };

    // Parse VerifyFarcasterRequested event from log entry
    private func parseVerifyFarcasterEvent(log : LogEntry) : ?VerifyFarcasterRequestedEvent {
        // Check if first topic matches the event signature
        if (Array.size(log.topics) < 3) {
            null
        } else if (log.topics[0] != VERIFY_FARCASTER_REQUESTED_SIG) {
            null
        } else {
        // Second topic is indexed farcasterFid (uint256)
        // Third topic is indexed wallet (address)

        // Parse wallet from topic[2] (address is in last 20 bytes = 40 hex chars)
        let walletTopic = log.topics[2];
        // Extract last 40 characters (address is in last 20 bytes = 40 hex chars)
        let wallet = if (walletTopic.size() >= 42) {
            let chars = Iter.toArray(Text.toIter(walletTopic));
            let startIdx = chars.size() - 40;
            let addrChars = Array.tabulate<Char>(40, func(i) { chars[startIdx + i] });
            "0x" # Text.fromIter(addrChars.vals())
        } else {
            "0x" # walletTopic
        };

        // Parse farcasterFid from topic[1]
        let farcasterFid = hexToNat(log.topics[1]);

        ?{
            farcasterFid = farcasterFid;
            wallet = wallet;
        }
        }
    };

    // Convert hex string to Nat
    private func hexToNat(hex : Text) : Nat {
        var result : Nat = 0;
        // Remove 0x prefix if present
        let cleaned = if (Text.startsWith(hex, #text "0x")) {
            let chars = Iter.toArray(Text.toIter(hex));
            let withoutPrefix = Array.tabulate<Char>(chars.size() - 2, func(i) { chars[i + 2] });
            Text.fromIter(withoutPrefix.vals())
        } else {
            hex
        };
        
        for (char in cleaned.chars()) {
            result := result * 16;
            switch (char) {
                case ('0') { result := result + 0 };
                case ('1') { result := result + 1 };
                case ('2') { result := result + 2 };
                case ('3') { result := result + 3 };
                case ('4') { result := result + 4 };
                case ('5') { result := result + 5 };
                case ('6') { result := result + 6 };
                case ('7') { result := result + 7 };
                case ('8') { result := result + 8 };
                case ('9') { result := result + 9 };
                case ('a') { result := result + 10 };
                case ('b') { result := result + 11 };
                case ('c') { result := result + 12 };
                case ('d') { result := result + 13 };
                case ('e') { result := result + 14 };
                case ('f') { result := result + 15 };
                case ('A') { result := result + 10 };
                case ('B') { result := result + 11 };
                case ('C') { result := result + 12 };
                case ('D') { result := result + 13 };
                case ('E') { result := result + 14 };
                case ('F') { result := result + 15 };
                case (_) {};
            };
        };
        result
    };

    // Fetch transaction receipt and parse events
    // Note: This is a placeholder implementation - needs EvmRpc API integration
    // TODO: Implement proper EvmRpc service configuration and JSON parsing
    private func fetchTransactionReceipt(chainId : ChainId, txHash : TxHash) : async Result.Result<TransactionReceipt, Text> {
        // TODO: Implement RPC call using EvmRpc canister
        // The exact service type structure needs to be verified against the EvmRpc API
        // For now, return an error indicating this needs implementation
        #err("RPC integration pending - EvmRpc service configuration needs to be completed")
    };

    // Call createOrLinkUser on Base contract
    private func callCreateOrLinkUser(
        wallet : Address,
        twitterId : Nat,
        farcasterId : Nat,
    ) : async Result.Result<Nat, Text> {
        // Step 1: Update local canister state
        let userId = createOrUpdateUser(wallet, ?twitterId, ?farcasterId);

        // Step 2: Call Base contract using Threshold ECDSA signatures
        // TODO: Implement full Threshold ECDSA integration
        // This requires:
        // 1. Get canister's public key from ECDSA canister (ic-cdk API)
        // 2. Derive EVM address from public key (last 20 bytes of keccak256(public_key))
        // 3. ABI encode createOrLinkUser(address,uint256,uint256) call
        // 4. Get nonce for the canister's EVM address via eth_getTransactionCount
        // 5. Construct transaction (nonce, gasPrice, gasLimit, to, value=0, data)
        // 6. RLP encode transaction
        // 7. Keccak256 hash the RLP-encoded transaction
        // 8. Request signature from Threshold ECDSA API (using ic-cdk)
        // 9. Attach signature to transaction (v, r, s)
        // 10. RLP encode signed transaction
        // 11. Send via eth_sendRawTransaction RPC call
        // 
        // See THRESHOLD_SIGNATURES.md for detailed implementation plan
        
        // For now, we update local state only
        // The backend can handle the Base contract call if needed
        
        #ok(userId)
    };

    // Verify Twitter function
    public shared (msg) func verifyTwitter(chainId : ChainId, txId : TxHash) : async Result.Result<Nat, Text> {
        // Step 1: Fetch transaction receipt
        let receiptResult = await fetchTransactionReceipt(chainId, txId);
        switch (receiptResult) {
            case (#err(err)) {
                #err("Failed to fetch transaction receipt: " # err)
            };
            case (#ok(receipt)) {
                // Step 2: Parse VerifyTwitterRequested event from logs
                var foundEvent : ?VerifyTwitterRequestedEvent = null;
                
                label logLoop for (log in receipt.logs.vals()) {
                    switch (parseVerifyTwitterEvent(log)) {
                        case (?event) {
                            foundEvent := ?event;
                            break logLoop
                        };
                        case (null) {};
                    }
                };

                switch (foundEvent) {
                    case (?event) {
                        // Step 3: Validate - ensure we have base contract address configured
                        switch (baseContractAddress) {
                            case (?contractAddr) {
                                // Contract address validation can be added here if needed
                                // For now, we trust that the event came from the right contract
                                
                                // Step 4: Call createOrLinkUser on Base contract
                                // For Twitter verification, farcasterId is 0
                                let result = await callCreateOrLinkUser(event.wallet, event.twitterID, 0);
                                
                                switch (result) {
                                    case (#ok(userId)) {
                                        #ok(userId)
                                    };
                                    case (#err(err)) {
                                        #err("Failed to call createOrLinkUser: " # err)
                                    };
                                }
                            };
                            case (null) {
                                #err("Base contract address not configured")
                            };
                        }
                    };
                    case (null) {
                        #err("VerifyTwitterRequested event not found in transaction")
                    };
                }
            };
        }
    };

    // Verify Farcaster function
    public shared (msg) func verifyFarcaster(chainId : ChainId, txId : TxHash) : async Result.Result<Nat, Text> {
        // Step 1: Fetch transaction receipt
        let receiptResult = await fetchTransactionReceipt(chainId, txId);
        switch (receiptResult) {
            case (#err(err)) {
                #err("Failed to fetch transaction receipt: " # err)
            };
            case (#ok(receipt)) {
                // Step 2: Parse VerifyFarcasterRequested event from logs
                var foundEvent : ?VerifyFarcasterRequestedEvent = null;
                
                label logLoop for (log in receipt.logs.vals()) {
                    switch (parseVerifyFarcasterEvent(log)) {
                        case (?event) {
                            foundEvent := ?event;
                            break logLoop
                        };
                        case (null) {};
                    }
                };

                switch (foundEvent) {
                    case (?event) {
                        // Step 3: Validate - ensure we have base contract address configured
                        switch (baseContractAddress) {
                            case (?contractAddr) {
                                // Contract address validation can be added here if needed
                                // For now, we trust that the event came from the right contract

                                // Step 4: Call createOrLinkUser on Base contract
                                // For Farcaster verification, twitterId might be 0 or fetched from Farcaster API
                                // For now, we'll use 0 and let the web3-function handle Twitter linking
                                let result = await callCreateOrLinkUser(event.wallet, 0, event.farcasterFid);
                                
                                switch (result) {
                                    case (#ok(userId)) {
                                        #ok(userId)
                                    };
                                    case (#err(err)) {
                                        #err("Failed to call createOrLinkUser: " # err)
                                    };
                                }
                            };
                            case (null) {
                                #err("Base contract address not configured")
                            };
                        }
                    };
                    case (null) {
                        #err("VerifyFarcasterRequested event not found in transaction")
                    };
                }
            };
        }
    };

    // View function for canister's dedicated EVM address
    public query func canisterDedicatedEvmAddress() : async ?Address {
        canisterEvmAddress
    };

    // Admin functions
    public shared (msg) func setBaseContractAddress(address : Address) : async () {
        // TODO: Add authorization check (e.g., check if msg.caller is owner)
        baseContractAddress := ?address
    };

    public shared (_msg) func setBaseRpcUrl(url : Text) : async () {
        // TODO: Add authorization check
        // Note: This is deprecated - using EVM RPC canister instead
        baseRpcUrl := ?url
    };

    public shared (msg) func setCanisterEvmAddress(address : Address) : async () {
        // TODO: Add authorization check
        canisterEvmAddress := ?address
    };

    // Query functions
    public query func getUserById(userId : Nat) : async ?User {
        users.get(userId)
    };

    public query func getUserByTwitterId(twitterId : Nat) : async ?User {
        switch (userIdByTwitterId.get(twitterId)) {
            case (?userId) {
                users.get(userId)
            };
            case (null) null;
        }
    };

    public query func getUserByFarcasterId(farcasterId : Nat) : async ?User {
        switch (userIdByFarcasterId.get(farcasterId)) {
            case (?userId) {
                users.get(userId)
            };
            case (null) null;
        }
    };

    public query func getUserByWallet(wallet : Address) : async ?User {
        switch (userIdByWallet.get(wallet)) {
            case (?userId) {
                users.get(userId)
            };
            case (null) null;
        }
    };
};
