// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "./BaseTest.t.sol";
import "../src/CswapTokenPair.sol";
import "../src/CswapToken.sol";

contract CswapTokenPairTest is BaseTest {
    CswapTokenPair public tokenPair;

    address token0;
    address token1;

    uint256 initialAmount0;
    uint256 initialAmount1;

    function setUp() public override {
        super.setUp();

        vm.createSelectFork(vm.rpcUrl("sepolia"));

        address wethAddress = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;
        users.alice = payable(0x5ba53D4573C5036aBa93c66F461884F13D91531C);

        uint8 cswpDecimals = 6;
        uint8 wethDecimals = 18;
        uint256 cswpSupply = 10_000_000 * 10 ** cswpDecimals;
        uint256 wethSupply = 10 * 10 ** wethDecimals;

        initialAmount0 = 3000 * 10 ** cswpDecimals;
        initialAmount1 = 3 * 10 ** wethDecimals;

        vm.startPrank(users.alice);

        // Create token0
        CswapToken cswapToken = new CswapToken("Cswap Token", "CSWP", cswpDecimals, cswpSupply);
        token0 = address(cswapToken);

        // Create token1
        token1 = wethAddress;
        deal(token1, users.alice, wethSupply);

        tokenPair = new CswapTokenPair(3);

        tokenPair.initialize(token0, token1);

        // Add liquidity
        uint256 depositAmount0 = 1000 * 10 ** cswpDecimals;
        uint256 depositAmount1 = 1 * 10 ** wethDecimals;

        addLiquidity(depositAmount0, depositAmount1);
    }

    function me() public view returns (address) {
        return users.alice;
    }

    function addLiquidity(uint256 depositAmount0, uint256 depositAmount1) public {
        IERC20(token0).transfer(address(tokenPair), depositAmount0);
        IERC20(token1).transfer(address(tokenPair), depositAmount1);

        tokenPair.mint(users.alice);

        console.log("Alice LP", tokenPair.balanceOf(users.alice));
    }

    function testMintSwap() public {
        vm.startPrank(users.alice);

        /// Test swap token0 to token1
        uint256 cswpDecimals = CswapToken(token0).decimals();
        uint256 amountIn = 100 * cswpDecimals;
        (uint256 reserve0, uint256 reserve1,) = tokenPair.getReserves();
        uint256 amountOut = getAmountOut(amountIn, reserve0, reserve1);

        IERC20(token0).transfer(address(tokenPair), amountIn);
        tokenPair.swap(0, amountOut, users.alice);

        /// Check final balances
        console2.log("Alice token0", IERC20(token0).balanceOf(users.alice) / 1e3);
        console2.log("Alice token1", IERC20(token1).balanceOf(users.alice) / 1e15);

        //assertEq(IERC20(token0).balanceOf(users.alice), initialAmount0 - depositAmount0 - amountIn);
        //assertEq(IERC20(token1).balanceOf(users.alice), initialAmount1 - depositAmount1 + amountOut);
    }

    // given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // https://github.com/Uniswap/v2-periphery/blob/master/contracts/libraries/UniswapV2Library.sol
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut)
        internal
        pure
        returns (uint256 amountOut)
    {
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn * 1000 + amountInWithFee;
        amountOut = numerator / denominator;

        //amountOut = (reserveOut * amountInWithFee) / (reserveIn * 1000 + amountInWithFee);
    }
}
