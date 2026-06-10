/*jslint browser*/

// ── Constants ────────────────────────────────────────────────────────────────

const RING_LENGTH = 36;  // squares on the outer loop
const FINISH = 42;       // position value meaning "back in Home Base"
const SPAWN = -1;        // position value meaning "not yet deployed"
const BLUE_OFFSET = 18;  // Blue's ring path is offset 18 squares from Red's
const BOOST_STEPS = 3;
const FREEZE_TURNS = 2;
const RING_START = 3;    // path position where the shared ring begins
const RING_END = 38;     // path position where the shared ring ends

// Power-up squares keyed by shared position (0-35, Red's coordinate system).
// Positions 0 (Red entry) and 18 (Blue entry) are intentionally left clear.
const POWER_UP_SQUARES = Object.freeze({
    "3": "boost",
    "7": "shield",
    "11": "freeze",
    "15": "swap",
    "20": "bomb",
    "25": "sprint",
    "29": "boost",
    "34": "shield"
});

// ── Private helpers ─────────────────────────────────────────────────────────

/**
 * Returns the opponent's colour.
 * @param {string} player
 * @returns {string}
 */
const opponent = function (player) {
    return (
        (player === "red")
        ? "blue"
        : "red"
    );
};

/**
 * Converts a player-relative ring position (0-35) to the shared board position.
 * Returns -1 if the position is not on the ring.
 * @param {number} pos
 * @param {string} player
 * @returns {number}
 */
const toShared = function (pos, player) {
    if (pos < RING_START || pos > RING_END) {
        return -1;
    }
    return (
        (player === "blue")
        ? (pos - RING_START + BLUE_OFFSET) % RING_LENGTH
        : pos - RING_START
    );
};

/**
 * Converts a shared board position to the player's path position.
 * @param {number} shared
 * @param {string} player
 * @returns {number}
 */
const fromShared = function (shared, player) {
    const ringIdx = (
        (player === "blue")
        ? (shared - BLUE_OFFSET + RING_LENGTH) % RING_LENGTH
        : shared
    );
    return ringIdx + RING_START;
};

/**
 * Returns indices of `targetPlayer`'s pieces at `sharedPos` on the ring.
 * @param {{red: number[], blue: number[]}} pieces
 * @param {string} targetPlayer
 * @param {number} sharedPos
 * @returns {number[]}
 */
const piecesAtShared = function (pieces, targetPlayer, sharedPos) {
    return pieces[targetPlayer].reduce(function (acc, pos, idx) {
        if (toShared(pos, targetPlayer) === sharedPos) {
            return [...acc, idx];
        }
        return acc;
    }, []);
};

/**
 * Returns a new state with one piece's position updated.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @param {number} newPos
 * @returns {GameState}
 */
const setPiecePos = function (state, player, pieceIdx, newPos) {
    const newPieces = Object.assign({}, state.pieces);
    newPieces[player] = state.pieces[player].map(function (pos, idx) {
        return (
            (idx === pieceIdx)
            ? newPos
            : pos
        );
    });
    return Object.assign({}, state, {pieces: newPieces});
};

/**
 * Returns a new state with a piece's shield status set.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @param {boolean} value
 * @returns {GameState}
 */
const setShield = function (state, player, pieceIdx, value) {
    const newShields = Object.assign({}, state.shields);
    newShields[player] = state.shields[player].map(function (s, idx) {
        return (
            (idx === pieceIdx)
            ? value
            : s
        );
    });
    return Object.assign({}, state, {shields: newShields});
};

/**
 * Returns a new state with a piece's frozen turn-counter set.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @param {number} value
 * @returns {GameState}
 */
const setFrozen = function (state, player, pieceIdx, value) {
    const newFrozen = Object.assign({}, state.frozen);
    newFrozen[player] = state.frozen[player].map(function (f, idx) {
        return (
            (idx === pieceIdx)
            ? value
            : f
        );
    });
    return Object.assign({}, state, {frozen: newFrozen});
};

/**
 * Sends a piece back to spawn and clears its shield.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @returns {GameState}
 */
const sendToSpawn = function (state, player, pieceIdx) {
    return setPiecePos(
        setShield(state, player, pieceIdx, false),
        player,
        pieceIdx,
        SPAWN
    );
};

/**
 * Transitions to the next player's turn.
 * Decrements the finishing player's freeze counters.
 * Shields persist until a piece moves — they are NOT cleared here.
 * @param {GameState} state
 * @param {string} nextPlayer
 * @returns {GameState}
 */
