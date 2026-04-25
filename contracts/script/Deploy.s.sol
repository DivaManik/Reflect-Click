// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {Reflex} from "../src/Reflex.sol";
import {ReflexLeaderboard} from "../src/ReflexLeaderboard.sol";

/// @notice Deploy full Reflex protocol ke Monad Testnet
/// @dev forge script script/Deploy.s.sol --rpc-url $MONAD_RPC --private-key $PRIVATE_KEY --broadcast
contract DeployReflex is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        console.log("Deployer :", deployer);
        console.log("Balance  :", deployer.balance);

        vm.startBroadcast(deployerKey);

        // 1. Deploy leaderboard (tidak ada dependency)
        ReflexLeaderboard leaderboard = new ReflexLeaderboard();
        console.log("ReflexLeaderboard :", address(leaderboard));

        // 2. Deploy game contract
        Reflex reflex = new Reflex(address(leaderboard));
        console.log("Reflex            :", address(reflex));

        // 3. Authorize Reflex untuk menulis ke leaderboard
        leaderboard.setGameContract(address(reflex));
        console.log("Leaderboard authorized");

        vm.stopBroadcast();

        console.log("\n=== ENV VARS UNTUK FRONTEND ===");
        console.log("NEXT_PUBLIC_REFLEX_ADDRESS=", address(reflex));
        console.log("NEXT_PUBLIC_LEADERBOARD_ADDRESS=", address(leaderboard));
        console.log("NEXT_PUBLIC_CHAIN_ID=10143");
        console.log("NEXT_PUBLIC_RPC_URL=https://testnet-rpc.monad.xyz");
    }
}
