const { ethers } = require("hardhat");

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);

        // Check deployer balance
        const balance = await deployer.getBalance();
        console.log("Account balance:", ethers.utils.formatEther(balance));

        // Deploy DEX Simulator
        console.log("Deploying DEX Simulator...");
        const DEXInteractionSimulator = await ethers.getContractFactory("DEXInteractionSimulator");
        const dexSimulator = await DEXInteractionSimulator.deploy(
            process.env.UNISWAP_ROUTER,
            process.env.XDI_TOKEN_ADDRESS
        );
        await dexSimulator.deployed();
        console.log("DEX Simulator deployed to:", dexSimulator.address);

        // Verify initial setup
        console.log("\nVerifying initial setup...");
        const price = await dexSimulator.getCurrentPrice();
        console.log("Initial XDI/ETH price:", ethers.utils.formatEther(price));

        const [xdiBalance, ethBalance] = await dexSimulator.getBalances();
        console.log("Initial balances:");
        console.log("XDI:", ethers.utils.formatEther(xdiBalance));
        console.log("ETH:", ethers.utils.formatEther(ethBalance));

        // Get pool state
        const poolState = await dexSimulator.getPoolState();
        console.log("\nPool state:");
        console.log("Reserve0:", ethers.utils.formatEther(poolState.reserve0));
        console.log("Reserve1:", ethers.utils.formatEther(poolState.reserve1));
        console.log("Price:", ethers.utils.formatEther(poolState.price));
        console.log("Liquidity:", ethers.utils.formatEther(poolState.liquidity));

        return dexSimulator.address;
    } catch (error) {
        console.error("Deployment failed:", error);
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
