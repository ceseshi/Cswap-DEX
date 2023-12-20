// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "openzeppelin/token/ERC20/ERC20.sol";

contract CswapToken is ERC20 {
    // Amount claimable per user
    uint256 public airdropPerUser;

    // Amount remaining to be claimed
    uint256 public airdropRemaining;

    // Owner
    address owner = msg.sender;

    // Users that have claimed
    mapping(address => bool) public claimed;

    uint8 immutable _decimals;

    constructor(string memory name, string memory symbol, uint8 __decimals, uint256 _totalSupply) ERC20(name, symbol) {
        _decimals = __decimals;
        _mint(msg.sender, _totalSupply);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setAirdrop(uint256 _airdropTotal, uint256 _airdropPerUser) public {
        require(msg.sender == owner, "Only owner");
        airdropPerUser = _airdropPerUser;
        airdropRemaining = _airdropTotal;
    }

    function claim() public returns (bool) {
        require(!claimed[msg.sender], "Already claimed");
        require(airdropRemaining >= airdropPerUser, "No more airdrops");
        claimed[msg.sender] = true;
        airdropRemaining -= airdropPerUser;
        _mint(msg.sender, airdropPerUser);
        return true;
    }

    function burn() public {
        _burn(msg.sender, balanceOf(msg.sender));
    }
}
