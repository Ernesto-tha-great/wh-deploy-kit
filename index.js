#!/usr/bin/env node
const yargs = require("yargs");
const { hideBin } = require("yargs/helpers");
const inquirer = require("inquirer");
const chalk = require("chalk");
const fs = require("fs");

const { CONFIG_FILE, CHAINS, NETWORKS, MODES } = require("./config/constants");
const {
  getDefaultRpc,
  isValidUrl,
  isValidEthereumAddress,
  isValidSolanaAddress,
  convertToWormholeFormat,
  isValidPrivateKey,
  loadConfig,
  saveConfig,
  validateModeConstraints,
} = require("./lib/utils");

async function interactiveInit() {
  console.log(chalk.bold.cyan("\n Welcome to Heimdall deployment portal!\n"));
  console.log(
    "This cli will provision your multichain deployment config for Wormhole.\n"
  );

  const { network } = await inquirer.prompt([
    {
      type: "list",
      name: "network",
      message: "Select your preferred network:",
      choices: [
        { name: "testnet (recommended)", value: "testnet" },
        { name: "mainnet", value: "mainnet" },
        { name: "devnet", value: "devnet" },
      ],
      default: "testnet",
    },
  ]);

  const { selectedChains } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedChains",
      message:
        "Select chains for deployment: (Space to select, Enter to continue)",
      choices: CHAINS,
      validate: (input) => {
        if (input.length < 2) {
          return "Please select at least 2 chains for cross-chain deployment";
        }
        return true;
      },
    },
  ]);

  const { lockingChain } = await inquirer.prompt([
    {
      type: "list",
      name: "lockingChain",
      message: "Which chain will use LOCKING mode? (Others will use BURNING)",
      choices: [
        ...selectedChains,
        { name: "None (all chains use BURNING)", value: null },
      ],
    },
  ]);

  const chains = {};
  const envVars = {};

  for (const chain of selectedChains) {
    const mode = chain === lockingChain ? "locking" : "burning";
    const defaultRpc = getDefaultRpc(chain, network);

    console.log(
      chalk.bold.yellow(
        `\n═══ Configuring: ${chain.toUpperCase()} (${mode.toUpperCase()} Mode) ═══\n`
      )
    );

    const { rpc } = await inquirer.prompt([
      {
        type: "input",
        name: "rpc",
        message: `RPC Endpoint: (default: ${defaultRpc})`,
        default: defaultRpc,
        validate: (input) => {
          if (!input) return "RPC endpoint is required";
          if (!isValidUrl(input)) return "Please enter a valid HTTP/HTTPS URL";
          return true;
        },
      },
    ]);

    const { tokenAddress } = await inquirer.prompt([
      {
        type: "input",
        name: "tokenAddress",
        message: `Token Address: ${
          chain === "solana" ? "(Base58 format)" : "(e.g., 0x1234...abcd)"
        }`,
        validate: (input) => {
          if (!input) return "Token address is required";
          if (chain === "solana") {
            if (!isValidSolanaAddress(input))
              return "Invalid Solana address format";
          } else {
            if (!isValidEthereumAddress(input))
              return "Invalid Ethereum address format (must be 0x + 40 hex chars)";
          }
          return true;
        },
      },
    ]);

    const wormholeAddress = convertToWormholeFormat(tokenAddress, chain);
    if (chain !== "solana") {
      console.log(
        chalk.green(`✓ Converted to Wormhole format: ${wormholeAddress}`)
      );
    }

    const { privateKey } = await inquirer.prompt([
      {
        type: "password",
        name: "privateKey",
        message: `${chain.toUpperCase()} Private Key:`,
        mask: "*",
        validate: (input) => {
          if (!input) return "Private key is required";
          if (!isValidPrivateKey(input, chain)) {
            return chain === "solana"
              ? "Invalid Solana private key format"
              : "Invalid Ethereum private key format (must be 64 hex characters)";
          }
          return true;
        },
      },
    ]);

    const envVarName = `${chain.toUpperCase()}_PRIVATE_KEY`;
    envVars[envVarName] = privateKey;

    chains[chain] = {
      rpc,
      privateKey: `\${${envVarName}}`,
      tokenAddress: wormholeAddress,
      mode,
    };

    console.log(chalk.green(`✓ Will be stored as: \${${envVarName}}`));
  }

  console.log(chalk.bold.cyan("\n═══ Configuration Summary ═══\n"));
  console.log(chalk.white(`Network: ${chalk.bold(network)}`));
  console.log(chalk.white("Chains:"));
  Object.entries(chains).forEach(([name, config]) => {
    console.log(chalk.white(`  • ${name} (${config.mode.toUpperCase()})`));
  });

  const { confirm } = await inquirer.prompt([
    {
      type: "confirm",
      name: "confirm",
      message: "Does this look correct?",
      default: true,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow("\nConfiguration cancelled."));
    process.exit(0);
  }

  const config = {
    network,
    chains,
  };

  const validation = validateModeConstraints(chains);
  if (!validation.valid) {
    console.error(chalk.red("\n❌ " + validation.error));
    process.exit(1);
  }

  if (saveConfig(config)) {
    console.log(chalk.green(`\n✓ Generated: ${CONFIG_FILE}`));

    console.log(chalk.bold.red("\n⚠️  SECURITY NOTICE ⚠️"));
    console.log(
      chalk.yellow("Private keys are NOT stored in the config file.")
    );
    console.log(chalk.yellow("Please export these environment variables:\n"));

    Object.entries(envVars).forEach(([name, value]) => {
      console.log(chalk.cyan(`export ${name}="${value}"`));
    });

    console.log(chalk.green("\n✓ Done! Your configuration is ready.\n"));
  } else {
    console.error(chalk.red("\n❌ Failed to save configuration file."));
    process.exit(1);
  }
}

