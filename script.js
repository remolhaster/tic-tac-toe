/* ==========================================================================
   Neon Tic Tac Toe Logic (Customizable Setup & Synthesizer Edition)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let board = Array(9).fill('');
    let gameActive = false; // Set to false initially, activated upon launching the grid
    
    // Customizable Symbols
    let p1Symbol = localStorage.getItem('neon_ttt_p1_symbol') || 'W';
    let p2Symbol = localStorage.getItem('neon_ttt_p2_symbol') || 'M';
    let currentPlayer = p1Symbol;
    
    // Score counters
    let scores = {
        p1: parseInt(localStorage.getItem('neon_ttt_score_p1')) || 0,
        p2: parseInt(localStorage.getItem('neon_ttt_score_p2')) || 0,
        draw: parseInt(localStorage.getItem('neon_ttt_score_draw')) || 0
    };

    // --- DOM Elements ---
    // Screens
    const welcomeScreen = document.getElementById('welcome-screen');
    const loadingOverlay = document.getElementById('loading-overlay');
    const gameContainer = document.getElementById('game-container');

    // Welcome Screen elements
    const welcomeP1Char = document.getElementById('welcome-p1-char');
    const welcomeP2Char = document.getElementById('welcome-p2-char');
    const quickButtons = document.querySelectorAll('.quick-btn');
    const btnLaunchGame = document.getElementById('btn-launch-game');
    
    // Loader elements
    const loadingStatus = document.getElementById('loading-status');
    const progressBar = document.getElementById('progress-bar');

    // Game Screen elements
    const boardElement = document.getElementById('board');
    const cells = document.querySelectorAll('.cell');
    const gameStatus = document.getElementById('game-status');
    const currentPlayerText = document.getElementById('current-player-text');
    const gameSubtitle = document.getElementById('game-subtitle');
    const btnBackToMenu = document.getElementById('btn-back-to-menu');
    
    const scoreWValue = document.getElementById('score-w-value');
    const scoreMValue = document.getElementById('score-m-value');
    const scoreDrawValue = document.getElementById('score-draw-value');
    
    const btnPlayAgain = document.getElementById('btn-play-again');
    const btnReset = document.getElementById('btn-reset');
    const btnResetScores = document.getElementById('btn-reset-scores');
    
    // Modal elements
    const winModal = document.getElementById('win-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalMessage = document.getElementById('modal-message');
    const modalBtnPlayAgain = document.getElementById('modal-btn-play-again');

    const inputP1Char = document.getElementById('input-p1-char');
    const inputP2Char = document.getElementById('input-p2-char');

    // Winning index combinations
    const winningConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    // --- Audio Synthesizer Engine (Web Audio API) ---
    const SoundFX = {
        enabled: localStorage.getItem('neon_ttt_sound_enabled') !== 'false',
        supported: true,
        audioCtx: null,
        ambientOsc: null,
        ambientFilter: null,

        init() {
            if (!this.supported) return;
            if (this.audioCtx) {
                if (this.audioCtx.state === 'suspended') {
                    this.audioCtx.resume().catch(e => console.warn("AudioContext resume blocked:", e));
                }
                return;
            }
            try {
                const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtxClass) {
                    this.supported = false;
                    console.warn("Web Audio API is not supported in this browser.");
                    return;
                }
                this.audioCtx = new AudioCtxClass();
            } catch (e) {
                this.supported = false;
                console.warn("AudioContext initialization blocked/unsupported:", e);
            }
        },

        toggle() {
            this.enabled = !this.enabled;
            localStorage.setItem('neon_ttt_sound_enabled', this.enabled);
            this.updateIcons();
            
            if (this.enabled) {
                this.init();
                if (this.enabled && this.supported) {
                    // If game container is currently visible, start ambient hum
                    if (!gameContainer.classList.contains('hidden')) {
                        this.startAmbient();
                    }
                }
            } else {
                this.stopAmbient();
            }
        },

        updateIcons() {
            const btns = [
                document.getElementById('btn-sound-toggle-welcome'),
                document.getElementById('btn-sound-toggle-game')
            ];
            btns.forEach(btn => {
                if (!btn) return;
                const onIcon = btn.querySelector('.sound-icon-on');
                const offIcon = btn.querySelector('.sound-icon-off');
                const textSpan = btn.querySelector('span');

                if (this.enabled && this.supported) {
                    onIcon.classList.remove('hidden');
                    offIcon.classList.add('hidden');
                    if (textSpan) textSpan.textContent = 'Sound FX: ON';
                } else {
                    onIcon.classList.add('hidden');
                    offIcon.classList.remove('hidden');
                    if (textSpan) textSpan.textContent = 'Sound FX: OFF';
                }
            });
        },

        playTone(freqStart, freqEnd, type, duration, volume = 0.1) {
            if (!this.enabled || !this.supported) return;
            this.init();
            if (!this.audioCtx) return;
            
            try {
                const osc = this.audioCtx.createOscillator();
                const gainNode = this.audioCtx.createGain();
                
                osc.type = type;
                osc.frequency.setValueAtTime(freqStart, this.audioCtx.currentTime);
                if (freqEnd !== freqStart) {
                    osc.frequency.exponentialRampToValueAtTime(freqEnd, this.audioCtx.currentTime + duration);
                }
                
                gainNode.gain.setValueAtTime(volume, this.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + duration);
                
                osc.connect(gainNode);
                gainNode.connect(this.audioCtx.destination);
                
                osc.start();
                osc.stop(this.audioCtx.currentTime + duration);
            } catch (e) {
                console.warn("Synthesizer tone playback error:", e);
            }
        },

        playClick(isP1) {
            if (!this.enabled || !this.supported) return;
            if (isP1) {
                this.playTone(600, 1100, 'sine', 0.1, 0.08); // High neon pop
            } else {
                this.playTone(450, 850, 'sine', 0.1, 0.08); // Deeper pop
            }
        },

        playWin() {
            if (!this.enabled || !this.supported) return;
            this.init();
            if (!this.audioCtx) return;
            
            try {
                const now = this.audioCtx.currentTime;
                const playStep = (freq, time, dur) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0.08, time);
                    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(time);
                    osc.stop(time + dur);
                };

                // Ascending major arpeggio win cheer
                playStep(261.63, now, 0.15); // C4
                playStep(329.63, now + 0.1, 0.15); // E4
                playStep(392.00, now + 0.2, 0.15); // G4
                playStep(523.25, now + 0.3, 0.4); // C5
            } catch(e) {
                console.warn("Win sound playback error:", e);
            }
        },

        playDraw() {
            if (!this.enabled || !this.supported) return;
            this.init();
            if (!this.audioCtx) return;
            
            try {
                const now = this.audioCtx.currentTime;
                const playStep = (freq, time, dur) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, time);
                    osc.frequency.linearRampToValueAtTime(freq * 0.75, time + dur);
                    gain.gain.setValueAtTime(0.08, time);
                    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(time);
                    osc.stop(time + dur);
                };

                // Descending draw buzz
                playStep(220.00, now, 0.25); // A3
                playStep(164.81, now + 0.22, 0.35); // E3
            } catch (e) {
                console.warn("Draw sound playback error:", e);
            }
        },

        playLaunch() {
            if (!this.enabled || !this.supported) return;
            this.init();
            if (!this.audioCtx) return;
            
            try {
                const now = this.audioCtx.currentTime;
                
                // Beep build scale
                const scale = [220, 277, 330, 440, 554, 660, 880];
                scale.forEach((freq, idx) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                    gain.gain.setValueAtTime(0.04, now + idx * 0.12);
                    gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.25);
                    osc.connect(gain);
                    gain.connect(this.audioCtx.destination);
                    osc.start(now + idx * 0.12);
                    osc.stop(now + idx * 0.12 + 0.25);
                });
                
                // Sub-bass sweep drop
                setTimeout(() => {
                    this.playTone(1200, 100, 'sawtooth', 0.9, 0.04);
                }, 850);
            } catch (e) {
                console.warn("Launch sound playback error:", e);
            }
        },

        startAmbient() {
            if (!this.enabled || !this.supported) return;
            this.init();
            if (!this.audioCtx) return;
            this.stopAmbient(); // Clean previous loops

            try {
                this.ambientOsc = this.audioCtx.createOscillator();
                this.ambientFilter = this.audioCtx.createBiquadFilter();
                const ambientGain = this.audioCtx.createGain();

                this.ambientOsc.type = 'triangle';
                this.ambientOsc.frequency.setValueAtTime(65.41, this.audioCtx.currentTime); // C2 low hum

                this.ambientFilter.type = 'lowpass';
                this.ambientFilter.frequency.setValueAtTime(100, this.audioCtx.currentTime);
                this.ambientFilter.Q.setValueAtTime(1, this.audioCtx.currentTime);

                ambientGain.gain.setValueAtTime(0.02, this.audioCtx.currentTime);

                // Modulate filter slowly with an LFO for an organic "breathing" grid texture
                const lfo = this.audioCtx.createOscillator();
                const lfoGain = this.audioCtx.createGain();
                lfo.type = 'sine';
                lfo.frequency.setValueAtTime(0.12, this.audioCtx.currentTime); // 0.12 Hz LFO
                lfoGain.gain.setValueAtTime(25, this.audioCtx.currentTime); // +/- 25Hz filter sweep

                lfo.connect(lfoGain);
                lfoGain.connect(this.ambientFilter.frequency);

                this.ambientOsc.connect(this.ambientFilter);
                this.ambientFilter.connect(ambientGain);
                ambientGain.connect(this.audioCtx.destination);

                lfo.start();
                this.ambientOsc.start();

                this.ambientOsc.lfo = lfo;
            } catch (e) {
                console.warn("Failed to start ambient loop:", e);
            }
        },

        stopAmbient() {
            if (this.ambientOsc) {
                try {
                    this.ambientOsc.stop();
                    if (this.ambientOsc.lfo) {
                        this.ambientOsc.lfo.stop();
                    }
                } catch(e){}
                this.ambientOsc = null;
            }
        }
    };

    // Initialize sound mute display state on boot
    SoundFX.updateIcons();

    // --- Core Game Event Listeners ---
    cells.forEach(cell => {
        cell.addEventListener('click', handleCellClick);
    });

    btnPlayAgain.addEventListener('click', restartMatch);
    modalBtnPlayAgain.addEventListener('click', restartMatch);
    
    btnReset.addEventListener('click', restartMatch);
    btnResetScores.addEventListener('click', resetScores);

    // Keyboard accessibility for grid cells
    cells.forEach((cell, idx) => {
        cell.addEventListener('keydown', (e) => {
            let targetIdx = -1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                targetIdx = (idx + 1) % 9;
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                targetIdx = (idx - 1 + 9) % 9;
            }
            
            if (targetIdx !== -1) {
                cells[targetIdx].focus();
                e.preventDefault();
            }
        });
    });

    // --- Welcome Setup Page Event Handlers ---

    // Load saved setup choices
    welcomeP1Char.value = p1Symbol;
    welcomeP2Char.value = p2Symbol;

    // Synchronize active states on the quick buttons initially
    syncQuickButtonsActiveState();

    // Quick pick circular emoji button listeners
    quickButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const playerNum = btn.getAttribute('data-player');
            const symbol = btn.textContent;

            // Trigger click tone
            SoundFX.playTone(600, 600, 'sine', 0.05, 0.05);

            if (playerNum === '1') {
                if (symbol === welcomeP2Char.value.trim()) {
                    alert("Each player must choose a unique symbol!");
                    return;
                }
                welcomeP1Char.value = symbol;
            } else {
                if (symbol === welcomeP1Char.value.trim()) {
                    alert("Each player must choose a unique symbol!");
                    return;
                }
                welcomeP2Char.value = symbol;
            }

            syncQuickButtonsActiveState();
        });
    });

    // Input text field listeners
    [welcomeP1Char, welcomeP2Char].forEach((input, idx) => {
        input.addEventListener('input', () => {
            syncQuickButtonsActiveState();
        });
        
        input.addEventListener('change', () => {
            let symbol = getSanitizedInputChar(input.value, idx + 1);
            input.value = symbol;
            syncQuickButtonsActiveState();
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                input.blur();
            }
        });
    });

    // Sound toggle buttons
    document.getElementById('btn-sound-toggle-welcome').addEventListener('click', () => {
        SoundFX.toggle();
    });
    
    document.getElementById('btn-sound-toggle-game').addEventListener('click', () => {
        SoundFX.toggle();
    });

    // --- Welcome Screen Core Functions ---

    function getSanitizedInputChar(value, playerNum) {
        const chars = Array.from(value.trim());
        let symbol = chars.length > 0 ? chars[0] : (playerNum === 1 ? 'W' : 'M');
        if (symbol.match(/^[a-z]$/i)) {
            symbol = symbol.toUpperCase();
        }
        return symbol;
    }

    function syncQuickButtonsActiveState() {
        const val1 = welcomeP1Char.value.trim();
        const val2 = welcomeP2Char.value.trim();

        quickButtons.forEach(btn => {
            const playerNum = btn.getAttribute('data-player');
            const symbol = btn.textContent;

            btn.classList.remove('active');
            if (playerNum === '1' && symbol === val1) {
                btn.classList.add('active');
            } else if (playerNum === '2' && symbol === val2) {
                btn.classList.add('active');
            }
        });
    }

    // --- Transition Animation (Launch Engine) ---

    btnLaunchGame.addEventListener('click', () => {
        // Init/resume Web Audio Context (safe execution)
        SoundFX.init();
        
        // Final verification on launch
        let p1Val = getSanitizedInputChar(welcomeP1Char.value, 1);
        let p2Val = getSanitizedInputChar(welcomeP2Char.value, 2);

        if (p1Val === p2Val) {
            alert("Each player must choose a unique symbol before starting!");
            return;
        }

        // Apply to variables
        p1Symbol = p1Val;
        p2Symbol = p2Val;
        
        localStorage.setItem('neon_ttt_p1_symbol', p1Symbol);
        localStorage.setItem('neon_ttt_p2_symbol', p2Symbol);

        // Sync inputs in main game board
        inputP1Char.value = p1Symbol;
        inputP2Char.value = p2Symbol;
        updateSubtitle();

        // 1. Play synthesize launch effect
        SoundFX.playLaunch();

        // 2. Hide welcome screen & show loading portal overlay
        welcomeScreen.classList.add('hidden');
        loadingOverlay.classList.remove('hidden');

        // 3. Run progress loading simulation
        let progress = 0;
        progressBar.style.width = '0%';
        
        const loadingTexts = [
            { limit: 25, text: "Booting grid matrix..." },
            { limit: 55, text: "Charging neon engine..." },
            { limit: 80, text: "Calibrating particle effects..." },
            { limit: 100, text: "System ready!" }
        ];

        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 8) + 3; // incremental jumps
            if (progress > 100) progress = 100;

            progressBar.style.width = `${progress}%`;
            
            // Update textual status messages
            const currentStatus = loadingTexts.find(t => progress <= t.limit);
            if (currentStatus) {
                loadingStatus.textContent = currentStatus.text;
            }

            if (progress === 100) {
                clearInterval(interval);
                
                // Complete loader fadeout
                setTimeout(() => {
                    loadingOverlay.style.opacity = '0';
                    
                    // Transition to main game card
                    setTimeout(() => {
                        loadingOverlay.classList.add('hidden');
                        loadingOverlay.style.opacity = '1'; // Reset opacity state
                        gameContainer.classList.remove('hidden');
                        
                        // Activate game ambient synthesizer loop
                        SoundFX.startAmbient();
                        
                        // Restart match elements
                        restartMatch();
                    }, 400);
                }, 400);
            }
        }, 80);
    });

    // --- Back to Main Menu ---
    btnBackToMenu.addEventListener('click', () => {
        // Trigger click tone
        SoundFX.playTone(500, 300, 'sine', 0.15, 0.08);

        // Stop ambient hum
        SoundFX.stopAmbient();

        // Hide game board and show welcome setup screen
        gameContainer.classList.add('hidden');
        welcomeScreen.classList.remove('hidden');
        gameActive = false;

        // Reset welcome inputs with current symbols
        welcomeP1Char.value = p1Symbol;
        welcomeP2Char.value = p2Symbol;
        syncQuickButtonsActiveState();
    });

    // --- Initialize Scoreboard Inputs on Page Load ---
    function initializeConfigInputs() {
        inputP1Char.value = p1Symbol;
        inputP2Char.value = p2Symbol;

        inputP1Char.addEventListener('change', (e) => handleInlineSymbolChange(1, e.target.value));
        inputP2Char.addEventListener('change', (e) => handleInlineSymbolChange(2, e.target.value));
        
        // Prevent typing enter key in symbol input submitting or resetting anything
        [inputP1Char, inputP2Char].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
        });
    }

    // --- Core Game Grid Logic ---

    function handleInlineSymbolChange(playerNum, value) {
        let symbol = getSanitizedInputChar(value, playerNum);
        
        if (playerNum === 1) {
            if (symbol === p2Symbol) {
                alert("Each player must choose a unique symbol!");
                inputP1Char.value = p1Symbol;
                return;
            }
            p1Symbol = symbol;
            localStorage.setItem('neon_ttt_p1_symbol', symbol);
            inputP1Char.value = symbol;
        } else {
            if (symbol === p1Symbol) {
                alert("Each player must choose a unique symbol!");
                inputP2Char.value = p2Symbol;
                return;
            }
            p2Symbol = symbol;
            localStorage.setItem('neon_ttt_p2_symbol', symbol);
            inputP2Char.value = symbol;
        }

        updateSubtitle();
        restartMatch();
    }

    function updateSubtitle() {
        gameSubtitle.textContent = `${p1Symbol} vs ${p2Symbol} Edition`;
    }

    /**
     * Handles clicking on a board cell
     */
    function handleCellClick(event) {
        const clickedCell = event.target;
        const clickedIndex = parseInt(clickedCell.getAttribute('data-index'));

        // Guard: Cell already played or game is inactive
        if (board[clickedIndex] !== '' || !gameActive) {
            return;
        }

        // Play click synth tone (high pitch for P1, lower for P2)
        SoundFX.playClick(currentPlayer === p1Symbol);

        // Apply Move
        board[clickedIndex] = currentPlayer;
        
        // Add styling class and text content
        clickedCell.textContent = currentPlayer;
        clickedCell.classList.add(currentPlayer === p1Symbol ? 'w-marker' : 'm-marker');
        clickedCell.setAttribute('aria-label', `Cell ${clickedIndex + 1}, player ${currentPlayer}`);

        // Evaluate state
        checkResult();
    }

    /**
     * Checks if the current state results in a Win or Draw
     */
    function checkResult() {
        let roundWon = false;
        let winningCombo = null;

        for (let i = 0; i < winningConditions.length; i++) {
            const [a, b, c] = winningConditions[i];
            if (board[a] === '' || board[b] === '' || board[c] === '') {
                continue;
            }
            if (board[a] === board[b] && board[b] === board[c]) {
                roundWon = true;
                winningCombo = winningConditions[i];
                break;
            }
        }

        if (roundWon) {
            handleWin(winningCombo);
            return;
        }

        const roundDraw = !board.includes('');
        if (roundDraw) {
            handleDraw();
            return;
        }

        // Switch turns
        switchTurn();
    }

    /**
     * Switch current player turn
     */
    function switchTurn() {
        currentPlayer = currentPlayer === p1Symbol ? p2Symbol : p1Symbol;
        updateTurnIndicator();
    }

    /**
     * Updates visual status of turn text and sets CSS properties for hover previews
     */
    function updateTurnIndicator() {
        gameStatus.className = 'game-status';
        
        if (currentPlayer === p1Symbol) {
            gameStatus.classList.add('player-w-turn');
            currentPlayerText.textContent = `Player ${p1Symbol}`;
            
            boardElement.style.setProperty('--current-player-symbol', `"${p1Symbol}"`);
            boardElement.style.setProperty('--current-player-color', 'var(--color-w)');
        } else {
            gameStatus.classList.add('player-m-turn');
            currentPlayerText.textContent = `Player ${p2Symbol}`;
            
            boardElement.style.setProperty('--current-player-symbol', `"${p2Symbol}"`);
            boardElement.style.setProperty('--current-player-color', 'var(--color-m)');
        }
    }

    /**
     * Handles winning sequence
     */
    function handleWin(winningCombo) {
        gameActive = false;
        
        // Play victory arpeggio
        SoundFX.playWin();

        // Highlight winning cells
        winningCombo.forEach(index => {
            cells[index].classList.add('winning-cell');
        });

        // Add overall game-over styling to board
        boardElement.classList.add('game-over');

        // Update scores
        if (currentPlayer === p1Symbol) {
            scores.p1++;
            localStorage.setItem('neon_ttt_score_p1', scores.p1);
        } else {
            scores.p2++;
            localStorage.setItem('neon_ttt_score_p2', scores.p2);
        }

        // Update UI
        updateScoreBoardDisplay();
        btnPlayAgain.removeAttribute('disabled');

        // Trigger victory effects after a small delay
        setTimeout(() => {
            openModal(true);
            triggerConfettiExplosion();
        }, 800);
    }

    /**
     * Handles draw sequence
     */
    function handleDraw() {
        gameActive = false;
        
        // Play sad buzzer audio
        SoundFX.playDraw();

        // Trigger screen-shake animation
        boardElement.classList.add('shake', 'game-over');
        setTimeout(() => {
            boardElement.classList.remove('shake');
        }, 500);

        // Update scores
        scores.draw++;
        localStorage.setItem('neon_ttt_score_draw', scores.draw);

        // Update UI
        updateScoreBoardDisplay();
        btnPlayAgain.removeAttribute('disabled');

        // Open modal after small delay
        setTimeout(() => {
            openModal(false);
        }, 800);
    }

    /**
     * Updates the text displays in the scoreboard
     */
    function updateScoreBoardDisplay() {
        scoreWValue.textContent = scores.p1;
        scoreMValue.textContent = scores.p2;
        scoreDrawValue.textContent = scores.draw;
    }

    /**
     * Clears board grid cells and resets status state
     */
    function restartMatch() {
        board = Array(9).fill('');
        currentPlayer = p1Symbol; // Player 1 starts
        gameActive = true;

        // Reset UI Elements
        boardElement.className = 'board';
        cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
            cell.removeAttribute('style');
            cell.setAttribute('aria-label', `Cell ${parseInt(cell.getAttribute('data-index')) + 1}, empty`);
        });

        // Reset indicators
        updateTurnIndicator();
        btnPlayAgain.setAttribute('disabled', 'true');
        closeModal();
    }

    /**
     * Resets local score storage and updates displays
     */
    function resetScores() {
        // Synthesizer trigger
        SoundFX.playTone(300, 150, 'sawtooth', 0.25, 0.08);

        scores = { p1: 0, p2: 0, draw: 0 };
        localStorage.setItem('neon_ttt_score_p1', 0);
        localStorage.setItem('neon_ttt_score_p2', 0);
        localStorage.setItem('neon_ttt_score_draw', 0);
        updateScoreBoardDisplay();
        restartMatch();
    }

    // --- Modal Controls ---
    
    function openModal(isWin) {
        winModal.className = 'modal';
        
        if (isWin) {
            const winnerName = currentPlayer === p1Symbol ? `Player ${p1Symbol}` : `Player ${p2Symbol}`;
            const winnerClass = currentPlayer === p1Symbol ? 'win-w' : 'win-m';
            const winnerColor = currentPlayer === p1Symbol ? 'var(--color-w)' : 'var(--color-m)';
            const winnerGlow = currentPlayer === p1Symbol ? 'var(--shadow-w)' : 'var(--shadow-m)';
            
            winModal.classList.add('active', winnerClass);
            modalTitle.textContent = 'VICTORY!';
            modalMessage.innerHTML = `<span style="font-weight: 800; color: ${winnerColor}; text-shadow: ${winnerGlow}">${winnerName}</span> wins the match!`;
        } else {
            winModal.classList.add('active', 'win-draw');
            modalTitle.textContent = 'DRAW!';
            modalMessage.textContent = 'A balanced clash. No victor this time!';
        }
        
        winModal.setAttribute('aria-hidden', 'false');
    }

    function closeModal() {
        winModal.classList.remove('active');
        winModal.setAttribute('aria-hidden', 'true');
    }

    // --- Neon Particle Confetti Generator ---

    function triggerConfettiExplosion() {
        const colors = [
            '#00f0ff', // Neon Cyan
            '#ff007f', // Neon Magenta
            '#8b24ec', // Neon Purple
            '#ffffff', // Glow White
            '#b538ff'  // Lighter Violet
        ];
        
        const particleCount = 80;
        const container = document.body;

        createBurst(window.innerWidth / 2, window.innerHeight * 0.45);
        
        setTimeout(() => {
            createStream(0, window.innerHeight, 45); 
            createStream(window.innerWidth, window.innerHeight, 135); 
        }, 200);

        function createBurst(x, y) {
            for (let i = 0; i < particleCount; i++) {
                const particle = document.createElement('div');
                particle.className = 'confetti-particle';
                
                const size = Math.random() * 8 + 4;
                particle.style.width = `${size}px`;
                particle.style.height = `${size}px`;
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                particle.style.borderRadius = Math.random() > 0.4 ? '50%' : '2px';
                
                particle.style.boxShadow = `0 0 ${size}px ${particle.style.backgroundColor}`;
                particle.style.left = `${x}px`;
                particle.style.top = `${y}px`;
                
                container.appendChild(particle);

                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 180 + 80;
                const destX = Math.cos(angle) * distance;
                const destY = Math.sin(angle) * distance + 100;

                particle.animate([
                    { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
                    { transform: `translate(${destX}px, ${destY}px) rotate(${Math.random() * 360 + 360}deg) scale(0)`, opacity: 0 }
                ], {
                    duration: Math.random() * 1200 + 800,
                    easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)',
                    fill: 'forwards'
                }).onfinish = () => particle.remove();
            }
        }

        function createStream(x, y, baseAngleDeg) {
            const streamCount = 25;
            for (let i = 0; i < streamCount; i++) {
                setTimeout(() => {
                    const particle = document.createElement('div');
                    particle.className = 'confetti-particle';
                    
                    const size = Math.random() * 6 + 4;
                    particle.style.width = `${size}px`;
                    particle.style.height = `${size}px`;
                    particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                    particle.style.borderRadius = '50%';
                    particle.style.boxShadow = `0 0 ${size}px ${particle.style.backgroundColor}`;
                    particle.style.left = `${x}px`;
                    particle.style.top = `${y}px`;
                    
                    container.appendChild(particle);

                    const spread = (Math.random() - 0.5) * 30; 
                    const angleRad = (baseAngleDeg + spread) * Math.PI / 180;
                    const force = Math.random() * 300 + 350;
                    
                    const destX = Math.cos(angleRad) * force;
                    const destY = -Math.sin(angleRad) * force + 300; 

                    particle.animate([
                        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                        { transform: `translate(${destX}px, ${destY}px) scale(0.2)`, opacity: 0 }
                    ], {
                        duration: Math.random() * 1500 + 1500,
                        easing: 'cubic-bezier(0.05, 0.9, 0.2, 1)',
                        fill: 'forwards'
                    }).onfinish = () => particle.remove();
                }, i * 40);
            }
        }
    }

    // --- Start Initializations ---
    initializeConfigInputs();
    updateScoreBoardDisplay();
    updateTurnIndicator();
    updateSubtitle();
});
