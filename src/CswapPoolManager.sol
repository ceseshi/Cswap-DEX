// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "../src/CswapTokenPair.sol";

contract CswapPoolManager {
    address public immutable token0;
    address public immutable token1;
    address public tokenPair;
    uint8 immutable feePct;

    error InvalidToken();

    constructor(address _token0, address _token1, uint8 _feePct) {
        token0 = _token0;
        token1 = _token1;
        feePct = _feePct;

        CswapTokenPair cswapTokenPair = new CswapTokenPair(_feePct);
        cswapTokenPair.initialize(token0, token1);
        tokenPair = address(cswapTokenPair);
    }

    function addLiquidity(uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min)
        external
        virtual
        returns (uint256 amount0, uint256 amount1, uint256 liquidity)
    {
        (uint256 reserve0, uint256 reserve1,) = CswapTokenPair(tokenPair).getReserves();

        if (reserve0 == 0 && reserve1 == 0) {
            (amount0, amount1) = (amount0Desired, amount1Desired);
        } else {
            uint256 amount1Optimal = getQuote(amount0Desired, reserve0, reserve1);

            if (amount1Optimal <= amount1Desired) {
                require(amount1Optimal >= amount1Min, "CswapPoolManager: Insufficient Token0 amount");
                (amount0, amount1) = (amount0Desired, amount1Optimal);
            } else {
                uint256 amount0Optimal = getQuote(amount1Desired, reserve1, reserve0);
                assert(amount0Optimal <= amount0Desired);
                require(amount0Optimal >= amount0Min, "CswapPoolManager: Insufficient Token1 amount");
                (amount0, amount1) = (amount0Optimal, amount1Desired);
            }
        }

        IERC20(token0).transferFrom(msg.sender, tokenPair, amount0);
        IERC20(token1).transferFrom(msg.sender, tokenPair, amount1);

        liquidity = CswapTokenPair(tokenPair).mint(msg.sender);
    }

    function removeLiquidity(uint256 amountTokenPair) public {
        CswapTokenPair(tokenPair).transferFrom(msg.sender, tokenPair, amountTokenPair);

        CswapTokenPair(tokenPair).burn(msg.sender);
    }

    function swap(address tokenIn, uint256 amountIn, uint256 minAmountOut) public returns (uint256 amountOut) {
        amountOut = getAmountOut(tokenIn, amountIn);
        require(amountOut >= minAmountOut, "CswapPoolManager: Insufficient output amount");

        // Previous allowance required
        IERC20(tokenIn).transferFrom(msg.sender, tokenPair, amountIn);

        if (tokenIn == token0) {
            CswapTokenPair(tokenPair).swap(0, amountOut, msg.sender);
        } else if (tokenIn == token1) {
            CswapTokenPair(tokenPair).swap(amountOut, 0, msg.sender);
        } else {
            revert InvalidToken();
        }

        //return amountOut;
    }

    function getQuote(uint256 amountA, uint256 reserveA, uint256 reserveB) public pure returns (uint256 amountB) {
        require(reserveA > 0);
        return amountA * reserveB / reserveA;
    }

    function getQuote(address tokenA, uint256 amountA) public view returns (uint256 amountB) {
        uint256 reserveA;
        uint256 reserveB;

        if (tokenA == token0) {
            (reserveA, reserveB,) = CswapTokenPair(tokenPair).getReserves();
        } else if (tokenA == token1) {
            (reserveB, reserveA,) = CswapTokenPair(tokenPair).getReserves();
        } else {
            revert InvalidToken();
        }

        return getQuote(amountA, reserveA, reserveB);
    }

    function getAmountOut(address tokenIn, uint256 amountIn) public view returns (uint256 amountOut) {
        uint256 reserveIn;
        uint256 reserveOut;

        if (tokenIn == token0) {
            (reserveIn, reserveOut,) = CswapTokenPair(tokenPair).getReserves();
        } else if (tokenIn == token1) {
            (reserveOut, reserveIn,) = CswapTokenPair(tokenPair).getReserves();
        } else {
            revert InvalidToken();
        }

        uint256 amountInWithFee = amountIn * (1000 - feePct * 10);
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }
}
