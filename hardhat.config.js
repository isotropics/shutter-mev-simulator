require("@nomiclabs/hardhat-waffle");
require("dotenv").config();

// Validate environment variables
const GNOSIS_RPC_URL = process.env.GNOSIS_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!GNOSIS_RPC_URL || !PRIVATE_KEY) {
  throw new Error("Please set your GNOSIS_RPC_URL and PRIVATE_KEY in a .env file");
}

module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      forking: {
        url: GNOSIS_RPC_URL,
        blockNumber: 28000000,
        enabled: true
      },
      mining: {
        auto: true,
        interval: 1000
      }
    },
    gnosis: {
      url: GNOSIS_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`]
    }
  },
  mocha: {
    timeout: 100000
  }
};
