// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IReflex
/// @notice Interface lengkap untuk game Reflex — reaction-time wagering di Monad
interface IReflex {
    // =========================================================================
    // Enums
    // =========================================================================

    enum MatchState {
        Open,     // room terbuka, pemain bisa join
        Locked,   // host kunci room, tidak bisa join lagi
        Active,   // game berjalan, pemain bisa tap
        Finished  // game selesai, hadiah sudah dibayar
    }

    // =========================================================================
    // Structs
    // =========================================================================

    /// @dev Fixed array address[3] & uint256[3] untuk top 3 — gas-efficient
    struct Match {
        address host;
        MatchState state;
        uint32 playerCount;     // total pemain yang join
        uint32 tappedCount;     // total yang sudah tap
        uint256 stakePerPlayer; // taruhan per orang dalam wei
        uint256 startedAt;      // block.timestamp saat startMatch (detik)
        uint256 goTimestampMs;  // waktu GO dalam milidetik (startedAt*1000 + 3000)
        address[3] topPlayers;  // juara 1,2,3 berdasarkan reaction time
        uint256[3] topReactionMs; // waktu reaksi masing-masing (ms)
    }

    // =========================================================================
    // Events
    // =========================================================================

    /// @notice Room baru dibuat
    event MatchCreated(uint256 indexed matchId, address indexed host, uint256 stakePerPlayer);

    /// @notice Pemain join room
    event MatchJoined(uint256 indexed matchId, address indexed player, uint32 currentCount);

    /// @notice Host kunci room
    event MatchLocked(uint256 indexed matchId, uint32 totalPlayers);

    /// @notice Game dimulai — semua FE sync countdown dari goTimestampMs
    /// @param startedAt    block.timestamp saat startMatch dipanggil (detik)
    /// @param goTimestampMs waktu GO sebenarnya dalam ms (startedAt*1000 + countdownMs)
    /// @param countdownMs  durasi countdown sebelum GO (selalu 3000ms)
    event MatchStarted(
        uint256 indexed matchId,
        uint256 startedAt,
        uint256 goTimestampMs,
        uint256 countdownMs
    );

    /// @notice Pemain mengirim tap — diindeks Envio untuk real-time leaderboard
    event TapSubmitted(uint256 indexed matchId, address indexed player, uint256 reactionMs);

    /// @notice Game selesai dan hadiah dibayar
    /// @param topPlayers    3 pemenang (address(0) jika slot kosong)
    /// @param topReactionMs reaction time masing-masing pemenang
    /// @param prizes        hadiah masing-masing pemenang dalam wei
    /// @param winnersCount  jumlah pemenang (0-3, auto-scale)
    /// @param platformFee   fee platform 2% dalam wei
    event MatchFinished(
        uint256 indexed matchId,
        address[3] topPlayers,
        uint256[3] topReactionMs,
        uint256[3] prizes,
        uint8 winnersCount,
        uint256 platformFee
    );

    /// @notice forceSettle dipanggil karena host tidak menutup dalam 5 menit
    event MatchForceSettled(uint256 indexed matchId);

    /// @notice Fee platform di-withdraw oleh owner
    event FeesWithdrawn(address indexed to, uint256 amount);

    // =========================================================================
    // Errors
    // =========================================================================

    error StakeRequired();
    error MatchNotJoinable(uint256 matchId, MatchState state);
    error StakeMismatch(uint256 sent, uint256 required);
    error AlreadyJoined(uint256 matchId, address player);
    error OnlyHost(address caller, address host);
    error OnlyOwner(address caller);
    error MatchNotOpen(uint256 matchId, MatchState state);
    error NotEnoughPlayers(uint32 current, uint8 required);
    error MatchNotLocked(uint256 matchId, MatchState state);
    error MatchNotActive(uint256 matchId, MatchState state);
    error AlreadyTapped(uint256 matchId, address player);
    error NotAPlayer(uint256 matchId, address caller);
    error TappedTooEarly(uint256 clientTs, uint256 goTs);
    error ForceSettleNotReady(uint256 currentTime, uint256 readyAt);
    error PayoutFailed(address recipient, uint256 amount);
    error InvalidMatchId(uint256 matchId);
    error NoFeesToWithdraw();

    // =========================================================================
    // External Functions
    // =========================================================================

    /// @notice Buat room baru. Caller jadi host sekaligus pemain pertama.
    /// @return matchId ID room yang baru dibuat
    function createMatch() external payable returns (uint256 matchId);

    /// @notice Join room yang masih Open. Bayar stake yang sama dengan host.
    function joinMatch(uint256 matchId) external payable;

    /// @notice Host kunci room. Min 2 pemain harus sudah join.
    function lockMatch(uint256 matchId) external;

    /// @notice Host mulai game. Set countdown 3 detik on-chain.
    function startMatch(uint256 matchId) external;

    /// @notice Kirim tap. clientTimestampMs harus >= goTimestampMs.
    function submitTap(uint256 matchId, uint256 clientTimestampMs) external;

    /// @notice Host tutup game dan bayar pemenang kapanpun.
    function endMatch(uint256 matchId) external;

    /// @notice Safety net: siapapun bisa paksa settle setelah 5 menit dari startMatch.
    function forceSettle(uint256 matchId) external;

    /// @notice Owner tarik fee platform yang terkumpul.
    function withdrawFees() external;

    // =========================================================================
    // View Functions
    // =========================================================================

    function getMatch(uint256 matchId) external view returns (Match memory);

    function isPlayer(uint256 matchId, address player) external view returns (bool);

    function hasTapped(uint256 matchId, address player) external view returns (bool);
}
