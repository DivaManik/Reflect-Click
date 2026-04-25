// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IReflex} from "./interfaces/IReflex.sol";
import {IReflexLeaderboard} from "./interfaces/IReflexLeaderboard.sol";

/// @title Reflex
/// @notice Multi-player reaction-time wagering game on Monad.
///         N pemain stake MON → host trigger countdown 3 detik → GO! →
///         yang paling cepat tap menang. Top 1-3 dapat hadiah (auto-scale).
///
/// @dev State machine: Open → Locked → Active → Finished
///
///      Auto-scale pemenang berdasarkan jumlah yang tap:
///        1–4  tap  → 1 pemenang  → 100%
///        5–10 tap  → 2 pemenang  → 65% / 35%
///        11+  tap  → 3 pemenang  → 60% / 30% / 10%
///
///      Fee platform: 2% dari total pot, selalu diambil sebelum distribusi.
///      0 tap: seluruh pot (termasuk net setelah fee) masuk platform.
///
///      Tidak ada batas max pemain — gunakan mapping O(1) untuk player check.
///      History tap per-match di-index oleh Envio via event TapSubmitted.
contract Reflex is IReflex {
    // =========================================================================
    // Constants
    // =========================================================================

    /// @dev Countdown on-chain sebelum GO: 3 detik = 3000 ms
    uint256 public constant COUNTDOWN_MS = 3_000;

    /// @dev Safety timeout: siapapun bisa forceSettle setelah 5 menit
    uint256 public constant FORCE_SETTLE_TIMEOUT = 5 minutes;

    /// @dev Fee platform: 2% = 200 basis points
    uint256 public constant PLATFORM_FEE_BPS = 200;

    /// @dev Minimal pemain agar bisa lock & start
    uint8 public constant MIN_PLAYERS = 2;

    // =========================================================================
    // State Variables
    // =========================================================================

    address public immutable owner;
    IReflexLeaderboard public immutable leaderboard;

    uint256 public matchCounter;
    uint256 public accumulatedFees;

    mapping(uint256 matchId => Match) private _matches;

    /// @dev O(1) player verification — tidak pakai array
    mapping(uint256 matchId => mapping(address player => bool)) private _isPlayerMap;

    /// @dev Cegah double tap
    mapping(uint256 matchId => mapping(address player => bool)) private _hasTappedMap;

    // =========================================================================
    // Modifiers
    // =========================================================================

    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner(msg.sender);
        _;
    }

    modifier onlyHost(uint256 matchId) {
        if (msg.sender != _matches[matchId].host) {
            revert OnlyHost(msg.sender, _matches[matchId].host);
        }
        _;
    }

    modifier validMatch(uint256 matchId) {
        if (matchId == 0 || matchId > matchCounter) revert InvalidMatchId(matchId);
        _;
    }

    // =========================================================================
    // Constructor
    // =========================================================================

    /// @param _leaderboard Alamat ReflexLeaderboard yang sudah di-deploy
    constructor(address _leaderboard) {
        owner = msg.sender;
        leaderboard = IReflexLeaderboard(_leaderboard);
    }

    // =========================================================================
    // External Functions — Match Lifecycle
    // =========================================================================

    /// @notice Buat room baru. Nilai msg.value = stake per orang.
    ///         Caller otomatis jadi host dan pemain pertama.
    /// @return matchId ID room yang baru dibuat (mulai dari 1)
    function createMatch() external payable override returns (uint256 matchId) {
        if (msg.value == 0) revert StakeRequired();

        matchCounter++;
        matchId = matchCounter;

        Match storage m = _matches[matchId];
        m.host = msg.sender;
        m.stakePerPlayer = msg.value;
        m.state = MatchState.Open;
        m.playerCount = 1;

        _isPlayerMap[matchId][msg.sender] = true;

        emit MatchCreated(matchId, msg.sender, msg.value);
        emit MatchJoined(matchId, msg.sender, 1);
    }

    /// @notice Join room yang masih Open. msg.value harus sama persis dengan stake host.
    function joinMatch(uint256 matchId) external payable override validMatch(matchId) {
        Match storage m = _matches[matchId];

        if (m.state != MatchState.Open) revert MatchNotJoinable(matchId, m.state);
        if (msg.value != m.stakePerPlayer) revert StakeMismatch(msg.value, m.stakePerPlayer);
        if (_isPlayerMap[matchId][msg.sender]) revert AlreadyJoined(matchId, msg.sender);

        _isPlayerMap[matchId][msg.sender] = true;
        m.playerCount++;

        emit MatchJoined(matchId, msg.sender, m.playerCount);
    }

    /// @notice Host kunci room. Setelah ini tidak ada yang bisa join.
    ///         Minimal harus ada MIN_PLAYERS (2) pemain.
    function lockMatch(uint256 matchId) external override validMatch(matchId) onlyHost(matchId) {
        Match storage m = _matches[matchId];

        if (m.state != MatchState.Open) revert MatchNotOpen(matchId, m.state);
        if (m.playerCount < MIN_PLAYERS) revert NotEnoughPlayers(m.playerCount, MIN_PLAYERS);

        m.state = MatchState.Locked;
        emit MatchLocked(matchId, m.playerCount);
    }

    /// @notice Host mulai game.
    ///         goTimestampMs = block.timestamp * 1000 + 3000 (3 detik dari sekarang).
    ///         Semua FE sync countdown dari goTimestampMs ini.
    ///         Tap yang masuk sebelum goTimestampMs akan ditolak contract.
    function startMatch(uint256 matchId) external override validMatch(matchId) onlyHost(matchId) {
        Match storage m = _matches[matchId];

        if (m.state != MatchState.Locked) revert MatchNotLocked(matchId, m.state);

        uint256 startedAt = block.timestamp;
        uint256 goTimestampMs = startedAt * 1_000 + COUNTDOWN_MS;

        m.startedAt = startedAt;
        m.goTimestampMs = goTimestampMs;
        m.state = MatchState.Active;

        emit MatchStarted(matchId, startedAt, goTimestampMs, COUNTDOWN_MS);
    }

    /// @notice Kirim tap. clientTimestampMs = Date.now() di sisi client saat tap.
    ///         Reaction time = clientTimestampMs - goTimestampMs.
    ///         Auto-settle jika semua pemain sudah tap.
    /// @param clientTimestampMs Timestamp client dalam milidetik saat tombol ditekan
    function submitTap(
        uint256 matchId,
        uint256 clientTimestampMs
    ) external override validMatch(matchId) {
        Match storage m = _matches[matchId];

        if (m.state != MatchState.Active) revert MatchNotActive(matchId, m.state);
        if (!_isPlayerMap[matchId][msg.sender]) revert NotAPlayer(matchId, msg.sender);
        if (_hasTappedMap[matchId][msg.sender]) revert AlreadyTapped(matchId, msg.sender);
        if (clientTimestampMs < m.goTimestampMs) revert TappedTooEarly(clientTimestampMs, m.goTimestampMs);

        uint256 reactionMs = clientTimestampMs - m.goTimestampMs;

        _hasTappedMap[matchId][msg.sender] = true;
        m.tappedCount++;

        _updateTopThree(m, msg.sender, reactionMs);

        emit TapSubmitted(matchId, msg.sender, reactionMs);

        // Auto-settle jika semua pemain sudah tap
        if (m.tappedCount == m.playerCount) {
            _settle(matchId);
        }
    }

    /// @notice Host tutup game dan bayar pemenang. Bisa dipanggil kapanpun saat Active.
    ///         Pemain yang belum tap dianggap diskualifikasi.
    function endMatch(uint256 matchId) external override validMatch(matchId) onlyHost(matchId) {
        Match storage m = _matches[matchId];
        if (m.state != MatchState.Active) revert MatchNotActive(matchId, m.state);
        _settle(matchId);
    }

    /// @notice Safety net jika host tidak menutup game.
    ///         Siapapun bisa panggil setelah FORCE_SETTLE_TIMEOUT (5 menit) dari startMatch.
    function forceSettle(uint256 matchId) external override validMatch(matchId) {
        Match storage m = _matches[matchId];
        if (m.state != MatchState.Active) revert MatchNotActive(matchId, m.state);

        uint256 readyAt = m.startedAt + FORCE_SETTLE_TIMEOUT;
        if (block.timestamp < readyAt) revert ForceSettleNotReady(block.timestamp, readyAt);

        emit MatchForceSettled(matchId);
        _settle(matchId);
    }

    /// @notice Owner tarik semua fee platform yang terkumpul
    function withdrawFees() external override onlyOwner {
        uint256 amount = accumulatedFees;
        if (amount == 0) revert NoFeesToWithdraw();
        accumulatedFees = 0;
        (bool sent,) = owner.call{value: amount}("");
        if (!sent) revert PayoutFailed(owner, amount);
        emit FeesWithdrawn(owner, amount);
    }

    // =========================================================================
    // External View Functions
    // =========================================================================

    /// @notice Lihat detail sebuah match (termasuk top 3 saat ini)
    function getMatch(
        uint256 matchId
    ) external view override validMatch(matchId) returns (Match memory) {
        return _matches[matchId];
    }

    /// @notice Cek apakah sebuah address adalah pemain di match ini
    function isPlayer(
        uint256 matchId,
        address player
    ) external view override returns (bool) {
        return _isPlayerMap[matchId][player];
    }

    /// @notice Cek apakah pemain sudah tap di match ini
    function hasTapped(
        uint256 matchId,
        address player
    ) external view override returns (bool) {
        return _hasTappedMap[matchId][player];
    }

    // =========================================================================
    // Internal Functions
    // =========================================================================

    /// @dev Core settlement: hitung fee, tentukan jumlah pemenang, bayar, update leaderboard
    function _settle(uint256 matchId) internal {
        Match storage m = _matches[matchId];
        m.state = MatchState.Finished;

        uint256 pot = m.stakePerPlayer * m.playerCount;
        uint256 fee = (pot * PLATFORM_FEE_BPS) / 10_000;
        uint256 netPot = pot - fee;
        accumulatedFees += fee;

        uint8 winnersCount = _winnersCount(m.tappedCount);
        uint256[3] memory prizes;

        if (winnersCount > 0) {
            prizes = _pay(m, netPot, winnersCount);
        } else {
            // 0 tap: seluruh net pot juga masuk platform
            accumulatedFees += netPot;
        }

        emit MatchFinished(matchId, m.topPlayers, m.topReactionMs, prizes, winnersCount, fee);

        // Update leaderboard untuk top 3 (silent fail — non-critical untuk demo)
        _recordLeaderboard(m, prizes, winnersCount);
    }

    /// @dev Auto-scale: tentukan jumlah pemenang dari jumlah yang tap
    function _winnersCount(uint32 tapped) internal pure returns (uint8) {
        if (tapped == 0) return 0;
        if (tapped >= 11) return 3;
        if (tapped >= 5) return 2;
        return 1;
    }

    /// @dev Bayar pemenang secara proporsional sesuai jumlah pemenang
    ///      1 pemenang  → 100%
    ///      2 pemenang  → 65% / 35%
    ///      3 pemenang  → 60% / 30% / 10%
    function _pay(
        Match storage m,
        uint256 netPot,
        uint8 winnersCount
    ) internal returns (uint256[3] memory prizes) {
        uint256[3] memory bps;

        if (winnersCount == 1) {
            bps[0] = 10_000;
        } else if (winnersCount == 2) {
            bps[0] = 6_500;
            bps[1] = 3_500;
        } else {
            bps[0] = 6_000;
            bps[1] = 3_000;
            bps[2] = 1_000;
        }

        for (uint8 i = 0; i < winnersCount; i++) {
            address recipient = m.topPlayers[i];
            if (recipient == address(0)) break;

            prizes[i] = (netPot * bps[i]) / 10_000;
            (bool sent,) = recipient.call{value: prizes[i]}("");
            if (!sent) revert PayoutFailed(recipient, prizes[i]);
        }
    }

    /// @dev Update posisi top 3 setiap kali ada tap masuk.
    ///      Insertion sort O(3) — selalu konstan, tidak bergantung jumlah pemain.
    function _updateTopThree(Match storage m, address player, uint256 reactionMs) internal {
        uint8 insertAt = 3; // default: tidak masuk top 3

        for (uint8 i = 0; i < 3; i++) {
            if (m.topPlayers[i] == address(0) || reactionMs < m.topReactionMs[i]) {
                insertAt = i;
                break;
            }
        }

        if (insertAt == 3) return;

        // Geser ke bawah mulai dari posisi 2
        for (uint8 j = 2; j > insertAt; j--) {
            m.topPlayers[j] = m.topPlayers[j - 1];
            m.topReactionMs[j] = m.topReactionMs[j - 1];
        }

        m.topPlayers[insertAt] = player;
        m.topReactionMs[insertAt] = reactionMs;
    }

    /// @dev Kirim hasil ke leaderboard. Try/catch agar kegagalan leaderboard
    ///      tidak membatalkan pembayaran pemenang.
    function _recordLeaderboard(
        Match storage m,
        uint256[3] memory prizes,
        uint8 winnersCount
    ) internal {
        for (uint8 i = 0; i < winnersCount; i++) {
            address player = m.topPlayers[i];
            if (player == address(0)) break;

            try leaderboard.recordResult(
                player,
                m.topReactionMs[i],
                i == 0, // hanya juara 1 yang dihitung sebagai "win"
                prizes[i]
            ) {} catch {}
        }
    }
}
