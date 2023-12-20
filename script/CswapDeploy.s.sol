// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/CswapToken.sol";
import "../src/CswapPoolManager.sol";

contract CswapDeploy is Script {
    address wethAddress = 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14;

    event Deployed(address token0, address token1, address poolManager);

    function setUp() public {}

    function runLocal() public {
        uint256 privKey = vm.envUint("PRIVATE_KEY_DEVEL");
        vm.startBroadcast(privKey);

        (bool ok,) = wethAddress.call{value: 10 ether}(abi.encodeWithSignature("deposit()"));
        if (!ok) {
            revert("deposit failed!");
        }

        runDeploy();
    }

    function runProduction() public {
        uint256 privKey = vm.envUint("PRIVATE_KEY_PROD");
        vm.startBroadcast(privKey);

        runDeploy();
    }

    function runDeploy() public {
        uint8 feePct = 4;
        uint8 cswpDecimals = 6;
        uint8 wethDecimals = 18;
        uint256 cswpSupply = 10_000_000 * 10 ** cswpDecimals;
        uint256 wethSupply = 10 * 10 ** wethDecimals;

        // Create tokens
        CswapToken token0 = new CswapToken("Cswap Token", "CSWP", cswpDecimals, cswpSupply);
        ERC20 token1 = ERC20(wethAddress);

        // Create pool manager
        CswapPoolManager poolManager = new CswapPoolManager(address(token0), address(token1), feePct);

        // Add initial liquidity
        token0.approve(address(poolManager), cswpSupply);
        token1.approve(address(poolManager), wethSupply);
        poolManager.addLiquidity(cswpSupply, wethSupply, cswpSupply, wethSupply);

        // Initialize airdrop, 10% additional of initial supply, max 1000 users
        uint256 airdropAmount = cswpSupply / 10;
        token0.setAirdrop(airdropAmount, airdropAmount / 1000);
        token0.claim();

        emit Deployed(address(token0), address(token1), address(poolManager));

        console.log("Deployer: ", msg.sender);
        console.log("CSWP:", address(token0));
        console.log("WETH:", address(token1));
        console.log("Pool:", address(poolManager));

        vm.writeFile("./tmp/vite.env", "");
        vm.writeLine("./tmp/vite.env", string.concat("VITE_TOKEN0=", token0.symbol(), ";", vm.toString(token0.decimals()), ";", vm.toString(address(token0))));
        vm.writeLine("./tmp/vite.env", string.concat("VITE_TOKEN1=", token1.symbol(), ";", vm.toString(token1.decimals()), ";", vm.toString(address(token1))));
        vm.writeLine("./tmp/vite.env", string.concat("VITE_POOL=", vm.toString(address(poolManager))));
    }
}
