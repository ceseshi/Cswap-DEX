// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "forge-std/Test.sol";
import "./BaseTest.t.sol";
import "../src/CswapPoolManager.sol";
import "../src/CswapTokenPair.sol";
import "../src/CswapToken.sol";

event Transfer(address indexed from, address indexed to, uint256 value);

contract CswapPoolManagerTest is BaseTest {
    CswapPoolManager public poolManager;

    address token0;
    address token1;
    address wethAddress = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    function setUp() public override {
        super.setUp();

        vm.createSelectFork(vm.rpcUrl("sepolia"));

        users.alice = payable(vm.addr(vm.envUint("PRIVATE_KEY_DEVEL")));
        vm.label(users.alice, "Alice");

        uint8 cswpDecimals = 6;
        uint8 wethDecimals = 18;
        uint256 cswpSupply = 10_000_000 * 10 ** cswpDecimals;
        uint256 wethSupply = 10 * 10 ** wethDecimals;

        vm.startPrank(users.alice);

        // Create token0
        CswapToken cswapToken = new CswapToken("Cswap Token", "CSWP", cswpDecimals, cswpSupply);
        token0 = address(cswapToken);
        vm.label(token0, "CSWP");

        // Create token1
        token1 = wethAddress;
        vm.label(token1, "WETH");
        deal(token1, users.alice, wethSupply);

        // Create pool manager
        poolManager = new CswapPoolManager(token0, token1, 4);
        vm.label(address(poolManager), "PoolManager");
        vm.label(address(poolManager.tokenPair()), "TokenPair");

        address tokenPair = poolManager.tokenPair();

        // Approve for initial liquidity
        IERC20(token0).approve(address(poolManager), cswpSupply);
        IERC20(token1).approve(address(poolManager), wethSupply);

        // Expect events
        vm.expectEmit(token0);
        emit IERC20.Approval(users.alice, address(poolManager), 0);
        vm.expectEmit(token0);
        emit IERC20.Transfer(users.alice, tokenPair, cswpSupply);
        vm.expectEmit(token1);
        emit IERC20.Transfer(users.alice, tokenPair, wethSupply);
        vm.expectEmit(true, false, false, true, tokenPair);
        emit CswapTokenPair.Mint(address(poolManager), cswpSupply, wethSupply, users.alice);

        // Add initial liquidity
        poolManager.addLiquidity(cswpSupply, wethSupply, 0, 0);

        // Initialize airdrop, 10% additional of initial supply, max 1000 users
        uint256 airdropAmount = cswpSupply / 10;
        CswapToken(token0).setAirdrop(airdropAmount, airdropAmount / 1000);
        CswapToken(token0).claim();
    }

    function testAddRemoveLiquidity() public {
        vm.startPrank(users.alice);

        address tokenPair = poolManager.tokenPair();

        // Empty liquidity
        uint256 withdrawInitial = IERC20(tokenPair).balanceOf(users.alice);
        IERC20(tokenPair).approve(address(poolManager), withdrawInitial);
        poolManager.removeLiquidity(withdrawInitial);

        // Get initial liquidity
        uint256 liquidityBefore = IERC20(tokenPair).balanceOf(users.alice);

        (uint256 reserve0, uint256 reserve1,) = CswapTokenPair(tokenPair).getReserves();

        uint256 depositAmount0 = 1000 * 1e6;
        uint256 depositAmount1 = poolManager.getQuote(depositAmount0, reserve0, reserve1);

        uint256 depositAmount0Min = depositAmount0 - depositAmount0 / 100;
        uint256 depositAmount1Min = depositAmount1 - depositAmount1 / 100;

        deal(token0, users.alice, depositAmount0);
        deal(token1, users.alice, depositAmount1);

        // Add liquidity
        IERC20(token0).approve(address(poolManager), depositAmount0);
        IERC20(token1).approve(address(poolManager), depositAmount1);
        poolManager.addLiquidity(depositAmount0, depositAmount1, depositAmount0Min, depositAmount1Min);

        // Remove liquidity
        uint256 withdrawAmount = IERC20(tokenPair).balanceOf(users.alice);
        IERC20(tokenPair).approve(address(poolManager), withdrawAmount);
        poolManager.removeLiquidity(withdrawAmount);

        // Compare after
        uint256 liquidityAfter = IERC20(tokenPair).balanceOf(users.alice);
        assertEq(liquidityBefore, liquidityAfter);
    }

    function testSwap0() public {
        //addLiquidity(depositAmount0, depositAmount1);
        uint256 cswpDecimals = CswapToken(token0).decimals();
        uint256 wethDecimals = ERC20(token1).decimals();

        // Initial balances
        uint256 initialToken0Balance = 100 * 10 ** cswpDecimals;
        uint256 initialToken1Balance = 1 * 10 ** wethDecimals;

        deal(token0, users.alice, initialToken0Balance);
        deal(token1, users.alice, initialToken1Balance);

        // Test swap token0 to token1
        uint256 amountIn = initialToken0Balance / 10;
        uint256 amountOut = poolManager.getAmountOut(token0, amountIn);
        uint256 minAmountOut = amountOut - amountOut / 100;

        vm.startPrank(users.alice);

        IERC20(token0).approve(address(poolManager), amountIn);
        poolManager.swap(token0, amountIn, minAmountOut);

        // Check final balances
        console2.log("Alice token0 %e", IERC20(token0).balanceOf(users.alice));
        console2.log("Alice token1 %e", IERC20(token1).balanceOf(users.alice));

        assertEq(IERC20(token0).balanceOf(users.alice), initialToken0Balance - amountIn);
        assertEq(IERC20(token1).balanceOf(users.alice), initialToken1Balance + amountOut);
    }

    function testSwap1() public {
        //addLiquidity(depositAmount0, depositAmount1);
        uint256 cswpDecimals = CswapToken(token0).decimals();
        uint256 wethDecimals = ERC20(token1).decimals();

        // Initial balances
        uint256 initialToken0Amount = 100 * 10 ** cswpDecimals;
        uint256 initialToken1Amount = 1 * 10 ** wethDecimals;

        deal(token0, users.alice, initialToken0Amount);
        deal(token1, users.alice, initialToken1Amount);

        // Test swap token1 to token0
        uint256 amountIn = initialToken1Amount / 10;
        uint256 amountOut = poolManager.getAmountOut(token1, amountIn);
        uint256 minAmountOut = amountOut - amountOut / 100;

        vm.startPrank(users.alice);

        IERC20(token1).approve(address(poolManager), amountIn);
        poolManager.swap(token1, amountIn, minAmountOut);

        // Check final balances
        console2.log("Alice token0 %e", IERC20(token0).balanceOf(users.alice));
        console2.log("Alice token1 %e", IERC20(token1).balanceOf(users.alice));

        assertEq(IERC20(token0).balanceOf(users.alice), initialToken0Amount + amountOut);
        assertEq(IERC20(token1).balanceOf(users.alice), initialToken1Amount - amountIn);
    }
}
