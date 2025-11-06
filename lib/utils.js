const fs = require("fs");
const chalk = require("chalk");
const { CONFIG_FILE, DEFAULT_RPCS } = require("../config/constants");
const { toNative } = require("@wormhole-foundation/sdk");

const CHAIN_NAME_MAP = {
  ethereum: "Ethereum",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  base: "Base",
  solana: "Solana",
};

function getDefaultRpc(chain, network) {
  return DEFAULT_RPCS[chain]?.[network] || "";
}

function isValidUrl(url) {
  try {
    new URL(url);
    return url.startsWith("http://") || url.startsWith("https://");
  } catch {
    return false;
  }
}

function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidSolanaAddress(address) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function convertToWormholeFormat(address, chain) {
  try {
    if (chain === "solana") {
      if (!isValidSolanaAddress(address)) {
        throw new Error(`Invalid Solana address format: ${address}`);
      }
    } else {
      if (!isValidEthereumAddress(address)) {
        throw new Error(`Invalid Ethereum address format: ${address}`);
      }
    }

    const wormholeChainName = CHAIN_NAME_MAP[chain];
    if (!wormholeChainName) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const nativeAddress = toNative(wormholeChainName, address);
    const universalAddress = nativeAddress.toUniversalAddress().toString();

    return universalAddress;
  } catch (error) {
    throw new Error(
      `Failed to convert ${chain} address to Wormhole format: ${error.message}`
    );
  }
}

function isValidPrivateKey(key, chain) {
  if (chain === "solana") {
    return key.length > 20;
  }

  const cleanKey = key.replace("0x", "");
  return /^[a-fA-F0-9]{64}$/.test(cleanKey);
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red("Error reading config file:"), error.message);
    return null;
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(chalk.red("Error writing config file:"), error.message);
    return false;
  }
}

function validateModeConstraints(chains) {
  const lockingChains = Object.entries(chains).filter(
    ([_, config]) => config.mode === "locking"
  );

  if (lockingChains.length > 1) {
    return {
      valid: false,
      error: `Only ONE chain can use LOCKING mode. Found: ${lockingChains
        .map(([name]) => name)
        .join(", ")}`,
    };
  }

  return { valid: true };
}

module.exports = {
  getDefaultRpc,
  isValidUrl,
  isValidEthereumAddress,
  isValidSolanaAddress,
  convertToWormholeFormat,
  isValidPrivateKey,
  loadConfig,
  saveConfig,
  validateModeConstraints,
};
