# Heimdall - Wormhole Deployment CLI

A beginner-friendly command-line tool for configuring multichain token deployments with Wormhole.

## What is this?

Heimdall helps you prepare configuration files before deploying tokens across multiple blockchains. Think of it as a setup wizard that asks you questions and creates a properly formatted `wormhole.config.json` file.

**Note:** This tool only creates config files. It does NOT interact with blockchains or deploy anything on-chain.

## Getting Started

### Installation

```bash
npm install
npm link
```

### Two Ways to Use Heimdall

Heimdall offers two modes to suit your workflow:

1. **Interactive Mode** (recommended for first-time users) - Guided prompts that walk you through each step
2. **Non-Interactive Mode** (for scripts and automation) - Command-line flags to automate configuration

We'll start with interactive mode. If you need non-interactive mode for CI/CD or scripts, [skip to the advanced section](#advanced-non-interactive-mode).

### Your First Configuration (Interactive Mode)

**Step 1: Export Your Private Keys**

Before running Heimdall, set your private keys as environment variables. This keeps them secure and out of your config files:

```bash
# For each chain you plan to use, export its private key:
export BASE_PRIVATE_KEY="0x1234567890abcdef..."
export SOLANA_PRIVATE_KEY="your_solana_private_key_here"
export ETHEREUM_PRIVATE_KEY="0x..."
# etc.
```

**Step 2: Run Heimdall**

```bash
heimdall init
```

That's it! Heimdall will guide you through the setup and automatically use the private keys from your environment variables (without ever printing or storing them).

## Interactive Setup Guide

When you run `heimdall init`, here's what to expect:

### Step 1: Choose Your Network

You'll be asked to select a network:

- **Testnet** (recommended for testing)
- **Mainnet** (for production deployments)
- **Devnet** (for development)

```
? Select your preferred network:
❯ testnet (recommended)
  mainnet
  devnet
```

### Step 2: Select Blockchains

Choose which blockchains you want to deploy to (minimum 2 required):

```
? Select chains for deployment: (Space to select, Enter to continue)
◯ ethereum
◉ base
◯ arbitrum
◯ optimism
◉ solana
```

**Tip:** Use the spacebar to select/deselect chains, then press Enter to continue.

### Step 3: Choose Your Deployment Mode

Select which chain will use LOCKING mode:

```
? Which chain will use LOCKING mode? (Others will use BURNING)
❯ base
  solana
  None (all chains use BURNING)
```

**Important:** Only ONE chain can use LOCKING mode. All others must use BURNING.

### Step 4: Configure Each Chain

For each selected chain, you'll provide:

#### RPC Endpoint (Optional)

```
RPC Endpoint: (default: https://sepolia.base.org)
```

Press Enter to use the default, or paste your custom RPC URL.

#### Token Address (Required)

```
Token Address: (e.g., 0x1234...abcd)
> 0x1234567890123456789012345678901234567890
✓ Converted to Wormhole format: 0x000000000000000000000000123456...
```

Don't worry about the 32-byte format, Heimdall handles the conversion automatically!

Heimdall automatically uses your private key from the `${CHAIN}_PRIVATE_KEY` environment variable you exported earlier.

```
✓ Using BASE_PRIVATE_KEY from environment
```

### Step 5: Review and Confirm

```
═══ Configuration Summary ═══

Network: testnet
Chains:
  • base (LOCKING)
  • solana (BURNING)

? Does this look correct? (Y/n)
```

### Step 6: Done!

After confirmation, Heimdall generates your config file:

```
✓ Generated: wormhole.config.json

✓ Done! Your configuration is ready.

Your private keys remain securely in environment variables.
Run 'heimdall env-check' to verify all keys are set.
```

Your config file is ready to use! The private keys remain safely in your environment variables, never printed or stored in files.

---

## Commands Reference

### View Your Configuration

```bash
heimdall show
```

Displays your current configuration in a readable format.

### Validate Your Configuration

```bash
heimdall validate
```

Checks your config file for errors and ensures all requirements are met.

### Add a New Chain

```bash
heimdall add ethereum
```

Interactively add a new blockchain to your existing configuration.

### Remove a Chain

```bash
heimdall remove ethereum
```

Remove a blockchain from your configuration.

### Check Environment Variables

```bash
heimdall env-check
```

Verifies that all required private key environment variables are set.

### Get Help

```bash
heimdall --help              # See all commands
heimdall init --help         # Help for a specific command
```

---

## Advanced: Non-Interactive Mode

<details>
<summary><b>Click to expand: Using command-line flags for automation</b></summary>

<br>

If you need to automate configuration creation or use Heimdall in scripts and CI/CD pipelines, you can bypass the interactive prompts by providing all options as command-line flags.

### Basic Syntax

```bash
heimdall init <network> --chain <chain-name> [chain-options]
```

### Example: Configure 2 Chains

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

### Available Options

#### Global Options

- `--env <network>` or `-e <network>` — Network: mainnet, testnet, or devnet
- `--chain <name>` — Add a chain (repeat for multiple chains)
- `--force` or `-f` — Overwrite existing config file

#### Per-Chain Options

For each chain, use these flags (replace `<chain>` with ethereum, base, arbitrum, optimism, or solana):

- `--<chain>-rpc <url>` — RPC endpoint (optional, uses defaults)
- `--<chain>-token <address>` — Token contract address (required)
- `--<chain>-key <env-var-name>` — Environment variable name for private key (required)
- `--<chain>-mode <mode>` — Deployment mode: locking or burning (default: burning)

### Example: 3 Chains with Custom RPCs

```bash
heimdall init mainnet \
  --chain ethereum \
  --ethereum-rpc https://eth.llamarpc.com \
  --ethereum-token 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 \
  --ethereum-key ETH_KEY \
  --ethereum-mode burning \
  --chain base \
  --base-token 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  --base-key BASE_KEY \
  --base-mode locking \
  --chain arbitrum \
  --arbitrum-token 0xaf88d065e77c8cC2239327C5EDb3A432268e5831 \
  --arbitrum-key ARB_KEY \
  --arbitrum-mode burning \
  --force
```

### Overwrite Existing Config

Add `--force` to overwrite an existing `wormhole.config.json`:

```bash
heimdall init testnet --chain base ... --force
```

</details>

---

## Understanding Your Configuration

After running `heimdall init`, your `wormhole.config.json` will look like this:

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

---

Built with [yargs](https://www.npmjs.com/package/yargs), [inquirer](https://www.npmjs.com/package/inquirer), and [chalk](https://www.npmjs.com/package/chalk).
