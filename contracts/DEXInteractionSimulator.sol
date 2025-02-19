// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Pair.sol";
import "./interfaces/IERC20.sol";
import "hardhat/console.sol";

contract DEXInteractionSimulator {
    // State variables
    IUniswapV2Router02 public router;
    IUniswapV2Factory public factory;
    IUniswapV2Pair public pair;
    IERC20 public xdiToken;
    address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Structs
    struct SwapResult {
        uint256 amountIn;
        uint256 amountOut;
        uint256 priceBeforeSwap;
        uint256 priceAfterSwap;
        uint256 priceImpact;
        uint256 executionTime;
        uint256 gasUsed;
        uint256 effectiveGasPrice;
    }
    
    struct PoolState {
        uint256 reserve0;
        uint256 reserve1;
        uint256 price;
        uint256 liquidity;
        uint256 timestamp;
    }

    // Events
    event PriceChecked(
        address indexed pair,
        uint256 price,
        uint256 timestamp
    );

    event SwapExecuted(
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 priceImpact,
        uint256 gasUsed
    );

    event MEVAttackSimulated(
        uint256 victimAmount,
        uint256 expectedOutput,
        uint256 actualOutput,
        uint256 mevProfit,
        uint256 gasUsed
    );

    // Constructor
    constructor(
        address _router,
        address _xdiToken
    ) {
        require(_router != address(0), "Invalid router address");
        require(_xdiToken != address(0), "Invalid token address");
        
        router = IUniswapV2Router02(_router);
        factory = IUniswapV2Factory(router.factory());
        xdiToken = IERC20(_xdiToken);
        
        // Get the XDI/WETH pair
        pair = IUniswapV2Pair(factory.getPair(_xdiToken, WETH));
        require(address(pair) != address(0), "Pair does not exist");
        
        // Verify pair tokens
        require(
            pair.token0() == _xdiToken || pair.token1() == _xdiToken,
            "Invalid pair configuration"
        );
    }

    // Core functions
    function getCurrentPrice() public returns (uint256) {
        (uint256 reserve0, uint256 reserve1,) = pair.getReserves();
        require(reserve0 > 0 && reserve1 > 0, "Invalid reserves");
        
        uint256 price = (reserve1 * 1e18) / reserve0;
        emit PriceChecked(address(pair), price, block.timestamp);
        return price;
    }

    function getQuote(uint256 amountIn) public view returns (uint256 amountOut) {
        require(amountIn > 0, "Invalid amount");
        
        address[] memory path = new address[](2);
        path[0] = address(xdiToken);
        path[1] = WETH;
        
        uint256[] memory amounts = router.getAmountsOut(amountIn, path);
        return amounts[1];
    }

    function executeSwap(
        uint256 amountIn,
        uint256 minAmountOut
    ) public returns (SwapResult memory) {
        require(amountIn > 0, "Invalid amount");
        require(minAmountOut > 0, "Invalid min output");
        
        uint256 startGas = gasleft();
        uint256 priceBeforeSwap = getCurrentPrice();
        
        // Approve router
        require(xdiToken.approve(address(router), amountIn), "Approve failed");
        
        address[] memory path = new address[](2);
        path[0] = address(xdiToken);
        path[1] = WETH;
        
        // Execute swap
        uint256[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            minAmountOut,
            path,
            address(this),
            block.timestamp + 300 // 5 minutes deadline
        );
        
        uint256 priceAfterSwap = getCurrentPrice();
        uint256 gasUsed = startGas - gasleft();
        
        SwapResult memory result = SwapResult({
            amountIn: amounts[0],
            amountOut: amounts[1],
            priceBeforeSwap: priceBeforeSwap,
            priceAfterSwap: priceAfterSwap,
            priceImpact: calculatePriceImpact(priceBeforeSwap, priceAfterSwap),
            executionTime: block.timestamp,
            gasUsed: gasUsed,
            effectiveGasPrice: tx.gasprice
        });
        
        emit SwapExecuted(
            address(xdiToken),
            WETH,
            amounts[0],
            amounts[1],
            result.priceImpact,
            gasUsed
        );
        
        return result;
    }

    // Helper functions
    function calculatePriceImpact(
        uint256 priceBefore,
        uint256 priceAfter
    ) internal pure returns (uint256) {
        require(priceBefore > 0, "Invalid price");
        return ((priceBefore - priceAfter) * 1e18) / priceBefore;
    }

    function getPoolState() public view returns (PoolState memory) {
        (uint256 reserve0, uint256 reserve1,) = pair.getReserves();
        require(reserve0 > 0 && reserve1 > 0, "Invalid reserves");

return PoolState({
            reserve0: reserve0,
            reserve1: reserve1,
            price: (reserve1 * 1e18) / reserve0,
            liquidity: pair.totalSupply(),
            timestamp: block.timestamp
        });
    }
    
    function getBalances() public view returns (uint256 xdiBalance, uint256 ethBalance) {
        xdiBalance = xdiToken.balanceOf(address(this));
        ethBalance = address(this).balance;
    }
    
    // Fallback and receive functions
    receive() external payable {}
    fallback() external payable {}
}
