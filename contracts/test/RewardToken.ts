import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { keccak256, toHex } from "viem";

const ref = (id: string) => keccak256(toHex(id));

describe("RewardToken", async () => {
  const { viem } = await network.create();
  const [admin, issuer, alice, bob] = await viem.getWalletClients();

  async function deploy() {
    return viem.deployContract("RewardToken", [admin.account.address, issuer.account.address]);
  }

  it("issuer can reward a user", async () => {
    const token = await deploy();
    await token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account });
    assert.equal(await token.read.balanceOf([alice.account.address]), 100n);
  });

  it("nobody else can reward", async () => {
    const token = await deploy();
    await viem.assertions.revertWithCustomError(
      token.write.reward([alice.account.address, 100n, ref("x")], { account: alice.account }),
      token,
      "AccessControlUnauthorizedAccount",
    );
  });

  it("the same reference cannot be used twice (on-chain idempotency)", async () => {
    const token = await deploy();
    await token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account });
    await viem.assertions.revertWithCustomError(
      token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account }),
      token,
      "AlreadyProcessed",
    );
    assert.equal(await token.read.balanceOf([alice.account.address]), 100n);
  });

  it("issuer can redeem (burn) a user's tokens", async () => {
    const token = await deploy();
    await token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account });
    await token.write.redeem([alice.account.address, 30n, ref("spend-1")], { account: issuer.account });
    assert.equal(await token.read.balanceOf([alice.account.address]), 70n);
  });

  it("cannot redeem more than the balance", async () => {
    const token = await deploy();
    await token.write.reward([alice.account.address, 10n, ref("purchase-1")], { account: issuer.account });
    await viem.assertions.revertWithCustomError(
      token.write.redeem([alice.account.address, 11n, ref("spend-1")], { account: issuer.account }),
      token,
      "ERC20InsufficientBalance",
    );
  });

  it("users cannot transfer tokens to each other (closed loop)", async () => {
    const token = await deploy();
    await token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account });
    await viem.assertions.revertWithCustomError(
      token.write.transfer([bob.account.address, 10n], { account: alice.account }),
      token,
      "TransfersDisabled",
    );
  });
});
