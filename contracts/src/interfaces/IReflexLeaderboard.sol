// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReflexLeaderboard
/// @notice Menyimpan personal best setiap pemain. History lengkap per-match
///         cukup di-index oleh Envio via event TapSubmitted.
interface IReflexLeaderboard {
    // =========================================================================
    // Structs
    // =========================================================================

    struct PlayerStats {
        uint256 bestReactionMs; // reaksi tercepat sepanjang masa
        uint256 totalWins;      // total kemenangan (juara 1)
        uint256 totalMatches;   // total match yang diikuti
        uint256 totalEarnedWei; // total MON yang diraih
    }

    // =========================================================================
    // Events
    // =========================================================================

    event StatsUpdated(address indexed player, uint256 reactionMs, bool isWinner, uint256 earned);
    event NewPersonalBest(address indexed player, uint256 oldRecord, uint256 newRecord);

    // =========================================================================
    // Errors
    // =========================================================================

    error UnauthorizedCaller(address caller);
    error ZeroAddress();

    // =========================================================================
    // External Functions
    // =========================================================================

    /// @notice Dipanggil oleh Reflex.sol setelah match selesai untuk update stats top 3
    function recordResult(
        address player,
        uint256 reactionMs,
        bool isWinner,
        uint256 earnedWei
    ) external;

    /// @notice Authorize game contract baru (hanya owner)
    function setGameContract(address gameContract) external;

    // =========================================================================
    // View Functions
    // =========================================================================

    function getStats(address player) external view returns (PlayerStats memory);

    /// @notice Top N pemain berdasarkan personal best reaction time
    function getTopPlayers(
        uint256 count
    ) external view returns (address[] memory players, uint256[] memory reactionTimes);
}