function nonInteractiveInit(argv) {
  const network = argv.env || argv.network || "testnet";

  if (!NETWORKS.includes(network)) {
    console.error(chalk.red(`Invalid network: ${network}`));
    console.error(chalk.yellow(`Valid options: ${NETWORKS.join(", ")}`));
    process.exit(1);
  }

  const chains = {};
  const envVarInstructions = [];

  if (!argv.chain || argv.chain.length === 0) {
    console.error(
      chalk.red("Error: At least 2 chains must be specified using --chain flag")
    );
    process.exit(1);
  }

  const selectedChains = Array.isArray(argv.chain) ? argv.chain : [argv.chain];

  if (selectedChains.length < 2) {
    console.error(
      chalk.red(
        "Error: At least 2 chains are required for cross-chain deployment"
      )
    );
    process.exit(1);
  }

  for (const chain of selectedChains) {
    if (!CHAINS.includes(chain)) {
      console.error(chalk.red(`Invalid chain: ${chain}`));
      console.error(chalk.yellow(`Valid options: ${CHAINS.join(", ")}`));
      process.exit(1);
    }

    const rpcFlag = `${chain}Rpc`;
    const tokenFlag = `${chain}Token`;
    const keyFlag = `${chain}Key`;
    const modeFlag = `${chain}Mode`;

    const rpc = argv[rpcFlag] || getDefaultRpc(chain, network);
    const token = argv[tokenFlag];
    const keyEnvVar = argv[keyFlag];
    const mode = argv[modeFlag] || "burning";

    if (!rpc) {
      console.error(
        chalk.red(`Missing RPC endpoint for ${chain}. Use --${chain}-rpc`)
      );
      process.exit(1);
    }

    if (!isValidUrl(rpc)) {
      console.error(chalk.red(`Invalid RPC URL for ${chain}: ${rpc}`));
      process.exit(1);
    }

    if (!token) {
      console.error(
        chalk.red(`Missing token address for ${chain}. Use --${chain}-token`)
      );
      process.exit(1);
    }

    if (!keyEnvVar) {
      console.error(
        chalk.red(
          `Missing private key env var for ${chain}. Use --${chain}-key`
        )
      );
      process.exit(1);
    }

    if (!MODES.includes(mode)) {
      console.error(chalk.red(`Invalid mode for ${chain}: ${mode}`));
      console.error(chalk.yellow(`Valid options: ${MODES.join(", ")}`));
      process.exit(1);
    }

    let wormholeAddress;
    try {
      wormholeAddress = convertToWormholeFormat(token, chain);
    } catch (error) {
      console.error(
        chalk.red(`Error converting ${chain} address: ${error.message}`)
      );
      process.exit(1);
    }

    chains[chain] = {
      rpc,
      privateKey: `\${${keyEnvVar}}`,
      tokenAddress: wormholeAddress,
      mode,
    };

    envVarInstructions.push(keyEnvVar);
  }

  const validation = validateModeConstraints(chains);
  if (!validation.valid) {
    console.error(chalk.red("❌ " + validation.error));
    process.exit(1);
  }

  const config = {
    network,
    chains,
  };

  if (argv.force && fs.existsSync(CONFIG_FILE)) {
    console.log(chalk.yellow(`Overwriting existing ${CONFIG_FILE}...`));
  } else if (fs.existsSync(CONFIG_FILE) && !argv.force) {
    console.error(
      chalk.red(
        `Error: ${CONFIG_FILE} already exists. Use --force to overwrite.`
      )
    );
    process.exit(1);
  }

  if (saveConfig(config)) {
    console.log(chalk.green(`✓ Generated: ${CONFIG_FILE}`));

    console.log(chalk.bold.red("\n⚠️  SECURITY NOTICE ⚠️"));
    console.log(
      chalk.yellow("Make sure these environment variables are set:\n")
    );

    envVarInstructions.forEach((envVar) => {
      console.log(chalk.cyan(`export ${envVar}="your_private_key_here"`));
    });

    console.log(chalk.green("\n✓ Configuration created successfully.\n"));
  } else {
    process.exit(1);
  }
}

