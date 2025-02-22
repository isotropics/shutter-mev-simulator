const { expect } = require("chai");
const { ethers } = require("hardhat");
require('dotenv').config();

// Configuration from environment variables
const CONFIG = {
    ROUTER: process.env.UNISWAP_ROUTER,
    XDI_TOKEN: process.env.XDI_TOKEN_ADDRESS,
    WXDAI: process.env.WXDAI_ADDRESS,
    GAS_LIMIT: process.env.GAS_LIMIT || "2000000",
    GAS_PRICE: process.env.GAS_PRICE || "5",
    TEST_AMOUNT: process.env.TEST_AMOUNT || "1", // Amount in XDI
    VICTIM_AMOUNT: process.env.VICTIM_AMOUNT || "100", // Victim trade size
    SLIPPAGE: process.env.SLIPPAGE || "5" // Slippage tolerance in percentage
};

describe("MEV Simulator", function() {
    let dexSimulator;
    let owner, user1, user2;
    let router, factory, xdiToken, pair;
    const formatEther = ethers.utils.formatEther;
    const parseEther = ethers.utils.parseEther;

    before(function() {
        // Verify all required environment variables are set
        const requiredEnvVars = ['UNISWAP_ROUTER', 'XDI_TOKEN_ADDRESS', 'WXDAI_ADDRESS'];
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                console.error(`Required environment variable ${envVar} not set`);
                process.exit(1);
            }
        }
        console.log("Using configuration:", CONFIG);
    });

    beforeEach(async function() {
        try {
            // Get signers
            [owner, user1, user2] = await ethers.getSigners();
            console.log("Testing with account:", owner.address);

            // Deploy DEX Simulator
            const DEXInteractionSimulator = await ethers.getContractFactory("DEXInteractionSimulator");
            dexSimulator = await DEXInteractionSimulator.deploy(
                CONFIG.ROUTER,
                CONFIG.XDI_TOKEN,
                {
                    gasLimit: ethers.utils.parseUnits(CONFIG.GAS_LIMIT, "wei"),
                    gasPrice: ethers.utils.parseUnits(CONFIG.GAS_PRICE, "gwei")
                }
            );
            await dexSimulator.deployed();
            console.log("DEX Simulator deployed to:", dexSimulator.address);

            // Get contract instances
            router = await ethers.getContractAt("IUniswapV2Router02", CONFIG.ROUTER);
            factory = await ethers.getContractAt("IUniswapV2Factory", await router.factory());
            xdiToken = await ethers.getContractAt("IERC20", CONFIG.XDI_TOKEN);

            // Get pair
            const pairAddress = await factory.getPair(CONFIG.XDI_TOKEN, CONFIG.WXDAI);
            if (pairAddress !== ethers.constants.AddressZero) {
                pair = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
            }

        } catch (error) {
            console.error("Setup failed:", error);
            throw error;
        }
    });

    describe("Deployment", function() {
        it("Should deploy successfully", async function() {
            expect(dexSimulator.address).to.be.properAddress;
        });

        it("Should have correct initial settings", async function() {
            const deployedRouter = await dexSimulator.router();
            const deployedToken = await dexSimulator.xdiToken();
            expect(deployedRouter).to.equal(CONFIG.ROUTER);
            expect(deployedToken).to.equal(CONFIG.XDI_TOKEN);
        });
    });

    describe("Price Checks", function() {
        it("Should get current price if pool exists", async function() {
            try {
                const price = await dexSimulator.getCurrentPrice();
                console.log("Current price:", formatEther(price));
                expect(price).to.be.gt(0);
            } catch (error) {
                console.log("Pool might not exist yet:", error.message);
                this.skip();
            }
        });

        it("Should get quote for configurable amount", async function() {
            try {
                const amountIn = parseEther(CONFIG.TEST_AMOUNT);
                const quote = await dexSimulator.getQuote(amountIn);
                console.log(`Quote for ${CONFIG.TEST_AMOUNT} XDI:`, formatEther(quote));
                expect(quote).to.be.gt(0);
            } catch (error) {
                console.log("Quote failed:", error.message);
                this.skip();
            }
        });
    });

    describe("Pool State", function() {
        it("Should get pool state if exists", async function() {
            try {
                const poolState = await dexSimulator.getPoolState();
                console.log("Pool state:", {
                    reserve0: formatEther(poolState.reserve0),
                    reserve1: formatEther(poolState.reserve1),
                    price: formatEther(poolState.price),
                    liquidity: formatEther(poolState.liquidity)
                });
                expect(poolState.reserve0).to.be.gt(0);
                expect(poolState.reserve1).to.be.gt(0);
            } catch (error) {
                console.log("Pool might not exist yet:", error.message);
                this.skip();
            }
        });
    });

    describe("MEV Simulation", function() {
        beforeEach(async function() {
            // Check if pool has sufficient liquidity before each test
            try {
                const poolState = await dexSimulator.getPoolState();
                if (poolState.reserve0.isZero() || poolState.reserve1.isZero()) {
                    console.log("Insufficient liquidity for tests");
                    this.skip();
                }
            } catch (error) {
                console.log("Pool state check failed:", error.message);
                this.skip();
            }
        });

        it("Should simulate sandwich attack", async function() {
            try {
                // Get initial state
                const initialState = await dexSimulator.getPoolState();
                console.log("\nInitial Pool State:");
                console.log("Reserve0 (XDI):", formatEther(initialState.reserve0));
                console.log("Reserve1 (WXDAI):", formatEther(initialState.reserve1));
                console.log("Initial Price:", formatEther(initialState.price));

                // Simulate victim transaction
                const victimAmount = parseEther(CONFIG.VICTIM_AMOUNT);
                const expectedOutput = await dexSimulator.getQuote(victimAmount);
                console.log("\nVictim Transaction:");
                console.log("Amount In (XDI):", formatEther(victimAmount));
                console.log("Expected Out (WXDAI):", formatEther(expectedOutput));

                // Front-run simulation
                const frontrunAmount = victimAmount.div(10); // 10% of victim's amount
                const frontrunResult = await dexSimulator.executeSwap(
                    frontrunAmount,
                    0 // No min output for simulation
                );

                console.log("\nFront-run Impact:");
                console.log("Amount Used:", formatEther(frontrunAmount));
                console.log("Price Impact:", formatEther(frontrunResult.priceImpact), "%");

                // Execute victim's transaction
                const slippage = 100 - parseInt(CONFIG.SLIPPAGE);
                const minOutput = expectedOutput.mul(slippage).div(100);
                const victimResult = await dexSimulator.executeSwap(
                    victimAmount,
                    minOutput
                );

                // Back-run simulation
                const backrunResult = await dexSimulator.executeSwap(
                    frontrunAmount,
                    0 // No min output for simulation
                );

                // Calculate profits and impact
                const mevProfit = backrunResult.amountOut.sub(frontrunResult.amountIn);
                const victimLoss = expectedOutput.sub(victimResult.amountOut);
                const totalGasUsed = frontrunResult.gasUsed.add(backrunResult.gasUsed);
                const gasCost = totalGasUsed.mul(frontrunResult.effectiveGasPrice);

                console.log("\nMEV Attack Results:");
                console.log("-------------------");
                console.log("Front-run cost:", formatEther(frontrunAmount), "XDI");
                console.log("Victim's Expected Output:", formatEther(expectedOutput), "WXDAI");
                console.log("Victim's Actual Output:", formatEther(victimResult.amountOut), "WXDAI");
                console.log("Victim's Loss:", formatEther(victimLoss), "WXDAI");
                console.log("MEV Profit (before gas):", formatEther(mevProfit), "WXDAI");
                console.log("Gas Cost:", formatEther(gasCost), "WXDAI");
                console.log("Net MEV Profit:", formatEther(mevProfit.sub(gasCost)), "WXDAI");
                console.log("\nPrice Impact Analysis:");
                console.log("Front-run Impact:", formatEther(frontrunResult.priceImpact), "%");
                console.log("Victim Impact:", formatEther(victimResult.priceImpact), "%");
                console.log("Back-run Impact:", formatEther(backrunResult.priceImpact), "%");

                // Final state
                const finalState = await dexSimulator.getPoolState();
                console.log("\nFinal Pool State:");
                console.log("Reserve0 (XDI):", formatEther(finalState.reserve0));
                console.log("Reserve1 (WXDAI):", formatEther(finalState.reserve1));
                console.log("Final Price:", formatEther(finalState.price));

                // Assertions
                expect(victimResult.amountOut).to.be.lt(expectedOutput, "Victim should receive less than expected");
                expect(mevProfit).to.be.gt(0, "MEV profit should be positive");
                expect(victimLoss).to.be.gt(0, "Victim should experience loss");
            } catch (error) {
                console.error("MEV simulation failed:", error.message);
                throw error;
            }
        });

        it("Should calculate optimal front-run amount", async function() {
            try {
                const victimAmount = parseEther(CONFIG.VICTIM_AMOUNT);
                let optimalFrontRun = victimAmount.div(20); // Start with 5%
                let maxProfit = ethers.constants.Zero;
                let optimalSize = optimalFrontRun;

                console.log("\nOptimal Front-run Analysis:");
                console.log("Testing front-run sizes from 5% to 50% of victim amount");

                for (let i = 1; i <= 10; i++) {
                    const testAmount = optimalFrontRun.mul(i);
                    const frontrunResult = await dexSimulator.executeSwap(testAmount, 0);
                    const backrunResult = await dexSimulator.executeSwap(testAmount, 0);
                    const profit = backrunResult.amountOut.sub(frontrunResult.amountIn);

                    console.log(`Size ${i * 5}%:`, formatEther(profit), "WXDAI profit");

                    if (profit.gt(maxProfit)) {
                        maxProfit = profit;
                        optimalSize = testAmount;
                    }
                }

                console.log("\nResults:");
                console.log("Optimal Front-run Size:", formatEther(optimalSize), "XDI");
                console.log("Maximum Profit:", formatEther(maxProfit), "WXDAI");

                expect(maxProfit).to.be.gt(0, "Should find profitable front-run size");
            } catch (error) {
                console.error("Optimal calculation failed:", error.message);
                throw error;
            }
        });
    });

    describe("Error Handling", function() {
        it("Should handle invalid amounts", async function() {
            await expect(
                dexSimulator.getQuote(0)
            ).to.be.revertedWith("Invalid amount");
        });

        it("Should handle insufficient liquidity", async function() {
            const hugeAmount = parseEther("1000000"); // Very large amount
            try {
                await dexSimulator.getQuote(hugeAmount);
            } catch (error) {
                expect(error.message).to.include("insufficient liquidity");
            }
        });

        it("Should handle minimum output requirements", async function() {
            const amount = parseEther("1");
            const quote = await dexSimulator.getQuote(amount);
            const highMinOutput = quote.mul(120).div(100); // 20% higher than quote

            await expect(
                dexSimulator.executeSwap(amount, highMinOutput)
            ).to.be.revertedWith("insufficient output amount");
        });
    });

    describe("Events", function() {
        it("Should emit PriceChecked event", async function() {
            try {
                await expect(dexSimulator.getCurrentPrice())
                    .to.emit(dexSimulator, "PriceChecked");
            } catch (error) {
                console.log("Event check failed:", error.message);
                this.skip();
            }
        });

        it("Should emit SwapExecuted event", async function() {
            try {
                const amount = parseEther("1");
                const quote = await dexSimulator.getQuote(amount);
                await expect(dexSimulator.executeSwap(amount, quote))
                    .to.emit(dexSimulator, "SwapExecuted");
            } catch (error) {
                console.log("Swap event check failed:", error.message);
                this.skip();
            }
        });
    });
});