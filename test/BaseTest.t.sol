// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import {console} from "forge-std/console.sol";
import {Utilities} from "../utils/Utilities.sol";

contract BaseTest is Test {
    Utilities internal utils;

    struct Users {
        address payable alice;
        address payable bob;
        address payable carol;
        address payable dave;
    }

    Users users;

    function setUp() public virtual {
        // setup utils
        utils = new Utilities();

        string[] memory labels = new string[](4);
        labels[0] = "Alice";
        labels[1] = "Bob";
        labels[2] = "Carol";
        labels[3] = "Dave";

        address payable[] memory _users = utils.createUsers(4, 1 ether, labels);

        // setup users
        users = Users({alice: _users[0], bob: _users[1], carol: _users[2], dave: _users[3]});
    }
}