function showConfig() {
  const config = loadConfig();

  if (!config) {
    console.error(
      chalk.red(`Error: ${CONFIG_FILE} not found. Run 'heimdall init' first.`)
    );
    process.exit(1);
  }

  console.log(chalk.bold.cyan("\n═══ Current Configuration ═══\n"));
  console.log(chalk.white(`Network: ${chalk.bold(config.network)}`));
  console.log(chalk.white("\nChains:"));

  Object.entries(config.chains).forEach(([name, chainConfig]) => {
    console.log(chalk.bold.yellow(`\n${name.toUpperCase()}:`));
    console.log(chalk.white(`  Mode: ${chainConfig.mode}`));
    console.log(chalk.white(`  RPC: ${chainConfig.rpc}`));
    console.log(chalk.white(`  Token: ${chainConfig.tokenAddress}`));
    console.log(chalk.white(`  Private Key: ${chainConfig.privateKey}`));
  });

  console.log(chalk.cyan("\n═══ Required Environment Variables ═══\n"));
  Object.entries(config.chains).forEach(([name, chainConfig]) => {
    const match = chainConfig.privateKey.match(/\$\{(.+?)\}/);
    if (match) {
      console.log(chalk.white(`  ${match[1]}`));
    }
  });
  console.log();
}

function validateConfig() {
  const config = loadConfig();

  if (!config) {
    console.error(chalk.red(`Error: ${CONFIG_FILE} not found.`));
    process.exit(1);
  }

  console.log(chalk.bold.cyan("Validating configuration...\n"));

  let hasErrors = false;

  if (!config.network || !NETWORKS.includes(config.network)) {
    console.error(chalk.red(`✗ Invalid network: ${config.network}`));
    hasErrors = true;
  } else {
    console.log(chalk.green(`✓ Network: ${config.network}`));
  }

  if (!config.chains || Object.keys(config.chains).length < 2) {
    console.error(chalk.red("✗ At least 2 chains are required"));
    hasErrors = true;
  } else {
    console.log(
      chalk.green(`✓ Chain count: ${Object.keys(config.chains).length}`)
    );
  }

  const validation = validateModeConstraints(config.chains);
  if (!validation.valid) {
    console.error(chalk.red(`✗ ${validation.error}`));
    hasErrors = true;
  } else {
    console.log(chalk.green("✓ Mode constraints valid"));
  }

  Object.entries(config.chains).forEach(([name, chainConfig]) => {
    if (!CHAINS.includes(name)) {
      console.error(chalk.red(`✗ Invalid chain: ${name}`));
      hasErrors = true;
    }

    if (!isValidUrl(chainConfig.rpc)) {
      console.error(
        chalk.red(`✗ Invalid RPC URL for ${name}: ${chainConfig.rpc}`)
      );
      hasErrors = true;
    }

    if (!chainConfig.tokenAddress) {
      console.error(chalk.red(`✗ Missing token address for ${name}`));
      hasErrors = true;
    }

    if (!MODES.includes(chainConfig.mode)) {
      console.error(
        chalk.red(`✗ Invalid mode for ${name}: ${chainConfig.mode}`)
      );
      hasErrors = true;
    }
  });

  if (hasErrors) {
    console.log(chalk.red("\n❌ Configuration validation failed!\n"));
    process.exit(1);
  } else {
    console.log(chalk.green("\n✓ Configuration is valid!\n"));
  }
}

