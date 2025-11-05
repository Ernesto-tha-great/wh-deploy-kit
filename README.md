# Heimdall - Wormhole Configuration CLI

A command-line tool that helps you set up configuration files for deploying tokens across multiple blockchain networks using Wormhole.

## What does this do?

Before deploying your token to multiple blockchains (Ethereum, Base, Solana, etc.), you need to configure settings for each chain. This tool creates a `wormhole.config.json` file with all your deployment settings in the correct format.

**Important:** This tool only generates a config file. It does NOT deploy anything to the blockchain.

## Installation

```bash
npm install
npm link
```

## Quick Start

Run the interactive setup:

```bash
heimdall init
```

Follow the prompts to:

1. Choose your network (testnet recommended for first-time users)
2. Select which blockchains you want to use
3. Configure each blockchain's settings

The tool will create `wormhole.config.json` with your configuration.

## Basic Commands

### Initialize Configuration (Interactive)

```bash
heimdall init
```

The easiest way to get started. The tool will ask you questions and guide you through the setup.

### Initialize Configuration (Non-Interactive)

```bash
heimdall init testnet \
  --chain base \
  --base-token 0x1234567890123456789012345678901234567890 \
  --base-key BASE_PRIVATE_KEY \
  --base-mode locking \
  --chain solana \
  --solana-token DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKQ \
  --solana-key SOLANA_PRIVATE_KEY \
  --solana-mode burning
```

Useful for scripts and automation.

### View Current Configuration

```bash
heimdall show
```

### Validate Configuration

```bash
heimdall validate
```

Checks if your config file is correct.

### Manage Chains

```bash
heimdall add ethereum      # Add a new chain
heimdall remove ethereum   # Remove a chain
```

### Check Environment Variables

```bash
heimdall env-check
```

Verifies that all required environment variables are set.

## Supported Blockchains

- Ethereum
- Arbitrum
- Optimism
- Base
- Solana

## Understanding Modes

When deploying tokens across chains, each chain operates in one of two modes:

**BURNING Mode:** Tokens are burned on the source chain and minted on the destination chain.

**LOCKING Mode:** Tokens are locked on the source chain and unlocked on the destination chain.

**Rule:** Only ONE chain can use LOCKING mode. All others must use BURNING mode.

## Security Notice

Your private keys are **never stored** in the config file. Instead, the tool uses environment variable references.

After creating a config, you'll need to export your private keys:

```bash
export BASE_PRIVATE_KEY="your_private_key_here"
export SOLANA_PRIVATE_KEY="your_private_key_here"
```

## Example Configuration

After running `heimdall init`, your `wormhole.config.json` will look like:

```json
{
  "network": "testnet",
  "chains": {
    "base": {
      "rpc": "https://sepolia.base.org",
      "privateKey": "${BASE_PRIVATE_KEY}",
      "tokenAddress": "0x0000000000000000000000001234567890123456789012345678901234567890",
      "mode": "locking"
    },
    "solana": {
      "rpc": "https://api.testnet.solana.com",
      "privateKey": "${SOLANA_PRIVATE_KEY}",
      "tokenAddress": "DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKQ",
      "mode": "burning"
    }
  }
}
```

Notice:

- **Token addresses** are automatically converted to Wormhole's 32-byte format
- **Private keys** are stored as environment variable references (`${VAR_NAME}`)
- **Each chain** has its RPC endpoint, token address, and deployment mode

## Help

View all available commands:

```bash
heimdall --help
```

View help for a specific command:

```bash
heimdall init --help
```

## Common Issues

**"Config file already exists"**  
Use `--force` to overwrite: `heimdall init --force`

**"Only ONE chain can use LOCKING mode"**  
Make sure only one chain has LOCKING mode, all others should use BURNING.

**"Invalid address format"**

- Ethereum addresses: Must start with `0x` and have 40 hex characters  
  Example: `0x1234567890123456789012345678901234567890`
- Solana addresses: Base58 format, 32-44 characters  
  Example: `DYw8jCTfwHNRJhhmFcbXvVDTqWMEVFBX6ZKUmG5CNSKQ`

## What Happens to My Addresses?

Ethereum-based addresses (20 bytes) are automatically converted to Wormhole's 32-byte format by padding with zeros:

- **Input:** `0x1234567890123456789012345678901234567890`
- **Output:** `0x0000000000000000000000001234567890123456789012345678901234567890`

Solana addresses are already 32 bytes and don't need conversion.

## Next Steps

After creating your config file:

1. ✅ Run `heimdall validate` to verify your configuration
2. ✅ Run `heimdall env-check` to ensure environment variables are set
3. ✅ Use the `wormhole.config.json` file for your deployment process

---

Built with [yargs](https://www.npmjs.com/package/yargs), [inquirer](https://www.npmjs.com/package/inquirer), and [chalk](https://www.npmjs.com/package/chalk).
