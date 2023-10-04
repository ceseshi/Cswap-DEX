// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./BaseTest.t.sol";
import "../src/CswapPair.sol";

contract CswapPairTest is BaseTest {
    CswapPair public pair;

    address token0 = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; //USDC
    address token1 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; //WETH

    uint256 initialAmount0;
    uint256 initialAmount1;

    function setUp() public override {
        super.setUp();

        //uint256 forkId =
        vm.createSelectFork(vm.rpcUrl("mainnet"));

        pair = new CswapPair();

        users.alice = payable(0x5ba53D4573C5036aBa93c66F461884F13D91531C);

        initialAmount0 = 3000 * 1e6;
        initialAmount1 = 3 * 1e18;

        deal(token0, users.alice, initialAmount0);
        deal(token1, users.alice, initialAmount1);

        pair.initialize(token0, token1);

        addLiquidity();
    }

    function addLiquidity() public {
        uint256 depositToken0 = 1000 * 1e6;
        uint256 depositToken1 = 1 * 1e18;

        IERC20(token0).transfer(address(pair), depositToken0);
        IERC20(token1).transfer(address(pair), depositToken1);

        pair.mint(users.alice);
        console.log("Alice LP", pair.balanceOf(users.alice));
    }

    function testMintSwap() public {
        vm.startPrank(users.alice);

        /// Test swap token0 to token1
        uint256 amountIn = 100 * 1e6;
        (uint256 reserve0, uint256 reserve1,) = pair.getReserves();
        uint256 amountOut = getAmountOut(amountIn, reserve0, reserve1);

        IERC20(token0).transfer(address(pair), amountIn);
        pair.swap(0, amountOut, users.alice);

        /// Check final balances
        console2.log("Alice token0", IERC20(token0).balanceOf(users.alice) / 1e3);
        console2.log("Alice token1", IERC20(token1).balanceOf(users.alice) / 1e15);

        assertEq(IERC20(token0).balanceOf(users.alice), initialAmount0 - depositToken0 - amountIn);
        assertEq(IERC20(token1).balanceOf(users.alice), initialAmount1 - depositToken1 + amountOut);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256 amountOut)
    {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;

        //amountOut = (reserveOut * amountInWithFee) / (reserveIn * 1000 + amountInWithFee);
    }
}