const nextTurn = function (state, nextPlayer) {
    const justFinished = opponent(nextPlayer);
    const newFrozen = Object.assign({}, state.frozen);
    newFrozen[justFinished] = state.frozen[justFinished].map(function (f) {
        return (
            f > 0
            ? f - 1
            : 0
        );
    });
    return Object.assign({}, state, {
        currentPlayer: nextPlayer,
        phase: "roll",
        dice: null,
        actionPiece: null,
        sprintPiece: null,
        frozen: newFrozen
    });
};

/**
 * Returns true if all of a player's pieces have reached FINISH.
 * @param {GameState} state
 * @param {string} player
 * @returns {boolean}
 */
const checkWin = function (state, player) {
    return state.pieces[player].every(function (pos) {
        return pos === FINISH;
    });
};

/**
 * Checks if the moving piece triggers a mine at `sharedPos`.
 * If mined and not shielded, sends the piece to spawn and removes the mine.
 * If shielded, the mine is removed but the piece stays (shield persists).
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @param {number} sharedPos
 * @returns {GameState}
 */
const applyMine = function (state, player, pieceIdx, sharedPos) {
    if (!state.mines.includes(sharedPos)) {
        return state;
    }
    const withoutMine = Object.assign({}, state, {
        mines: state.mines.filter(function (m) {
            return m !== sharedPos;
        })
    });
    if (withoutMine.shields[player][pieceIdx]) {
        return withoutMine;   // shield blocks; persists until piece moves
    }
    return sendToSpawn(withoutMine, player, pieceIdx);
};

/**
 * Checks for enemy pieces at the same shared position as `pieceIdx`.
 * Sends unshielded enemies to spawn; consumes a shield if one blocks capture.
 * Power-up squares are safe — no capture occurs on them.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @returns {GameState}
 */
const applyCapture = function (state, player, pieceIdx) {
    const pos = state.pieces[player][pieceIdx];
    if (pos < RING_START || pos > RING_END) {
        return state;
    }
    const sharedPos = toShared(pos, player);
    if (POWER_UP_SQUARES[sharedPos] !== undefined) {
        return state;   // power-up squares are safe — no capture
    }
    const opp = opponent(player);
    const targets = piecesAtShared(state.pieces, opp, sharedPos);
    return targets.reduce(function (acc, idx) {
        if (acc.shields[opp][idx]) {
            return acc;   // shield blocks capture; persists until piece moves
        }
        return sendToSpawn(acc, opp, idx);
    }, state);
};

/**
 * Deduplicates an array of numbers, preserving order.
 * @param {number[]} arr
 * @returns {number[]}
 */
const dedupe = function (arr) {
    return arr.filter(function (item, idx) {
        return arr.indexOf(item) === idx;
    });
};

/**
 * Applies a power-up effect when a piece lands on a power-up square.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIdx
 * @param {string} powerUp
 * @param {number} sharedPos
 * @returns {GameState}
 */
const applyPowerUp = function (state, player, pieceIdx, powerUp, sharedPos) {
    if (powerUp === "boost") {
        const currentPos = state.pieces[player][pieceIdx];
        const boostedPos = Math.min(currentPos + BOOST_STEPS, FINISH);
        const afterBoost = setPiecePos(state, player, pieceIdx, boostedPos);
        // Apply capture at the boosted destination (normal ring squares only)
        return applyCapture(afterBoost, player, pieceIdx);
    }

    if (powerUp === "shield") {
        return setShield(state, player, pieceIdx, true);
    }

    if (powerUp === "freeze") {
        return setFrozen(state, player, pieceIdx, FREEZE_TURNS);
    }

    if (powerUp === "sprint") {
        return Object.assign({}, state, {
            phase: "sprint",
            sprintPiece: pieceIdx
        });
    }

    if (powerUp === "bomb") {
        const before = (sharedPos - 1 + RING_LENGTH) % RING_LENGTH;
        const after = (sharedPos + 1) % RING_LENGTH;
        return Object.assign({}, state, {
            mines: dedupe([...state.mines, before, sharedPos, after])
        });
    }

    if (powerUp === "swap") {
        return Object.assign({}, state, {
            phase: "swap",
            actionPiece: pieceIdx
        });
    }

    return state;
};

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Creates and returns a fresh game state with both players' pieces in spawn.
 * @returns {GameState}
 */
