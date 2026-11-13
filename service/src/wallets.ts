import { getAddress, keccak256, toHex, type Address } from "viem";

/**
 * PROOF STAND-IN for the wallet vendor.
 *
 * In production an embedded-wallet vendor (or custody service) creates and holds a
 * wallet per user. Here we derive a stable address from the user id. Nobody holds a
 * key for it, which is fine for a closed-loop token: users never sign anything,
 * only our service mints and burns.
 */
export function addressFor(userId: string): Address {
  const hash = keccak256(toHex(`wallet:${userId}`));
  return getAddress(`0x${hash.slice(-40)}`);
}
