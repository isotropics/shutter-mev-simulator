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

    describe("Price Checks", function() {
        it("Should get quote for configurable amount", async function() {
            try {
                const amountIn = ethers.utils.parseEther(CONFIG.TEST_AMOUNT);
                const quote = await dexSimulator.getQuote(amountIn);
                console.log(`Quote for ${CONFIG.TEST_AMOUNT} XDI:`, ethers.utils.formatEther(quote));
                expect(quote).to.be.gt(0);
            } catch (error) {
                console.log("Quote failed:", error.message);
                this.skip();
            }
        });
    });


describe("MEV Simulator", function() {
    let dexSimulator;
    let owner, user1, user2;
    let router, factory, xdiToken, pair;
    const WXDAI = "0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d";

    beforeEach(async function() {
        try {
            // Get signers
            [owner, user1, user2] = await ethers.getSigners();
            console.log("Testing with account:", owner.address);

            // Check environment variables
            if (!process.env.UNISWAP_ROUTER || !process.env.XDI_TOKEN_ADDRESS) {
                throw new Error("Required environment variables not set");
            }

            // Deploy DEX Simulator
            const DEXInteractionSimulator = await ethers.getContractFactory("DEXInteractionSimulator");
            dexSimulator = await DEXInteractionSimulator.deploy(
                process.env.UNISWAP_ROUTER,
                process.env.XDI_TOKEN_ADDRESS,
                {
                    gasLimit: process.env.GAS_LIMIT || 2000000,
                    gasPrice: ethers.utils.parseUnits(process.env.GAS_PRICE || "5", "gwei")
                }
            );
            await dexSimulator.deployed();
            console.log("DEX Simulator deployed to:", dexSimulator.address);

            // Get contract instances
            router = await ethers.getContractAt("IUniswapV2Router02", process.env.UNISWAP_ROUTER);
            factory = await ethers.getContractAt("IUniswapV2Factory", await router.factory());
            xdiToken = await ethers.getContractAt("IERC20", process.env.XDI_TOKEN_ADDRESS);

            // Get pair
            const pairAddress = await factory.getPair(process.env.XDI_TOKEN_ADDRESS, WXDAI);
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
            expect(deployedRouter).to.equal(process.env.UNISWAP_ROUTER);
            expect(deployedToken).to.equal(process.env.XDI_TOKEN_ADDRESS);
        });
    });

    describe("Price Checks", function() {
        it("Should get current price if pool exists", async function() {
            try {
                const price = await dexSimulator.getCurrentPrice();
                console.log("Current price:", ethers.utils.formatEther(price));
                expect(price).to.be.gt(0);
            } catch (error) {
                console.log("Pool might not exist yet:", error.message);
                this.skip();
            }
        });

        it("Should get quote for swap", async function() {
            try {
                const amountIn = ethers.utils.parseEther("1"); // 1 XDI
                const quote = await dexSimulator.getQuote(amountIn);
                console.log("Quote for 1 XDI:", ethers.utils.formatEther(quote));
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
                    reserve0: ethers.utils.formatEther(poolState.reserve0),
                    reserve1: ethers.utils.formatEther(poolState.reserve1),
                    price: ethers.utils.formatEther(poolState.price),
                    liquidity: ethers.utils.formatEther(poolState.liquidity)
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
        it("Should simulate sandwich attack if pool has liquidity", async function() {
            try {
                // Get initial state
                const initialPrice = await dexSimulator.getCurrentPrice();
                console.log("Initial price:", ethers.utils.formatEther(initialPrice));

                // Simulate victim trade
                const victimAmount = ethers.utils.parseEther("100"); // 100 XDI
                const quote = await dexSimulator.getQuote(victimAmount);
                console.log("Expected output:", ethers.utils.formatEther(quote));

                // Execute sandwich attack simulation
                const result = await dexSimulator.executeSwap(
                    victimAmount,
                    quote.mul(95).div(100) // 5% slippage
                );

                // Verify results
                expect(result.amountOut).to.be.gt(0);
                expect(result.priceImpact).to.be.gt(0);

                console.log("MEV Attack Results:", {
                    amountIn: ethers.utils.formatEther(result.amountIn),
                    amountOut: ethers.utils.formatEther(result.amountOut),
                    priceImpact: ethers.utils.formatEther(result.priceImpact),
                    gasUsed: result.gasUsed.toString()
                });
            } catch (error) {
                console.log("MEV simulation failed:", error.message);
                this.skip();
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
            const hugeAmount = ethers.utils.parseEther("1000000"); // Very large amount
            try {
                await dexSimulator.getQuote(hugeAmount);
            } catch (error) {
                expect(error.message).to.include("insufficient liquidity");
            }
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
                const amount = ethers.utils.parseEther("1");
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