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
    const logFileName = await getLogFileName();

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
async function logTransaction(transId, mevType, tradeAmount, expectedAmount, actualAmount, profitPercentage, originalLossPercentage) {
    const now = new Date();
    const date = now.toISOString().split("T")[0];
    const time = now.toTimeString().split(" ")[0];
    const logMessage = `date=${date},time=${time},trans_id=${transId},mev_type=${mevType},trade_amnt=${tradeAmount},expected_amnt=${expectedAmount},actual_amnt=${actualAmount},profit_percentage=${profitPercentage},original_loss_percentage=${originalLossPercentage}`;
    const logFileName = await getLogFileName();
    await rotateLogIfNeeded();
    fs.appendFileSync(logFileName, logMessage + "\n");
    console.log(logMessage);
}

// Function to simulate MEV attack
async function simulateMEVAttack(dexSimulator, victimAmount) {
    try {
        const initialPrice = await dexSimulator.getCurrentPrice();
        console.log("\nInitial price:", ethers.utils.formatEther(initialPrice));

        const expectedOutput = await dexSimulator.getQuote(victimAmount);
        console.log("Expected output without MEV:", ethers.utils.formatEther(expectedOutput), "ETH");

        const frontrunAmount = victimAmount.div(10);
        console.log("\nSimulating frontrun with:", ethers.utils.formatEther(frontrunAmount), "XDI");

        const result = await dexSimulator.executeSwap(frontrunAmount, 0);

        console.log("\nExecuting victim's trade...");
        const victimResult = await dexSimulator.executeSwap(victimAmount, 0);

        const actualOutput = victimResult.amountOut;
        const mevImpact = expectedOutput.sub(actualOutput);
        const impactPercentage = mevImpact.mul(100).div(expectedOutput);

        console.log("\nMEV Attack Results:");
        console.log("-------------------");
        console.log("Victim's trade amount:", ethers.utils.formatEther(victimAmount), "XDI");
        console.log("Expected output:", ethers.utils.formatEther(expectedOutput), "ETH");
        console.log("Actual output:", ethers.utils.formatEther(actualOutput), "ETH");
        console.log("Value lost to MEV:", ethers.utils.formatEther(mevImpact), "ETH");
        console.log("Loss percentage:", impactPercentage.toString(), "%");

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

        const transId = victimResult.transactionHash;
        await logTransaction(
            transId,
            "front_run",
            ethers.utils.formatEther(victimAmount),
            ethers.utils.formatEther(expectedOutput),
            ethers.utils.formatEther(actualOutput),
            ethers.utils.formatEther(profitPercentage),
            impactPercentage.toString()
        );

        return {
            expectedOutput,
            actualOutput,
            mevImpact,
            impactPercentage,
            gasCost
        };
    } catch (error) {
        console.error("Error in MEV attack simulation:", error);
        throw error;
    }
}

// Main function
async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Simulating with account:", deployer.address);

        const dexSimulator = await ethers.getContractAt(
            "DEXInteractionSimulator",
            process.env.SIMULATOR_ADDRESS
        );

        const poolState = await dexSimulator.getPoolState();
        console.log("\nInitial pool state:");
        console.log("Price:", ethers.utils.formatEther(poolState.price));
        console.log("Liquidity:", ethers.utils.formatEther(poolState.liquidity));

        const victimAmount = ethers.utils.parseEther("100");
        await simulateMEVAttack(dexSimulator, victimAmount);

    } catch (error) {
        console.error("Error in main execution:", error);
    }
}

// Run the script every 15 minutes
async function runEvery15Minutes() {
    while (true) {
        try {
            console.log("\nRunning MEV attack simulation...");
            await main();
            console.log("\nWaiting for 15 minutes before the next run...");
        } catch (error) {
            console.error("Error in scheduled execution:", error);
        }
        await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000)); // 15 minutes
    }
}

// Start the loop
runEvery15Minutes();
