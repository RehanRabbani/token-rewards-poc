import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViemPlugin],
  solidity: { version: "0.8.28" },
  networks: {
    // Started with `npx hardhat node`; the backend service connects here.
    localhost: { type: "http", url: "http://127.0.0.1:8545" },
  },
};

export default config;
