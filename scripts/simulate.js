const { ethers } = require("hardhat");
const fs = require("fs");
// Define the maximum log file size (Updated to 10MB)
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
// Function to get the log file name
async function getLogFileName() {
    const now = new Date();
    const hour = now.getHours();
    const date = now.toISOString().split("T")[0]; // YYYY-MM-DD format
    return `logs/transactions_${date}_${hour}.log`;
}
// Function to check and rotate logs
async function rotateLogIfNeeded() {
    const logFileName = getLogFileName();
  
    if (fs.existsSync(logFileName)) {
      const stats = fs.statSync(logFileName);
      if (stats.size > MAX_LOG_SIZE) {
        const timestamp = new Date().toISOString().replace(/[:.-]/g, "_");
        const rotatedLogFileName = `logs/transactions_${timestamp}.log`;
        fs.renameSync(logFileName, rotatedLogFileName);
        console.log(`Log file rotated: ${logFileName} -> ${rotatedLogFileName}`);
      }
    }
}
// Function to log transactions
async function logTransaction(transId, mevType, tradeAmount,expectedAMount,actualAMount, profit_percentage, original_loss_percentage) {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];
    const logMessage = `date=${date},time=${time},trans_id=${transId},mev_type=${mevType},trade_amnt=${tradeAmount},expected_amnt=${expectedAMount},actual_amnt=${actualAMount},profit_percentage=${profit_percentage},original_loss_percentage=${original_loss_percentage}`;
    const logFileName = getLogFileName();
    rotateLogIfNeeded();
    fs.appendFileSync(logFileName, logMessage + "\n");
    console.log(logMessage);
}
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

        const mevProfit = mevImpact.sub(gasCost);
        const profitPercentage = mevProfit.mul(100).div(expectedOutput);
        // Generate transaction ID (use the hash of victim's trade as an example)
        const trans_id = victimResult.transactionHash;
        await logTransaction(trans_id,"front_run",ethers.utils.formatEther(victimAmount),ethers.utils.formatEther(expectedOutput),ethers.utils.formatEther(actualOutput),ethers.utils.formatEther(profitPercentage),impactPercentage.toString());
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
