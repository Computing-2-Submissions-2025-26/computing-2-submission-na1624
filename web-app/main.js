import Game from "./game.js";

// ── Dice dot layout (3×3 grid positions 1-9, row-major) ──────────────────────
const DOT_POSITIONS = Object.freeze({
    "1": [5],
    "2": [3, 7],
    "3": [3, 5, 7],
    "4": [1, 3, 7, 9],
    "5": [1, 3, 5, 7, 9],
    "6": [1, 3, 4, 6, 7, 9]
});

const renderDiceFace = function (value) {
    const el = document.getElementById("dice-face");
    el.innerHTML = "";
    const dots = (
        value !== null
        ? DOT_POSITIONS[value]
        : []
    );
    let i = 1;
    while (i <= 9) {
        const cell = document.createElement("div");
        if (dots.indexOf(i) !== -1) {
            cell.className = "dice-cell";
            const dot = document.createElement("div");
            dot.className = "dice-dot";
            cell.appendChild(dot);
        } else if (value === null && i === 5) {
            cell.className = "dice-cell dice-empty";
            cell.textContent = "–";
        } else {
            cell.className = "dice-cell";
        }
        el.appendChild(cell);
        i += 1;
    }
};

// ── Power-up icon map ────────────────────────────────────────────────────────
const PU_ICON = Object.freeze({
    boost: "⚡",
    shield: "🛡️",
    freeze: "❄️",
    sprint: "💨",
    swap: "🔄",
    bomb: "💣"
});

// ── Board coordinate maps ────────────────────────────────────────────────────
const RING_COORDS = [
    [5, 0], [4, 0], [3, 0], [2, 0], [1, 0], [0, 0],
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8],
    [7, 8], [8, 8], [9, 8], [10, 8],
    [10, 7], [10, 6], [10, 5], [10, 4],
    [10, 3], [10, 2], [10, 1], [10, 0],
    [9, 0], [8, 0], [7, 0], [6, 0]
];

// Index 0 = closest to spawn, index 2 = closest to ring.
const ENTRY_COORDS = {
    red: [[5, 3], [5, 2], [5, 1]],
    blue: [[5, 5], [5, 6], [5, 7]]
};

const SPAWN_COORDS = {
    red: [[2, 3], [4, 3], [2, 5], [4, 5]],
    blue: [[6, 3], [8, 3], [6, 5], [8, 5]]
};

// ── Coordinate helpers ───────────────────────────────────────────────────────

const coordsForPiece = function (player, pieceIdx, pos) {
    if (pos === -1 || pos === 42) {
        return SPAWN_COORDS[player][pieceIdx];
    }
    if (pos >= 0 && pos <= 2) {
        return ENTRY_COORDS[player][pos];
    }
    if (pos >= 3 && pos <= 38) {
        const shared = (
            player === "blue"
            ? (pos - 3 + 18) % 36
            : pos - 3
        );
        return RING_COORDS[shared];
    }
    if (pos >= 39 && pos <= 41) {
        return ENTRY_COORDS[player][41 - pos];
    }
    return null;
};

const getCell = function (col, row) {
    return document.getElementById("cell-" + col + "-" + row);
};

// ── Board construction ───────────────────────────────────────────────────────

const cellTypeFor = function (col, row) {
    if (row === 0 || row === 8 || col === 0 || col === 10) {
        return "ring";
    }
    if (col === 5 && row >= 1 && row <= 3) {
        return "connector-red";
    }
    if (col === 5 && row >= 5 && row <= 7) {
        return "connector-blue";
    }
    if (col >= 2 && col <= 4 && row >= 3 && row <= 5) {
        const redCorner = (col === 2 || col === 4) && (row === 3 || row === 5);
        return (
            redCorner
            ? "spawn-red"
            : "spawn-red-bg"
        );
    }
    if (col >= 6 && col <= 8 && row >= 3 && row <= 5) {
        const blueCorner = (col === 6 || col === 8) && (row === 3 || row === 5);
        return (
            blueCorner
            ? "spawn-blue"
            : "spawn-blue-bg"
        );
    }
    if (col === 5 && row === 4) {
        return "center";
    }
    return "empty";
};

