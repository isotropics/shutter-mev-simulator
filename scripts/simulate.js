const { ethers } = require("hardhat");

async function simulateMEVAttack(dexSimulator, victimAmount) {
    try {
        // 1. Get initial state
        const initialPrice = await dexSimulator.getCurrentPrice();
        console.log("\nInitial price:", ethers.utils.formatEther(initialPrice));

        // 2. Calculate expected output without MEV
        const expectedOutput = await dexSimulator.getQuote(victimAmount);
        console.log("Expected output without MEV:", ethers.utils.formatEther(expectedOutput), "ETH");

        // 3. Simulate frontrun
        const frontrunAmount = victimAmount.div(10); // 10% of victim's amount
        console.log("\nSimulating frontrun with:", ethers.utils.formatEther(frontrunAmount), "XDI");
        
        const result = await dexSimulator.executeSwap(
            frontrunAmount,
            0 // No minimum output for simulation
        );

        // 4. Execute victim's transaction
        console.log("\nExecuting victim's trade...");
        const victimResult = await dexSimulator.executeSwap(
            victimAmount,
            0 // No minimum output for simulation
        );

        // 5. Calculate MEV impact
        const actualOutput = victimResult.amountOut;
        const mevImpact = expectedOutput.sub(actualOutput);
        const impactPercentage = mevImpact.mul(100).div(expectedOutput);

        // Print detailed results
        console.log("\nMEV Attack Results:");
        console.log("-------------------");
        console.log("Victim's trade amount:", ethers.utils.formatEther(victimAmount), "XDI");
        console.log("Expected output:", ethers.utils.formatEther(expectedOutput), "ETH");
        console.log("Actual output:", ethers.utils.formatEther(actualOutput), "ETH");
        console.log("Value lost to MEV:", ethers.utils.formatEther(mevImpact), "ETH");
        console.log("Loss percentage:", impactPercentage.toString(), "%");

        // Gas analysis
        const totalGasUsed = result.gasUsed.add(victimResult.gasUsed);
        const gasPrice = ethers.utils.parseUnits("50", "gwei");
        const gasCost = gasPrice.mul(totalGasUsed);

        console.log("\nGas Analysis:");
        console.log("-------------");
        console.log("Total gas used:", totalGasUsed.toString());
        console.log("Gas cost:", ethers.utils.formatEther(gasCost), "ETH");
        console.log("Net MEV profit:", ethers.utils.formatEther(mevImpact.sub(gasCost)), "ETH");

        return {
            expectedOutput,
            actualOutput,
            mevImpact,
            impactPercentage,
            gasCost
        };
        console.error("Error in MEV attack simulation:", error);
        throw error;
    }
}

async function main() {
    try {
        // Get deployer account
        const [deployer] = await ethers.getSigners();
        console.log("Simulating with account:", deployer.address);

        // Get deployed simulator
        const dexSimulator = await ethers.getContractAt(
            "DEXInteractionSimulator",
            process.env.SIMULATOR_ADDRESS // From deployment
        );

        // Verify connection
        const poolState = await dexSimulator.getPoolState();
        console.log("\nInitial pool state:");
        console.log("Price:", ethers.utils.formatEther(poolState.price));
        console.log("Liquidity:", ethers.utils.formatEther(poolState.liquidity));

        // Simulate MEV attack
        const victimAmount = ethers.utils.parseEther("100"); // 100 XDI
        await simulateMEVAttack(dexSimulator, victimAmount);

    } catch (error) {
        console.error("Error in main execution:", error);
        throw error;
    }
}

main()
    .then(() => {
        console.log("\nSimulation completed successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
