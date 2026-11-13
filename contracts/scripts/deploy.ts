// Deploys RewardToken, rewards a demo user, redeems part of it, and prints balances.
// Local in-process chain:  npx hardhat run scripts/deploy.ts
// Running local node:      npx hardhat run scripts/deploy.ts --network localhost
import { writeFile, mkdir } from "node:fs/promises";
import { network } from "hardhat";
import { keccak256, toHex } from "viem";

const { viem, networkName } = await network.create();
const [admin, issuer, user] = await viem.getWalletClients();

const token = await viem.deployContract("RewardToken", [admin.account.address, issuer.account.address]);
console.log(`RewardToken deployed on "${networkName}" at ${token.address}`);

await token.write.reward([user.account.address, 100n, keccak256(toHex("demo-purchase-1"))], { account: issuer.account });
console.log(`Rewarded 100 PRWD -> balance ${await token.read.balanceOf([user.account.address])}`);

await token.write.redeem([user.account.address, 40n, keccak256(toHex("demo-spend-1"))], { account: issuer.account });
console.log(`Redeemed 40 PRWD  -> balance ${await token.read.balanceOf([user.account.address])}`);

// Save the address so the backend service can find the contract.
await mkdir("deployments", { recursive: true });
await writeFile(
  `deployments/${networkName}.json`,
  JSON.stringify({ address: token.address, issuer: issuer.account.address }, null, 2),
);
console.log(`Saved deployments/${networkName}.json`);
