const CONFIG_FILE = "wormhole.config.json";

const CHAINS = ["ethereum", "arbitrum", "optimism", "base", "solana"];

const NETWORKS = ["mainnet", "testnet", "devnet"];

const MODES = ["locking", "burning"];

const DEFAULT_RPCS = {
  ethereum: {
    mainnet: "https://eth.llamarpc.com",
    testnet: "https://rpc.sepolia.org",
    devnet: "https://rpc.sepolia.org",
  },
  arbitrum: {
    mainnet: "https://arb1.arbitrum.io/rpc",
    testnet: "https://sepolia-rollup.arbitrum.io/rpc",
    devnet: "https://sepolia-rollup.arbitrum.io/rpc",
  },
  optimism: {
    mainnet: "https://mainnet.optimism.io",
    testnet: "https://sepolia.optimism.io",
    devnet: "https://sepolia.optimism.io",
  },
  base: {
    mainnet: "https://mainnet.base.org",
    testnet: "https://sepolia.base.org",
    devnet: "https://sepolia.base.org",
  },
  solana: {
    mainnet: "https://api.mainnet-beta.solana.com",
    testnet: "https://api.testnet.solana.com",
    devnet: "https://api.devnet.solana.com",
  },
};

module.exports = {
  CONFIG_FILE,
  CHAINS,
  NETWORKS,
  MODES,
  DEFAULT_RPCS,
};
