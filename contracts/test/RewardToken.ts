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

  // Two keys, two jobs: the issuer runs the day-to-day work, the admin decides who the issuer is.
  // Neither can do the other's job. This is what lets the partner hold the admin key.
  it("the admin can take the issuer's key away, and the old issuer can no longer reward", async () => {
    const token = await deploy();
    const issuerRole = await token.read.ISSUER_ROLE();
    await token.write.reward([alice.account.address, 100n, ref("purchase-1")], { account: issuer.account });

    await token.write.revokeRole([issuerRole, issuer.account.address], { account: admin.account });
    await viem.assertions.revertWithCustomError(
      token.write.reward([alice.account.address, 50n, ref("purchase-2")], { account: issuer.account }),
      token,
      "AccessControlUnauthorizedAccount",
    );
    assert.equal(await token.read.balanceOf([alice.account.address]), 100n); // balances are untouched

    // The admin can name a new issuer, who can work straight away.
    await token.write.grantRole([issuerRole, bob.account.address], { account: admin.account });
    await token.write.reward([alice.account.address, 50n, ref("purchase-2")], { account: bob.account });
    assert.equal(await token.read.balanceOf([alice.account.address]), 150n);
  });

  it("neither key has full power alone: the issuer cannot grant roles, the admin cannot create tokens", async () => {
    const token = await deploy();
    const issuerRole = await token.read.ISSUER_ROLE();
    const adminRole = await token.read.DEFAULT_ADMIN_ROLE();

    await viem.assertions.revertWithCustomError(
      token.write.grantRole([issuerRole, alice.account.address], { account: issuer.account }),
      token,
      "AccessControlUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      token.write.grantRole([adminRole, issuer.account.address], { account: issuer.account }),
      token,
      "AccessControlUnauthorizedAccount",
    );
    await viem.assertions.revertWithCustomError(
      token.write.reward([alice.account.address, 100n, ref("x")], { account: admin.account }),
      token,
      "AccessControlUnauthorizedAccount",
    );
  });
});