async function addChain(chainName) {
  const config = loadConfig();

  if (!config) {
    console.error(
      chalk.red(`Error: ${CONFIG_FILE} not found. Run 'heimdall init' first.`)
    );
    process.exit(1);
  }

  if (!chainName) {
    console.error(
      chalk.red("Error: Chain name is required. Usage: heimdall add <chain>")
    );
    process.exit(1);
  }

  if (!CHAINS.includes(chainName)) {
    console.error(chalk.red(`Invalid chain: ${chainName}`));
    console.error(chalk.yellow(`Valid options: ${CHAINS.join(", ")}`));
    process.exit(1);
  }

  if (config.chains[chainName]) {
    console.error(
      chalk.red(`Chain ${chainName} already exists in configuration.`)
    );
    process.exit(1);
  }

  const defaultRpc = getDefaultRpc(chainName, config.network);

  console.log(
    chalk.bold.yellow(`\n═══ Adding: ${chainName.toUpperCase()} ═══\n`)
  );

  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "rpc",
      message: `RPC Endpoint: (default: ${defaultRpc})`,
      default: defaultRpc,
      validate: (input) => {
        if (!input) return "RPC endpoint is required";
        if (!isValidUrl(input)) return "Please enter a valid HTTP/HTTPS URL";
        return true;
      },
    },
    {
      type: "input",
      name: "tokenAddress",
      message: `Token Address: ${
        chainName === "solana" ? "(Base58 format)" : "(e.g., 0x1234...abcd)"
      }`,
      validate: (input) => {
        if (!input) return "Token address is required";
        if (chainName === "solana") {
          if (!isValidSolanaAddress(input))
            return "Invalid Solana address format";
        } else {
          if (!isValidEthereumAddress(input))
            return "Invalid Ethereum address format";
        }
        return true;
      },
    },
    {
      type: "password",
      name: "privateKey",
      message: `${chainName.toUpperCase()} Private Key:`,
      mask: "*",
      validate: (input) => {
        if (!input) return "Private key is required";
        if (!isValidPrivateKey(input, chainName)) {
          return chainName === "solana"
            ? "Invalid Solana private key format"
            : "Invalid Ethereum private key format";
        }
        return true;
      },
    },
    {
      type: "list",
      name: "mode",
      message: "Select mode:",
      choices: MODES,
    },
  ]);

  const wormholeAddress = convertToWormholeFormat(
    answers.tokenAddress,
    chainName
  );
  const envVarName = `${chainName.toUpperCase()}_PRIVATE_KEY`;

  config.chains[chainName] = {
    rpc: answers.rpc,
    privateKey: `\${${envVarName}}`,
    tokenAddress: wormholeAddress,
    mode: answers.mode,
  };

  const validation = validateModeConstraints(config.chains);
  if (!validation.valid) {
    console.error(chalk.red("\n❌ " + validation.error));
    console.log(chalk.yellow("Chain not added."));
    process.exit(1);
  }

  if (saveConfig(config)) {
    console.log(chalk.green(`\n✓ Added ${chainName} to configuration`));
    console.log(
      chalk.yellow("\nDon't forget to set the environment variable:")
    );
    console.log(chalk.cyan(`export ${envVarName}="${answers.privateKey}"`));
    console.log();
  } else {
    process.exit(1);
  }
}

function removeChain(chainName) {
  const config = loadConfig();

  if (!config) {
    console.error(chalk.red(`Error: ${CONFIG_FILE} not found.`));
    process.exit(1);
  }

  if (!chainName) {
    console.error(
      chalk.red("Error: Chain name is required. Usage: heimdall remove <chain>")
    );
    process.exit(1);
  }

  if (!config.chains[chainName]) {
    console.error(chalk.red(`Chain ${chainName} not found in configuration.`));
    process.exit(1);
  }

  delete config.chains[chainName];

  if (Object.keys(config.chains).length < 2) {
    console.error(
      chalk.red("Error: Cannot remove chain. At least 2 chains are required.")
    );
    process.exit(1);
  }

  if (saveConfig(config)) {
    console.log(chalk.green(`✓ Removed ${chainName} from configuration\n`));
  } else {
    process.exit(1);
  }
}

