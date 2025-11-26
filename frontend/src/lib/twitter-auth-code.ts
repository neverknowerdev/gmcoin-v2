/**
 * Generates a Twitter verification auth code
 * Format: GM{walletStartingIndex}{wallet10Letters}{random2}
 * 
 * Based on the contract test requirements:
 * - walletStartingIndex: 2-digit hex representation of the starting index (usually "02")
 * - wallet10Letters: 10 characters from wallet address starting at index 2
 * - random2: 2 random alphanumeric characters
 */
export function generateTwitterAuthCode(walletAddress: string): string {
  // Remove 0x prefix if present
  const address = walletAddress.startsWith("0x") ? walletAddress.slice(2) : walletAddress;
  
  // Starting index is 2 (after "0x")
  const walletStartingIndex = "02";
  
  // Get 10 characters starting from index 2 (after "0x")
  const wallet10Letters = address.substring(0, 10).toUpperCase();
  
  // Generate 2 random alphanumeric characters
  const random2 = generateRandomAlphanumeric(2).toUpperCase();
  
  // Combine: GM + index + wallet letters + random
  return `GM${walletStartingIndex}${wallet10Letters}${random2}`;
}

function generateRandomAlphanumeric(length: number): string {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

