import {
  Web3Function,
  Web3FunctionEventContext,
  Web3FunctionResult,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract, Interface, ethers } from "ethers";
import { EAS } from "@ethereum-attestation-service/eas-sdk";

const VerifierContractABI = [
  "function setCoinbaseVerification(address wallet, bytes32 attestationUID) public",
  "function coinbaseVerificationError(address wallet, bytes32 attestationUID, string calldata errorMsg) public",
  "event VerifyCoinbaseRequested(address indexed wallet, bytes32 attestationUID)",
];

// Coinbase Indexer contract address on Base
const COINBASE_INDEXER_ADDRESS = "0x2c7eE1E5f416dfF40054c27A62f7B357C4E8619C";

// Coinbase Indexer ABI - getAttestationUid function
const COINBASE_INDEXER_ABI = [
  "function getAttestationUid(address wallet, bytes32 schemaId) external view returns (bytes32)",
];

// EAS contract address on Base
const EAS_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000021";

// Coinbase Verified Account schema ID
const COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID = "0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9";

Web3Function.onRun(async (context: Web3FunctionEventContext): Promise<Web3FunctionResult> => {
  const { log, userArgs, multiChainProvider } = context;

  const provider = multiChainProvider.default();
  
  // Contract instance for on-chain reads
  const verifierContract = new Contract(
    userArgs.verifierContractAddress as string,
    VerifierContractABI,
    provider as any
  );
  
  // Interface for encoding callData
  const iface = new Interface(VerifierContractABI);

  console.log("🔄 Starting Coinbase verification...");

  try {
    // Parse the event that triggered this Web3 Function
    const contract = new Interface(VerifierContractABI);
    const event = contract.parseLog(log);
    
    if (!event || !event.args) {
      return { canExec: false, message: "Invalid or unparsable event log" };
    }

    // Extract event data
    const { wallet, attestationUID } = event.args as any;

    // Validate event data
    if (!wallet || !attestationUID) {
      return {
        canExec: false,
        message: `Invalid event data: wallet=${wallet}, attestationUID=${attestationUID}`
      };
    }

    console.log(`📧 Event received: VerifyCoinbaseRequested for wallet ${wallet} with attestation UID ${attestationUID}`);

    // Get Base RPC URL from secrets or use default
    const baseRpcUrl = await context.secrets.get("BASE_RPC_URL") || "https://mainnet.base.org";
    
    // Create provider for Base network
    const baseProvider = new ethers.JsonRpcProvider(baseRpcUrl);

    // Step 1: Verify the attestation UID matches what's in the Coinbase Indexer
    const coinbaseIndexer = new Contract(
      COINBASE_INDEXER_ADDRESS,
      COINBASE_INDEXER_ABI,
      baseProvider
    );

    console.log(`🔍 Checking attestation UID in Coinbase Indexer...`);
    
    let indexerAttestationUID: string;
    try {
      indexerAttestationUID = await coinbaseIndexer.getAttestationUid(
        wallet,
        COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID
      );
      
      // Convert bytes32 to hex string for comparison
      const providedUID = ethers.hexlify(attestationUID);
      const indexerUID = ethers.hexlify(indexerAttestationUID);
      
      if (providedUID.toLowerCase() !== indexerUID.toLowerCase()) {
        console.log(`❌ Attestation UID mismatch. Provided: ${providedUID}, Indexer: ${indexerUID}`);
        return returnError(
          userArgs.verifierContractAddress as string,
          iface,
          wallet,
          attestationUID,
          "Attestation UID does not match Coinbase Indexer"
        );
      }
      
      console.log(`✅ Attestation UID verified in Coinbase Indexer`);
    } catch (error: any) {
      console.error(`❌ Error checking Coinbase Indexer:`, error);
      return returnError(
        userArgs.verifierContractAddress as string,
        iface,
        wallet,
        attestationUID,
        `Failed to verify attestation in Coinbase Indexer: ${error.message}`
      );
    }

    // Step 2: Verify the attestation using EAS SDK
    console.log(`🔍 Verifying attestation with EAS...`);
    
    try {
      const eas = new EAS(EAS_CONTRACT_ADDRESS);
      eas.connect(baseProvider);
      
      // Convert bytes32 to hex string for EAS SDK
      const attestationUIDHex = ethers.hexlify(attestationUID);
      const attestation = await eas.getAttestation(attestationUIDHex);
      
      if (!attestation) {
        return returnError(
          userArgs.verifierContractAddress as string,
          iface,
          wallet,
          attestationUID,
          "Attestation not found in EAS"
        );
      }

      // Verify the attestation is valid (not revoked, exists)
      if (attestation.revoked) {
        return returnError(
          userArgs.verifierContractAddress as string,
          iface,
          wallet,
          attestationUID,
          "Attestation has been revoked"
        );
      }

      // Verify the recipient matches the wallet
      if (attestation.recipient.toLowerCase() !== wallet.toLowerCase()) {
        return returnError(
          userArgs.verifierContractAddress as string,
          iface,
          wallet,
          attestationUID,
          "Attestation recipient does not match wallet"
        );
      }

      // Verify the schema matches Coinbase Verified Account schema
      if (attestation.schema.toLowerCase() !== COINBASE_VERIFIED_ACCOUNT_SCHEMA_ID.toLowerCase()) {
        return returnError(
          userArgs.verifierContractAddress as string,
          iface,
          wallet,
          attestationUID,
          "Attestation schema does not match Coinbase Verified Account schema"
        );
      }

      console.log(`✅ Attestation verified successfully`);

      // Step 3: Call setCoinbaseVerification on the contract
      return {
        canExec: true,
        callData: [{
          to: userArgs.verifierContractAddress as string,
          data: iface.encodeFunctionData("setCoinbaseVerification", [
            wallet,
            attestationUID
          ])
        }]
      };

    } catch (error: any) {
      console.error(`❌ Error verifying attestation with EAS:`, error);
      return returnError(
        userArgs.verifierContractAddress as string,
        iface,
        wallet,
        attestationUID,
        `Failed to verify attestation: ${error.message}`
      );
    }

  } catch (error: unknown) {
    const msg = (error as any)?.message || String(error);
    console.error("❌ Fatal error in Coinbase verification:", error);

    // Try to get the event data for error reporting
    try {
      const contract = new Interface(VerifierContractABI);
      const event = contract.parseLog(log);
      if (!event || !event.args) return { canExec: false, message: `Fatal error: ${msg}` };
      const { wallet, attestationUID } = event.args as any;

      return returnError(
        userArgs.verifierContractAddress as string,
        iface,
        wallet,
        attestationUID,
        `Fatal error: ${msg}`
      );
    } catch (parseError: unknown) {
      console.error("❌ Could not parse event for error reporting:", parseError);
      return { canExec: false, message: `Fatal error: ${msg}` };
    }
  }
});

function returnError(
  contractAddress: string,
  iface: Interface,
  wallet: string,
  attestationUID: string,
  errorMessage: string
): Web3FunctionResult {
  return {
    canExec: true,
    callData: [{
      to: contractAddress,
      data: iface.encodeFunctionData("coinbaseVerificationError", [
        wallet,
        attestationUID,
        errorMessage
      ])
    }]
  };
}
