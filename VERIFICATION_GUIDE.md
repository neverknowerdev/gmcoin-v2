# Verification Guide - Understanding Contract Events

## 📊 What the Logs Mean

When you authenticate X/Twitter, you'll see contract events in BaseScan. Here's how to interpret them:

### Event Signatures

1. **`0x955c6571`** = Function selector for `requestTwitterVerificationByAuthCode(string,uint256,string)`
   - This means the contract function was called ✅

2. **`0x838a394683adcaea9dc58cc4cf4a40bf81047bfc339f29c115b122dc9625fd60`** = Event signature for `VerifyTwitterByAuthCodeRequested(address,string,string,uint256)`
   - This event is emitted when you submit verification
   - Contains: wallet address, auth code, tweet ID, Twitter ID

3. **`0x84dea9019e572d7f5b6e5622c27d2c8a9ce264f67cf23982b0b05b4f0f35b77a`** = Event signature for `TwitterVerificationResult(uint256,address,bool,string)`
   - This event is emitted when Gelato finishes processing
   - Contains: Twitter ID, wallet, success status, error message

## 🔍 How to Verify Your Transaction

### Method 1: Check BaseScan

1. Go to: `https://sepolia.basescan.org/tx/YOUR_TX_HASH`
2. Look for events:
   - `VerifyTwitterByAuthCodeRequested` = Your request was submitted ✅
   - `TwitterVerificationResult` = Gelato processed it (may take a few minutes)

### Method 2: Use the Frontend Component

1. After connecting X, you'll see a "Verification Status" card
2. Click "Check" next to Twitter
3. It will query the contract to see if you're verified

### Method 3: Check Browser Console

Look for these logs:
- `✅ Twitter verification transaction submitted`
- `📝 Transaction hash: 0x...`
- `🔗 View on BaseScan: https://sepolia.basescan.org/tx/...`
- `📨 Twitter verification event:` (when Gelato processes it)

## ⏱️ Timeline

1. **Immediate**: Transaction submitted → `VerifyTwitterByAuthCodeRequested` event emitted
2. **1-5 minutes**: Gelato W3F picks up the event
3. **1-2 minutes**: Gelato verifies the tweet
4. **Final**: `TwitterVerificationResult` event emitted (success or error)

## 🐛 Troubleshooting

### "VerifyTwitterByAuthCodeRequested" but no "TwitterVerificationResult"

**Possible causes:**
- Gelato W3F not deployed/configured
- Gelato W3F not listening for events
- Twitter API issues
- Tweet not found or auth code mismatch

**Check:**
1. Verify Gelato W3F is deployed
2. Check Gelato dashboard for task status
3. Verify tweet contains the exact auth code
4. Check Twitter API credentials

### Transaction on Wrong Network

If you see events on Base mainnet instead of Base Sepolia:
- Check the warning banner at top of page
- Click "Switch Network" button
- Verify chain ID is 84532 (Base Sepolia)

## 📝 Decoding Events Manually

You can decode events using ethers.js:

```javascript
const iface = new ethers.Interface([
  "event VerifyTwitterByAuthCodeRequested(address wallet, string authCode, string tweetID, uint256 twitterID)"
]);

const event = iface.parseLog(log);
console.log("Wallet:", event.args.wallet);
console.log("Auth Code:", event.args.authCode);
console.log("Tweet ID:", event.args.tweetID);
console.log("Twitter ID:", event.args.twitterID.toString());
```

## ✅ Success Indicators

You'll know verification worked when:
1. ✅ Transaction hash appears in console
2. ✅ `VerifyTwitterByAuthCodeRequested` event on BaseScan
3. ✅ `TwitterVerificationResult` event with `isSuccess: true`
4. ✅ Frontend shows "Verified ✅" status
5. ✅ Contract query returns your wallet address

## 🔗 Useful Links

- Base Sepolia Explorer: https://sepolia.basescan.org
- Contract Address: `0xACeaD0bE65ABF00709238a7f064aA3285b0bb6d8`
- View Contract: https://sepolia.basescan.org/address/0xACeaD0bE65ABF00709238a7f064aA3285b0bb6d8

