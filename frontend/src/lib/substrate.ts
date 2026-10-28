/**
 * Lightweight helper for Portaldot Layer-0 SS58 Address validation
 */
export function isValidSS58(address: string): boolean {
  if (!address || address.length < 47 || address.length > 49) {
    return false;
  }
  // Standard Substrate SS58 base58 character set check
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
  return base58Regex.test(address);
}

export function formatAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