function envCheck() {
  const config = loadConfig();

  if (!config) {
    console.error(chalk.red(`Error: ${CONFIG_FILE} not found.`));
    process.exit(1);
  }

  console.log(chalk.bold.cyan("\n═══ Environment Variables Check ═══\n"));

  let allSet = true;

  Object.entries(config.chains).forEach(([name, chainConfig]) => {
    const match = chainConfig.privateKey.match(/\$\{(.+?)\}/);
    if (match) {
      const envVarName = match[1];
      const isSet =
        process.env[envVarName] !== undefined && process.env[envVarName] !== "";

      if (isSet) {
        console.log(chalk.green(`✓ ${envVarName}`));
      } else {
        console.log(chalk.red(`✗ ${envVarName}`));
        allSet = false;
      }
    }
  });

  if (allSet) {
    console.log(
      chalk.green("\n✓ All required environment variables are set!\n")
    );
  } else {
    console.log(
      chalk.yellow("\n⚠️  Some environment variables are not set.\n")
    );
    process.exit(1);
  }
}

yargs(hideBin(process.argv))
  .command(
    "init [network]",
    "Initialize a new Wormhole configuration",
    (yargs) => {
      return yargs
        .positional("network", {
          describe: "Network (mainnet, testnet, devnet)",
          type: "string",
          choices: NETWORKS,
        })
        .option("env", {
          alias: "e",
          describe: "Network (alternative to positional)",
          type: "string",
          choices: NETWORKS,
        })
        .option("chain", {
          describe: "Add a chain (can be used multiple times)",
          type: "array",
        })
        .option("force", {
          alias: "f",
          describe: "Overwrite existing config",
          type: "boolean",
          default: false,
        })
        .option("ethereum-rpc", {
          type: "string",
          describe: "Ethereum RPC endpoint",
        })
        .option("ethereum-token", {
          type: "string",
          describe: "Ethereum token address",
        })
        .option("ethereum-key", {
          type: "string",
          describe: "Ethereum private key env var name",
        })
        .option("ethereum-mode", {
          type: "string",
          choices: MODES,
          describe: "Ethereum mode",
        })
        .option("arbitrum-rpc", {
          type: "string",
          describe: "Arbitrum RPC endpoint",
        })
        .option("arbitrum-token", {
          type: "string",
          describe: "Arbitrum token address",
        })
        .option("arbitrum-key", {
          type: "string",
          describe: "Arbitrum private key env var name",
        })
        .option("arbitrum-mode", {
          type: "string",
          choices: MODES,
          describe: "Arbitrum mode",
        })
        .option("optimism-rpc", {
          type: "string",
          describe: "Optimism RPC endpoint",
        })
        .option("optimism-token", {
          type: "string",
          describe: "Optimism token address",
        })
        .option("optimism-key", {
          type: "string",
          describe: "Optimism private key env var name",
        })
        .option("optimism-mode", {
          type: "string",
          choices: MODES,
          describe: "Optimism mode",
        })
        .option("base-rpc", { type: "string", describe: "Base RPC endpoint" })
        .option("base-token", {
          type: "string",
          describe: "Base token address",
        })
        .option("base-key", {
          type: "string",
          describe: "Base private key env var name",
        })
        .option("base-mode", {
          type: "string",
          choices: MODES,
          describe: "Base mode",
        })
        .option("solana-rpc", {
          type: "string",
          describe: "Solana RPC endpoint",
        })
        .option("solana-token", {
          type: "string",
          describe: "Solana token address",
        })
        .option("solana-key", {
          type: "string",
          describe: "Solana private key env var name",
        })
        .option("solana-mode", {
          type: "string",
          choices: MODES,
          describe: "Solana mode",
        });
    },
    async (argv) => {
      if (argv.chain && argv.chain.length > 0) {
        nonInteractiveInit(argv);
      } else {
        await interactiveInit();
      }
    }
  )
  .command("show", "Display current configuration", () => {}, showConfig)
  .command("validate", "Validate configuration file", () => {}, validateConfig)
  .command(
    "add <chain>",
    "Add a new chain to existing configuration",
    (yargs) => {
      return yargs.positional("chain", {
        describe: "Chain name to add",
        type: "string",
        choices: CHAINS,
      });
    },
    async (argv) => {
      await addChain(argv.chain);
    }
  )
  .command(
    "remove <chain>",
    "Remove a chain from configuration",
    (yargs) => {
      return yargs.positional("chain", {
        describe: "Chain name to remove",
        type: "string",
      });
    },
    (argv) => {
      removeChain(argv.chain);
    }
  )
  .command(
    "env-check",
    "Check if required environment variables are set",
    () => {},
    envCheck
  )
  .demandCommand(1, "You must provide a command")
  .help()
  .alias("help", "h")
  .version("1.0.0")
  .alias("version", "v")
  .strict()
  .parse();