const createGame = function () {
    return {
        currentPlayer: "red",
        phase: "roll",
        dice: null,
        actionPiece: null,
        sprintPiece: null,
        winner: null,
        mines: [],
        pieces: {
            red: [SPAWN, SPAWN, SPAWN, SPAWN],
            blue: [SPAWN, SPAWN, SPAWN, SPAWN]
        },
        shields: {
            red: [false, false, false, false],
            blue: [false, false, false, false]
        },
        frozen: {
            red: [0, 0, 0, 0],
            blue: [0, 0, 0, 0]
        }
    };
};

/**
 * Rolls the dice. Only valid in "roll" phase; unchanged otherwise.
 * Transitions phase to "move".
 * @param {GameState} state
 * @returns {GameState}
 */
const rollDice = function (state) {
    if (state.phase !== "roll") {
        return state;
    }
    return Object.assign({}, state, {
        dice: Math.floor(Math.random() * 6) + 1,
        phase: "move"
    });
};

/**
 * Rolls the dice again during a sprint. Only valid in "sprint" phase.
 * Transitions phase to "move", keeping sprintPiece locked.
 * @param {GameState} state
 * @returns {GameState}
 */
const rollSprint = function (state) {
    if (state.phase !== "sprint") {
        return state;
    }
    return Object.assign({}, state, {
        dice: Math.floor(Math.random() * 6) + 1,
        phase: "move"
    });
};

/**
 * Returns the indices of pieces the current player can legally move this turn.
 * Respects frozen pieces, the sprint lock, deploy rules (need 1 or 6), and
 * the exact-entry rule for the home stretch (cannot overshoot FINISH).
 * @param {GameState} state
 * @returns {number[]}
 */
const getValidMoves = function (state) {
    if (state.phase !== "move") {
        return [];
    }
    const player = state.currentPlayer;
    const dice = state.dice;

    return state.pieces[player].reduce(function (acc, pos, idx) {
        if (state.sprintPiece !== null && idx !== state.sprintPiece) {
            return acc;
        }
        if (state.frozen[player][idx]) {
            return acc;
        }
        if (pos === SPAWN && (dice === 1 || dice === 6)) {
            return [...acc, idx];
        }
        if (pos >= 0 && pos + dice <= FINISH) {
            return [...acc, idx];
        }
        return acc;
    }, []);
};

/**
 * Moves a piece by the current dice roll and applies all resulting effects:
 * mine triggers, power-ups (boost, shield, freeze, sprint, swap, bomb),
 * and captures.
 * Ends the turn or enters sprint/swap phase as needed.
 * Returns state unchanged if the move is not in the valid move list.
 * @param {GameState} state
 * @param {number} pieceIndex
 * @returns {GameState}
 */
const movePiece = function (state, pieceIndex) {
    if (!getValidMoves(state).includes(pieceIndex)) {
        return state;
    }

    const player = state.currentPlayer;
    const opp = opponent(player);
    const currentPos = state.pieces[player][pieceIndex];
    const newPos = (
        (currentPos === SPAWN)
        ? 0
        : currentPos + state.dice
    );

    // Shield expires the moment a piece moves
    const noShield = setShield(state, player, pieceIndex, false);

    // 1. Place the piece at its new position
    const afterMove = setPiecePos(noShield, player, pieceIndex, newPos);

    // Steps 2-4 only apply when landing on the shared ring (pos 3-38)
    if (newPos < RING_START || newPos > RING_END) {
        if (checkWin(afterMove, player)) {
            return Object.assign({}, afterMove, {
                winner: player,
                phase: "done"
            });
        }
        return nextTurn(afterMove, opp);
    }

    const sharedPos = toShared(newPos, player);

    // 2. Check if this square is mined (by the opponent)
    const afterMine = applyMine(afterMove, player, pieceIndex, sharedPos);
    const wasMined = afterMine.pieces[player][pieceIndex] === SPAWN;

    if (wasMined) {
        if (checkWin(afterMine, player)) {
            return Object.assign({}, afterMine, {
                winner: player,
                phase: "done"
            });
        }
        return nextTurn(afterMine, opp);
    }

    // 3. Apply power-up (may move the piece further via boost, or change phase)
    const powerUp = POWER_UP_SQUARES[sharedPos];
    const afterPowerUp = (
        (powerUp !== undefined)
        ? applyPowerUp(afterMine, player, pieceIndex, powerUp, sharedPos)
        : afterMine
    );

    // 4. Apply capture at the piece's final position
    //    (boost may have moved the piece; capture skips power-up squares)
    const afterCapture = applyCapture(afterPowerUp, player, pieceIndex);

    // Check for win
    if (checkWin(afterCapture, player)) {
        return Object.assign({}, afterCapture, {
            winner: player,
            phase: "done"
        });
    }

    // Handle phases set by power-ups
    if (afterCapture.phase === "sprint") {
        return afterCapture;    // caller must call rollSprint() next
    }
    if (afterCapture.phase === "swap") {
        return afterCapture;    // caller must call swapWith() next
    }

    return nextTurn(afterCapture, opp);
};

