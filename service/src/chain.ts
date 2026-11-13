import {
  BaseError,
  ContractFunctionRevertedError,
  createPublicClient,
  createWalletClient,
  defineChain,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

/** The only parts of the contract this service uses. */
export const TOKEN_ABI = parseAbi([
  "function reward(address to, uint256 amount, bytes32 ref)",
  "function redeem(address from, uint256 amount, bytes32 ref)",
  "function balanceOf(address account) view returns (uint256)",
  "function processed(bytes32 ref) view returns (bool)",
  "error AlreadyProcessed(bytes32 ref)",
  "error TransfersDisabled()",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
]);

export type ChainOp = "mint" | "burn";

/**
 * What the settler needs from a blockchain. Keeping it this small lets tests
 * wrap it to inject failures, and lets us swap the chain without touching the ledger.
 */
export interface Chain {
  isProcessed(ref: Hex): Promise<boolean>;
  /** Submit the transaction and return its hash without waiting for confirmation. */
  send(op: ChainOp, user: Address, amount: bigint, ref: Hex): Promise<Hex>;
  /** Wait until the transaction is mined; throw if it reverted. */
  waitForReceipt(hash: Hex): Promise<void>;
  balanceOf(user: Address): Promise<bigint>;
}

export interface ViemChainOptions {
  rpcUrl: string;
  tokenAddress: Address;
  issuerKey: Hex;
  chainId?: number;
  pollingIntervalMs?: number;
}

export class ViemChain implements Chain {
  private readonly publicClient;
  private readonly walletClient;
  private readonly token: Address;

  constructor(opts: ViemChainOptions) {
    const chain = defineChain({
      id: opts.chainId ?? 31337,
      name: "configured-chain",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: { default: { http: [opts.rpcUrl] } },
    });
    this.publicClient = createPublicClient({
      chain,
      transport: http(opts.rpcUrl),
      pollingInterval: opts.pollingIntervalMs ?? 1000,
    });
    this.walletClient = createWalletClient({
      chain,
      account: privateKeyToAccount(opts.issuerKey),
      transport: http(opts.rpcUrl),
    });
    this.token = opts.tokenAddress;
  }

  isProcessed(ref: Hex): Promise<boolean> {
    return this.publicClient.readContract({ address: this.token, abi: TOKEN_ABI, functionName: "processed", args: [ref] });
  }

  send(op: ChainOp, user: Address, amount: bigint, ref: Hex): Promise<Hex> {
    return this.walletClient.writeContract({
      address: this.token,
      abi: TOKEN_ABI,
      functionName: op === "mint" ? "reward" : "redeem",
      args: [user, amount, ref],
    });
  }

  async waitForReceipt(hash: Hex): Promise<void> {
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`transaction ${hash} reverted`);
  }

  balanceOf(user: Address): Promise<bigint> {
    return this.publicClient.readContract({ address: this.token, abi: TOKEN_ABI, functionName: "balanceOf", args: [user] });
  }
}

/** The name of the contract error behind a failed call (e.g. "AlreadyProcessed"), if there is one. */
export function revertName(err: unknown): string | undefined {
  if (!(err instanceof BaseError)) return undefined;
  const reverted = err.walk((e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError ? reverted.data?.errorName : undefined;
}

export function describeError(err: unknown): string {
  const name = revertName(err);
  const message = err instanceof BaseError ? err.shortMessage : err instanceof Error ? err.message : String(err);
  return `${name ?? "error"}: ${message}`.slice(0, 300);
}