const ringPosFor = function (col, row) {
    return RING_COORDS.findIndex(function (c) {
        return c[0] === col && c[1] === row;
    });
};

const buildBoard = function () {
    const board = document.getElementById("board");
    let row = 0;
    while (row < 9) {
        let col = 0;
        while (col < 11) {
            const cell = document.createElement("div");
            const type = cellTypeFor(col, row);
            cell.id = "cell-" + col + "-" + row;
            cell.className = "cell " + type;

            if (type === "ring") {
                const rp = ringPosFor(col, row);
                if (rp !== -1) {
                    cell.dataset.ringPos = String(rp);
                    const pu = Game.getPowerUpAt(rp);
                    if (pu !== undefined) {
                        cell.classList.add("pu-" + pu);
                        const lbl = document.createElement("span");
                        lbl.className = "pu-label";
                        lbl.setAttribute("aria-hidden", "true");
                        const icon = PU_ICON[pu];
                        if (
                            icon.endsWith(".png") ||
                            icon.endsWith(".jpg") ||
                            icon.endsWith(".svg")
                        ) {
                            const img = document.createElement("img");
                            img.src = icon;
                            img.alt = pu;
                            img.className = "pu-img";
                            lbl.appendChild(img);
                        } else {
                            lbl.textContent = icon;
                        }
                        cell.appendChild(lbl);
                        cell.setAttribute(
                            "aria-label",
                            pu + " power-up square"
                        );
                    }
                    if (rp === 0) {
                        cell.classList.add("red-entry");
                    }
                    if (rp === 18) {
                        cell.classList.add("blue-entry");
                    }
                }
            }

            board.appendChild(cell);
            col += 1;
        }
        row += 1;
    }
};

// ── Rendering helpers ────────────────────────────────────────────────────────

const clearPieces = function () {
    document.querySelectorAll(".piece").forEach(function (el) {
        el.remove();
    });
};

const clearHighlights = function () {
    document.querySelectorAll(".cell.valid-move").forEach(function (el) {
        el.classList.remove("valid-move");
    });
};

const renderMines = function (state) {
    document.querySelectorAll(".cell.mined").forEach(function (el) {
        el.classList.remove("mined");
    });
    Game.getMines(state).forEach(function (shared) {
        const coords = RING_COORDS[shared];
        if (coords) {
            const cell = getCell(coords[0], coords[1]);
            if (cell) {
                cell.classList.add("mined");
            }
        }
    });
};

const placePiece = function (player, pieceIdx, pos, state, stackCount) {
    const coords = coordsForPiece(player, pieceIdx, pos);
    if (!coords) {
        return;
    }
    const cell = getCell(coords[0], coords[1]);
    if (!cell) {
        return;
    }

    const piece = document.createElement("div");
    piece.className = "piece " + player;
    if (stackCount > 0) {
        piece.classList.add("stack-" + (stackCount % 4));
    }
    piece.dataset.player = player;
    piece.dataset.index = String(pieceIdx);
    piece.setAttribute("role", "button");
    piece.setAttribute("tabindex", "-1");

    let posLabel = "position " + String(pos);
    if (pos === -1) {
        posLabel = "in spawn";
    }
    if (pos === 42) {
        posLabel = "home";
    }
    piece.setAttribute(
        "aria-label",
        player + " piece " + (pieceIdx + 1) + " — " + posLabel
    );

    if (pos === 42) {
        piece.classList.add("finished");
    }
    if (Game.isShielded(state, player, pieceIdx)) {
        piece.classList.add("shielded");
    }
    if (Game.isFrozen(state, player, pieceIdx)) {
        piece.classList.add("frozen");
    }

    cell.appendChild(piece);
};

const placePieces = function (state, prevState) {
    const cellCounts = {};
    ["red", "blue"].forEach(function (player) {
        Game.getPieces(state, player).forEach(function (pos, idx) {
            const coords = coordsForPiece(player, idx, pos);
            if (!coords) {
                return;
            }
            const key = coords[0] + "," + coords[1];
            const count = cellCounts[key] || 0;
            placePiece(player, idx, pos, state, count);
            const wasOnBoard = (
                prevState !== null &&
                Game.getPieces(prevState, player)[idx] !== -1 &&
                pos === -1
            );
            if (wasOnBoard) {
                const cell = getCell(coords[0], coords[1]);
                if (cell) {
                    cell.querySelectorAll(
                        ".piece." + player
                    ).forEach(function (el) {
                        if (Number(el.dataset.index) === idx) {
                            el.classList.add("just-captured");
                        }
                    });
                }
            }
            cellCounts[key] = count + 1;
        });
    });
};

const applyHighlights = function (state) {
    const phase = Game.getPhase(state);
    const player = Game.getCurrentPlayer(state);
    const validMoves = Game.getValidMoves(state);

    if (phase === "move" || phase === "sprint") {
        validMoves.forEach(function (pieceIdx) {
            const pos = Game.getPieces(state, player)[pieceIdx];
            const coords = coordsForPiece(player, pieceIdx, pos);
            if (!coords) {
                return;
            }
            const cell = getCell(coords[0], coords[1]);
            if (!cell) {
                return;
            }
            cell.classList.add("valid-move");
            cell.querySelectorAll(".piece." + player).forEach(function (el) {
                if (Number(el.dataset.index) === pieceIdx) {
                    el.classList.add("can-move");
                    el.setAttribute("tabindex", "0");
                }
            });
        });
    }

    if (phase === "swap") {
        const opp = (
            player === "red"
            ? "blue"
            : "red"
        );
        Game.getPieces(state, opp).forEach(function (pos, idx) {
            if (pos < 3 || pos > 38) {
                return;
            }
            if (Game.isShielded(state, opp, idx)) {
                return;
            }
            const coords = coordsForPiece(opp, idx, pos);
            if (!coords) {
                return;
            }
            const cell = getCell(coords[0], coords[1]);
            if (!cell) {
                return;
            }
            cell.querySelectorAll(".piece." + opp).forEach(function (el) {
                if (Number(el.dataset.index) === idx) {
                    el.classList.add("swap-target");
                    el.setAttribute("tabindex", "0");
                }
            });
        });
    }
};

const updateControls = function (state) {
    const phase = Game.getPhase(state);
    const player = Game.getCurrentPlayer(state);
    const dice = Game.getDice(state);
    const validMoves = Game.getValidMoves(state);

    const playerLabel = document.getElementById("player-label");
    const playerDot = document.getElementById("player-dot");
    const diceFace = document.getElementById("dice-face");
    const rollBtn = document.getElementById("roll-btn");
    const statusMsg = document.getElementById("status-msg");

    playerLabel.textContent = (
        player.charAt(0).toUpperCase() + player.slice(1) + "'s Turn"
    );
    playerDot.className = "player-dot " + player;

    renderDiceFace(dice);
    const diceLabel = (
        dice !== null
        ? String(dice)
        : "not yet rolled"
    );
    diceFace.setAttribute("aria-label", "Dice: " + diceLabel);

    const canRoll = (phase === "roll" || phase === "sprint");
    rollBtn.disabled = !canRoll;
    rollBtn.textContent = (
        phase === "sprint"
        ? "Roll Again (Sprint!)"
        : "Roll Dice"
    );

    if (phase === "roll") {
        statusMsg.textContent = "Roll the dice to take your turn.";
    } else if (phase === "move" && validMoves.length === 0) {
        statusMsg.textContent = "No valid moves — turn passes automatically…";
    } else if (phase === "move") {
        statusMsg.textContent = "Click a highlighted piece to move it.";
    } else if (phase === "sprint") {
        statusMsg.textContent = "Sprint! Roll again — same piece moves.";
    } else if (phase === "swap") {
        statusMsg.textContent = "Swap! Click any enemy piece on the board.";
    } else if (phase === "done") {
        statusMsg.textContent = "";
    }
};

// Updates side panels: piece counts and token indicator dots.
const updatePanels = function (state) {
    ["red", "blue"].forEach(function (player) {
        const pieces = Game.getPieces(state, player);
        const spawnCount = pieces.filter(function (p) {
            return p === -1;
        }).length;
        const finishCount = pieces.filter(function (p) {
            return p === 42;
        }).length;
        const boardCount = 4 - spawnCount - finishCount;

        const spawnEl = document.getElementById(player + "-spawn");
        const boardEl = document.getElementById(player + "-board");
        const homeEl = document.getElementById(player + "-home");
        spawnEl.textContent = String(spawnCount);
        boardEl.textContent = String(boardCount);
        homeEl.textContent = String(finishCount);

        const tokenRow = document.getElementById(player + "-tokens");
        tokenRow.innerHTML = "";
        pieces.forEach(function (pos, idx) {
            const dot = document.createElement("div");
            dot.className = "token-dot " + player;
            if (pos !== -1 && pos !== 42) {
                dot.classList.add("on-board");
            }
            if (pos === 42) {
                dot.classList.add("finished");
            }
            if (Game.isShielded(state, player, idx)) {
                dot.classList.add("shielded");
            }
            if (Game.isFrozen(state, player, idx)) {
                dot.classList.add("frozen");
            }
            tokenRow.appendChild(dot);
        });
    });

    const current = Game.getCurrentPlayer(state);
    document.getElementById("red-panel").classList.toggle(
        "active",
        current === "red"
    );
    document.getElementById("blue-panel").classList.toggle(
        "active",
        current === "blue"
    );
};

const showWinner = function (winner) {
    const overlay = document.getElementById("winner-overlay");
    const heading = document.getElementById("winner-heading");
    const name = winner.charAt(0).toUpperCase() + winner.slice(1);
    heading.textContent = name + " Wins! 🎉";
    overlay.hidden = false;
    document.getElementById("restart-btn").focus();
};

// ── Main render ──────────────────────────────────────────────────────────────

const render = function (state, prevState) {
    clearPieces();
    clearHighlights();
    renderMines(state);
    placePieces(state, prevState || null);
    applyHighlights(state);
    updateControls(state);
    updatePanels(state);

    if (Game.getWinner(state) !== null) {
        showWinner(Game.getWinner(state));
    }
};

// ── Animation ────────────────────────────────────────────────────────────────

let isAnimating = false;

// Rattles the dice face through random values, slowing before calling onDone.
const animateDice = function (onDone) {
    const diceEl = document.getElementById("dice-face");
    const rollBtn = document.getElementById("roll-btn");
    rollBtn.disabled = true;
    diceEl.classList.add("rolling");
    let count = 0;
    const total = 12;
    const tick = function () {
        renderDiceFace(Math.floor(Math.random() * 6) + 1);
        count += 1;
        if (count < total) {
            setTimeout(tick, 45 + count * 8);
        } else {
            diceEl.classList.remove("rolling");
            onDone();
        }
    };
    tick();
};

// Returns each position the piece visits, including the starting cell.
// Spawn deployment (-1 → 0) always produces exactly [-1, 0].
const pathForMove = function (startPos, dice) {
    if (startPos === -1) {
        return [-1, 0];
    }
    const path = [startPos];
    let pos = startPos;
    let step = 0;
    while (step < dice) {
        pos += 1;
        path.push(pos);
        step += 1;
    }
    return path;
};

// Moves a ghost piece cell-by-cell along the path, then calls onDone.
const animateMove = function (player, pieceIdx, startPos, dice, onDone) {
    const path = pathForMove(startPos, dice);

    // Hide the original piece so only the ghost is visible during animation.
    const origEl = document.querySelector(
        ".piece." + player + "[data-index='" + String(pieceIdx) + "']"
    );
    if (origEl) {
        origEl.style.opacity = "0";
    }

    const ghost = document.createElement("div");
    ghost.className = "piece-ghost " + player;

    let i = 0;
    const tick = function () {
        if (ghost.parentNode) {
            ghost.parentNode.removeChild(ghost);
        }
        if (i >= path.length) {
            onDone();
            return;
        }
        const coords = coordsForPiece(player, pieceIdx, path[i]);
        if (coords) {
            const cell = getCell(coords[0], coords[1]);
            if (cell) {
                cell.appendChild(ghost);
            }
        }
        i += 1;
        setTimeout(tick, 130);
    };

    tick();
};

// ── Event handlers ───────────────────────────────────────────────────────────

let gameState = Game.createGame();
let stateHistory = [gameState];

const saveHistory = function () {
    stateHistory.push(gameState);
};

const handlePieceInteraction = function (pieceEl) {
    if (isAnimating) {
        return;
    }

    const player = pieceEl.dataset.player;
    const pieceIdx = Number(pieceEl.dataset.index);
    const phase = Game.getPhase(gameState);
    const current = Game.getCurrentPlayer(gameState);

    if ((phase === "move" || phase === "sprint") && player === current) {
        if (Game.getValidMoves(gameState).includes(pieceIdx)) {
            isAnimating = true;
            saveHistory();
            const startPos = Game.getPieces(gameState, player)[pieceIdx];
            const dice = Game.getDice(gameState);

            animateMove(player, pieceIdx, startPos, dice, function () {
                isAnimating = false;
                const prevState = gameState;
                gameState = Game.movePiece(gameState, pieceIdx);
                render(gameState, prevState);

                if (
                    Game.getPhase(gameState) === "move" &&
                    Game.getValidMoves(gameState).length === 0
                ) {
                    render(gameState);
                    setTimeout(function () {
                        gameState = Game.passTurn(gameState);
                        render(gameState);
                    }, 1400);
                }
            });
        }
        return;
    }

    if (phase === "swap" && player !== current) {
        saveHistory();
        gameState = Game.swapWith(gameState, pieceIdx);
        render(gameState);
    }
};

document.getElementById("board").addEventListener("click", function (event) {
    const piece = event.target.closest(".piece");
    if (piece) {
        handlePieceInteraction(piece);
    }
});

document.getElementById("board").addEventListener("keydown", function (event) {
    if (event.key !== "Enter" && event.key !== " ") {
        return;
    }
    const piece = event.target.closest(".piece");
    if (piece) {
        event.preventDefault();
        handlePieceInteraction(piece);
    }
});

document.getElementById("roll-btn").addEventListener("click", function () {
    if (isAnimating) {
        return;
    }
    const phase = Game.getPhase(gameState);
    if (phase !== "roll" && phase !== "sprint") {
        return;
    }
    saveHistory();
    animateDice(function () {
        if (phase === "roll") {
            gameState = Game.rollDice(gameState);
        } else {
            gameState = Game.rollSprint(gameState);
        }
        render(gameState);
        if (
            Game.getPhase(gameState) === "move" &&
            Game.getValidMoves(gameState).length === 0
        ) {
            setTimeout(function () {
                gameState = Game.passTurn(gameState);
                render(gameState);
            }, 1400);
        }
    });
});

document.getElementById("restart-btn").addEventListener("click", function () {
    stateHistory = [Game.createGame()];
    gameState = stateHistory[0];
    document.getElementById("winner-overlay").hidden = true;
    render(gameState);
});

document.getElementById("restart-btn-inline").addEventListener(
    "click",
    function () {
        stateHistory = [Game.createGame()];
        gameState = stateHistory[0];
        document.getElementById("winner-overlay").hidden = true;
        render(gameState);
    }
);

document.getElementById("undo-btn").addEventListener("click", function () {
    if (isAnimating || stateHistory.length <= 1) {
        return;
    }
    stateHistory.pop();
    gameState = stateHistory[stateHistory.length - 1];
    render(gameState);
});

// ── Initialise ───────────────────────────────────────────────────────────────
buildBoard();
render(gameState);