/**
 * Executes a swap: exchanges the triggering piece with a chosen enemy piece.
 * Only valid in "swap" phase. Enemy piece must be on the ring (0-35).
 * @param {GameState} state
 * @param {number} enemyPieceIndex  index into the opponent's pieces array
 * @returns {GameState}
 */
const swapWith = function (state, enemyPieceIndex) {
    if (state.phase !== "swap") {
        return state;
    }
    const player = state.currentPlayer;
    const opp = opponent(player);
    const myIdx = state.actionPiece;
    const myPos = state.pieces[player][myIdx];
    const enemyPos = state.pieces[opp][enemyPieceIndex];

    if (enemyPos < RING_START || enemyPos > RING_END) {
        return nextTurn(state, opp);    // not on ring — skip
    }
    if (state.shields[opp][enemyPieceIndex]) {
        return nextTurn(state, opp);    // shielded — cannot be swapped
    }

    // Convert through shared coords so both pieces land on the correct
    // physical cell (path positions are player-relative, not shared).
    const myShared = toShared(myPos, player);
    const enemyShared = toShared(enemyPos, opp);
    const myNewPos = fromShared(enemyShared, player);
    const enemyNewPos = fromShared(myShared, opp);

    // Both pieces move, so both shields expire
    const cleared = setShield(
        setShield(state, player, myIdx, false),
        opp, enemyPieceIndex, false
    );
    const afterMyMove    = setPiecePos(cleared, player, myIdx, myNewPos);
    const afterEnemyMove = setPiecePos(
        afterMyMove, opp, enemyPieceIndex, enemyNewPos
    );

    return nextTurn(afterEnemyMove, opp);
};

// ── Read-only accessors ──────────────────────────────────────────────────────

/**
 * @param {GameState} state
 * @returns {string} "red" | "blue"
 */
const getCurrentPlayer = function (state) {
    return state.currentPlayer;
};

/**
 * @param {GameState} state
 * @returns {string | null} "red" | "blue" | null
 */
const getWinner = function (state) {
    return state.winner;
};

/**
 * @param {GameState} state
 * @returns {number | null}
 */
const getDice = function (state) {
    return state.dice;
};

/**
 * @param {GameState} state
 * @returns {string} "roll" | "move" | "sprint" | "swap" | "done"
 */
const getPhase = function (state) {
    return state.phase;
};

/**
 * Returns the position array for a given player.
 * -1 = spawn, 0-35 = ring, 36-38 = home stretch, 39 = finished.
 * @param {GameState} state
 * @param {string} player
 * @returns {number[]}
 */
const getPieces = function (state, player) {
    return state.pieces[player];
};

/**
 * Returns the list of shared board positions currently mined.
 * @param {GameState} state
 * @returns {number[]}
 */
const getMines = function (state) {
    return state.mines;
};

/**
 * Returns true if the given piece is currently shielded.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIndex
 * @returns {boolean}
 */
const isShielded = function (state, player, pieceIndex) {
    return state.shields[player][pieceIndex];
};

/**
 * Returns true if the given piece is currently frozen.
 * @param {GameState} state
 * @param {string} player
 * @param {number} pieceIndex
 * @returns {boolean}
 */
const isFrozen = function (state, player, pieceIndex) {
    return state.frozen[player][pieceIndex];
};

/**
 * Returns the power-up type at a shared board position, or undefined if none.
 * @param {number} sharedPos
 * @returns {string | undefined}
 */
const getPowerUpAt = function (sharedPos) {
    return POWER_UP_SQUARES[sharedPos];
};

/**
 * Passes the current turn to the opponent.
 * Call when the current player has rolled but has no valid moves.
 * Only valid in "move" phase; returns state unchanged otherwise.
 * @param {GameState} state
 * @returns {GameState}
 */
const passTurn = function (state) {
    if (state.phase !== "move") {
        return state;
    }
    return nextTurn(state, opponent(state.currentPlayer));
};

export default Object.freeze({
    createGame,
    rollDice,
    rollSprint,
    getValidMoves,
    movePiece,
    swapWith,
    passTurn,
    getCurrentPlayer,
    getWinner,
    getDice,
    getPhase,
    getPieces,
    getMines,
    isShielded,
    isFrozen,
    getPowerUpAt
});
