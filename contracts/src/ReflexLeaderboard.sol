// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReflexLeaderboard} from "./interfaces/IReflexLeaderboard.sol";

/// @title ReflexLeaderboard
/// @notice Menyimpan personal best setiap pemain sepanjang masa.
///         Hanya game contract (Reflex.sol) yang bisa menulis ke sini.
///         History lengkap per-match di-handle oleh Envio indexer via events.
contract ReflexLeaderboard is IReflexLeaderboard {
    // =========================================================================
    // Constants
    // =========================================================================

    uint256 private constant _MAX_RANKED = 100;

    // =========================================================================
    // State Variables
    // =========================================================================

    address public immutable owner;
    address public gameContract;

    mapping(address player => PlayerStats) private _stats;

    /// @dev Diurutkan ascending by bestReactionMs (index 0 = tercepat)
    address[] private _ranked;

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyGame() {
        if (msg.sender != gameContract) revert UnauthorizedCaller(msg.sender);
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert UnauthorizedCaller(msg.sender);
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    constructor() {
        owner = msg.sender;
    }

    // =========================================================================
    // External Functions
    // =========================================================================

    /// @notice Set alamat game contract yang diizinkan menulis. Hanya owner.
    function setGameContract(address _gameContract) external override onlyOwner {
        if (_gameContract == address(0)) revert ZeroAddress();
        gameContract = _gameContract;
    }

    /// @notice Catat hasil match untuk seorang pemain. Dipanggil oleh Reflex.sol.
    /// @param player     Alamat pemain
    /// @param reactionMs Waktu reaksi dalam ms (0 jika tidak relevan)
    /// @param isWinner   True jika pemain adalah juara 1
    /// @param earnedWei  Jumlah MON yang diraih dalam wei
    function recordResult(
        address player,
        uint256 reactionMs,
        bool isWinner,
        uint256 earnedWei
    ) external override onlyGame {
        PlayerStats storage stats = _stats[player];

        stats.totalMatches++;
        if (isWinner) {
            stats.totalWins++;
            stats.totalEarnedWei += earnedWei;
        }

        // Update personal best hanya jika ada reaction time valid
        if (reactionMs == 0) return;

        bool isNewBest = stats.bestReactionMs == 0 || reactionMs < stats.bestReactionMs;
        if (isNewBest) {
            uint256 old = stats.bestReactionMs;
            stats.bestReactionMs = reactionMs;
            _updateRanking(player);
            emit NewPersonalBest(player, old, reactionMs);
        }

        emit StatsUpdated(player, reactionMs, isWinner, earnedWei);
    }

    // =========================================================================
    // External View Functions
    // =========================================================================

    /// @notice Lihat statistik lengkap seorang pemain
    function getStats(address player) external view override returns (PlayerStats memory) {
        return _stats[player];
    }

    /// @notice Top N pemain tercepat sepanjang masa
    /// @param count Jumlah pemain yang ingin diambil
    /// @return players       Array alamat pemain
    /// @return reactionTimes Array personal best masing-masing (ms)
    function getTopPlayers(
        uint256 count
    ) external view override returns (address[] memory players, uint256[] memory reactionTimes) {
        uint256 len = _ranked.length < count ? _ranked.length : count;
        players = new address[](len);
        reactionTimes = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            players[i] = _ranked[i];
            reactionTimes[i] = _stats[_ranked[i]].bestReactionMs;
        }
    }

    // =========================================================================
    // Internal Functions
    // =========================================================================

    /// @dev Insert/re-sort pemain di ranked list setelah personal best baru.
    ///      Hapus entry lama dulu, lalu insert di posisi yang benar.
    function _updateRanking(address player) internal {
        uint256 len = _ranked.length;
        uint256 playerBest = _stats[player].bestReactionMs;

        // Hapus entry lama jika ada
        for (uint256 i = 0; i < len; i++) {
            if (_ranked[i] == player) {
                for (uint256 j = i; j < len - 1; j++) {
                    _ranked[j] = _ranked[j + 1];
                }
                _ranked.pop();
                break;
            }
        }

        // Cek apakah layak masuk top 100
        if (_ranked.length >= _MAX_RANKED) {
            address last = _ranked[_ranked.length - 1];
            if (playerBest >= _stats[last].bestReactionMs) return;
            _ranked.pop(); // buang yang paling lambat
        }

        // Insert di posisi yang benar (ascending)
        _ranked.push(player);
        uint256 newLen = _ranked.length;
        uint256 pos = newLen - 1;

        while (pos > 0 && _stats[_ranked[pos - 1]].bestReactionMs > playerBest) {
            _ranked[pos] = _ranked[pos - 1];
            pos--;
        }
        _ranked[pos] = player;
    }
}
