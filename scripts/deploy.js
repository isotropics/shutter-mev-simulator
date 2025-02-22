const { ethers } = require("hardhat");
require('dotenv').config();

async function main() {
    try {
        // Check required environment variables
        if (!process.env.UNISWAP_ROUTER) {
            throw new Error("UNISWAP_ROUTER not set in .env");
        }
        if (!process.env.XDI_TOKEN_ADDRESS) {
            throw new Error("XDI_TOKEN_ADDRESS not set in .env");
        }

        // Get gas settings from .env or use defaults
        const GAS_LIMIT = process.env.GAS_LIMIT || "2000000";
        const GAS_PRICE = process.env.GAS_PRICE || "5"; // in gwei

        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);

        // Check deployer balance
        const balance = await deployer.getBalance();
        console.log("Account balance:", ethers.utils.formatEther(balance));

        // Log configuration
        console.log("\nDeployment Configuration:");
        console.log("Router:", process.env.UNISWAP_ROUTER);
        console.log("XDI:", process.env.XDI_TOKEN_ADDRESS);
        console.log("Gas Limit:", GAS_LIMIT);
        console.log("Gas Price:", GAS_PRICE, "gwei");

        // Deploy DEX Simulator
        console.log("\nDeploying DEX Simulator...");
        const DEXInteractionSimulator = await ethers.getContractFactory("DEXInteractionSimulator");
        const dexSimulator = await DEXInteractionSimulator.deploy(
            process.env.UNISWAP_ROUTER,
            process.env.XDI_TOKEN_ADDRESS,
            {
                gasLimit: ethers.utils.parseUnits(GAS_LIMIT, "wei"),
                gasPrice: ethers.utils.parseUnits(GAS_PRICE, "gwei")
            }
        );

        console.log("Waiting for deployment...");
        await dexSimulator.deployed();
        console.log("DEX Simulator deployed to:", dexSimulator.address);

        // Rest of the verification code...
        try {
            console.log("\nVerifying initial setup...");
            const price = await dexSimulator.getCurrentPrice();
            console.log("Initial XDI/ETH price:", ethers.utils.formatEther(price));

            const [xdiBalance, ethBalance] = await dexSimulator.getBalances();
            console.log("Initial balances:");
            console.log("XDI:", ethers.utils.formatEther(xdiBalance));
            console.log("ETH:", ethers.utils.formatEther(ethBalance));

            const poolState = await dexSimulator.getPoolState();
            console.log("\nPool state:");
            console.log("Reserve0:", ethers.utils.formatEther(poolState.reserve0));
            console.log("Reserve1:", ethers.utils.formatEther(poolState.reserve1));
            console.log("Price:", ethers.utils.formatEther(poolState.price));
            console.log("Liquidity:", ethers.utils.formatEther(poolState.liquidity));
        } catch (verifyError) {
            console.log("\nVerification steps failed, but contract is deployed:", verifyError.message);
        }

        return dexSimulator.address;
    } catch (error) {
        console.error("\nDeployment failed!");
        console.error("Error details:", error.message);
        throw error;
    }
}

main()
    .then((address) => {
        console.log("\nDeployment completed successfully");
        console.log("Contract address:", address);
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });