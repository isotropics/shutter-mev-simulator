# MEV Simulator - Implementation Guide

# Disclaimer

This MEV Simulator is an experimental project designed strictly for educational and research purposes. It demonstrates the mechanics of MEV (Maximal Extractable Value) in DeFi environments to help understand their impact and the importance of protective measures.

## Important Notice

- This project is FOR EDUCATIONAL PURPOSES ONLY
- The code and documentation are experimental and should not be used in production
- This simulator demonstrates potential vulnerabilities in DeFi transactions
- We do not encourage or support any malicious use of MEV strategies
- The authors and contributors assume NO RESPONSIBILITY for any misuse or consequences

## Intended Use

- Academic research
- Educational demonstrations
- Security awareness
- Protocol testing in controlled environments
- Understanding DeFi transaction mechanics

## Limitations & Risks

- Not audited for production use
- May contain bugs or vulnerabilities
- No guarantee of accuracy or reliability
- Should not be used for actual trading or deployment
- May not reflect current market conditions or changes in protocols

By using this codebase, you acknowledge that you understand these risks and will use it responsibly and ethically for educational purposes only.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY.
```

## Table of Contents
1. Project Overview
2. Prerequisites
3. Complete Implementation
   - Project Structure
   - Configuration Files
   - Contract Interfaces
   - Core Contracts
   - Scripts
   - Tests
4. Step-by-Step Setup & Execution
5. Validation & Testing
6. Troubleshooting Guide
7. Expected Results

## 1. Project Overview

### Purpose
- Demonstrate MEV attacks (front-running/sandwich) on XDI-ETH pairs
- Quantify financial impact on trades
- Justify Shutter encrypted mempool implementation
- Provide metrics for MEV impact analysis

### Core Features
- Real DEX interaction simulation
- MEV attack demonstration
- Impact calculation
- Gas cost analysis
- Price impact measurement

## 2. Prerequisites

Required tools and versions:
```
Node.js >= 14.0.0
npm >= 6.14.0
Hardhat >= 2.14.0
Ethers.js = 5.7.2 (specific version requirement)
```

Network requirements:
- Gnosis Chain RPC URL
- Test account with private key
- Test ETH and XDI tokens

## 3. Complete Implementation

### Project Structure
```
mev-simulator/
├── contracts/
│   ├── interfaces/
│   │   ├── IUniswapV2Factory.sol
│   │   ├── IUniswapV2Router02.sol
│   │   ├── IUniswapV2Pair.sol
│   │   └── IERC20.sol
│   └── DEXInteractionSimulator.sol
├── scripts/
│   ├── abis.js
│   ├── deploy.js
│   └── simulate.js
├── test/
│   └── MEVSimulator.test.js
├── hardhat.config.js
├── .env
└── package.json
```
Note: This is a working prototype. To use it effectively, please ensure you configure the necessary details as per your requirements. If you encounter any issues, feel free to create an issue in this repository, and our team will review and resolve it.

## 4. Execution Steps

1. Create project and install dependencies:
```bash
mkdir mev-simulator
cd mev-simulator
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers @nomiclabs/hardhat-waffle \
    ethereum-waffle chai @openzeppelin/contracts dotenv ethers@^5.7.2
```

2. Create the project structure and copy all files:
```bash
mkdir contracts contracts/interfaces scripts test
# Copy all contract files, scripts, and test files to their respective directories
```

3. Configure environment:
```bash
# Create and edit .env file with your values
GNOSIS_RPC_URL=your_gnosis_rpc_url
PRIVATE_KEY=your_private_key_without_0x
XDI_TOKEN_ADDRESS=your_xdi_token_address
UNISWAP_ROUTER=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
```

4. Compile contracts:
```bash
npx hardhat compile
```

5. Run tests:
```bash
npx hardhat test
```

6. Deploy contracts:
```bash
npx hardhat run scripts/deploy.js --network hardhat
```

7. Run simulation:
```bash
npx hardhat run scripts/simulate.js --network hardhat
```

## 5. Expected Results

The simulation should show:
1. Successful MEV attack demonstration
2. Quantifiable loss for victim trades
3. Profit calculation for MEV bots
4. Gas cost analysis
5. Price impact measurements

Example output:
```
Initial XDI/ETH price: 0.015
Expected output without MEV: 1.5 ETH
Actual output after MEV: 1.2 ETH
Value lost to MEV: 0.3 ETH
Loss percentage: 20%

Gas Analysis:
Total gas used: 150000
Gas cost: 0.0075 ETH
Net MEV profit: 0.2925 ETH
```

## 6. Troubleshooting

Common issues and solutions:

1. Compilation errors:
```bash
# Error: Cannot find module '@nomiclabs/hardhat-waffle'
npm install --save-dev @nomiclabs/hardhat-waffle

# Error: Source file requires different compiler version
# Update solidity version in hardhat.config.js
```

2. Deployment errors:
```bash
# Error: cannot estimate gas
# Solution: Check RPC URL and network configuration

# Error: insufficient funds
# Solution: Ensure account has enough ETH for deployment
```

3. Simulation errors:
```bash
# Error: Price impact too high
# Solution: Reduce trade size or increase pool liquidity

# Error: Transaction failed
# Solution: Check allowances and balances
```

## 7. Support and Maintenance

For issues or questions:
1. Verify all environment variables
2. Check contract deployments
3. Verify network status
4. Monitor gas prices
5. Check pool liquidity
