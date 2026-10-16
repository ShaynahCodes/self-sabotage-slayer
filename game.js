        // --- SOUND EFFECTS ---
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playTone = (freq, type, duration, vol = 0.1) => {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(vol, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        };

        const sfx = {
            click: () => playTone(800, 'sine', 0.1, 0.05),
            hit: () => { playTone(150, 'sawtooth', 0.1, 0.1); },
            crit: () => { playTone(400, 'square', 0.2, 0.1); },
            heal: () => { playTone(600, 'sine', 0.3, 0.05); },
            error: () => playTone(100, 'sawtooth', 0.2, 0.1),
            miss: () => playTone(150, 'sawtooth', 0.15, 0.1), 
            dodge: () => playTone(800, 'sine', 0.1, 0.05), 
            warning: () => { [300, 200].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.15, 0.08), i * 150)); },
            win: () => { [440, 554, 659].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.3, 0.05), i * 100)); },
            superWin: () => { 
                [440, 554, 659, 880, 1047, 1319].forEach((f, i) => setTimeout(() => playTone(f, 'square', 0.4, 0.08), i * 120)); 
            }
        };

        // --- Flavor Text Arrays ---
        const flavorText = {
            execute: [
                "The math is mathing today.", "Bag secured.", "You understood the assignment.",
                "Perfect timing. No hesitation.", "Patience pays.", "Setup identified. Trigger pulled.",
                "Rules followed. Edge playing out.", "Discipline wins. Flawless victory.", "You stuck to the plan.",
                "Logic over emotion.", "Another day, another dollar.", "Rinse and repeat.", "Making it look easy."
            ],
            breathe: [
                "Mental reset.", "Deep breath taken.", "Pulse checked. Calm restored.",
                "Stepped back from the screen.", "Nerves settled."
            ],
            wait: [
                "Stalking the perfect entry...", "Letting the market come to you.",
                "Patience is an edge.", "Sitting on hands. Waiting.", "Ignoring the noise. Focusing."
            ],
            auditHit: [
                "Insight Found! CRITICAL.", "Pattern recognized!", "Lightbulb moment!",
                "Data connection made!", "Lesson learned instantly."
            ],
            auditMiss: [
                "You got the bag and fumbled it.", "Started from the bottom... still there.", "Weak analysis.",
                "It was all a dream.", "Don't go chasing waterfalls.", "Swing and a miss."
            ]
        };

        // --- Configuration & State ---
        let gameState = {
            player: { maxHp: 150, hp: 150, isCharged: false, waitCooldown: 0, resetCooldown: 0 },
            level: 0,
            isPlayerTurn: true,
            isGameOver: false,
            currentBoss: null,
            modalAction: null,
            upgrades: {}, // Acquired upgrades for this run
            availableUpgrades: [] // Upgrades not yet offered
        };

        // --- UPGRADE DEFINITIONS ---
        const allUpgrades = [
            { id: 'ironMind', name: 'Iron Mind', icon: 'ph-shield', color: 'text-blue-400', desc: '+20% Max Mental Equity', effect: 'Increases your Max Mental Equity (HP) by 20%.' },
            { id: 'sniperVision', name: 'Sniper Vision', icon: 'ph-target', color: 'text-gold', desc: 'SNIPE: 30% → 40% success', effect: 'Increases the success rate of SNIPE from 30% to 40%.' },
            { id: 'boxBreathing', name: 'Box Breathing', icon: 'ph-wind', color: 'text-emerald-400', desc: 'RESET: +5 extra heal', effect: 'RESET heals for +5 extra HP every time you use it.' },
            { id: 'tightStops', name: 'Tight Stops', icon: 'ph-prohibit', color: 'text-cyan-400', desc: 'Dodge: 5% → 10%', effect: 'Increases your chance to DODGE an attack from 5% to 10%.' },
            { id: 'diamondHands', name: 'Diamond Hands', icon: 'ph-diamond', color: 'text-purple-400', desc: '2x Damage below 25 HP', effect: 'If your Mental Equity drops below 25 HP, all attacks deal Double Damage.' },
            { id: 'institutionalBacking', name: 'Institutional Backing', icon: 'ph-bank', color: 'text-indigo-400', desc: 'Boss damage -15%', effect: 'Every Boss attack deals 15% less damage to you.' }
        ];

        // --- BOSS DATA (FINAL ORDER + NEW ATTACKS) ---
        const bosses = [
            // 1. Comfort Zone King
            { 
                name: "Comfort Zone King", icon: "ph-armchair", color: "text-blue-400", barColor: "bg-blue-500", maxHp: 60, hp: 60, 
                intro: "A clean setup begins forming... subtle, demanding, and only visible to those willing to look twice. The King mutters: “Effort? Here? Not in my kingdom.”", 
                defeatMsg: "Growth beats comfort. The King retreats to his palace of excuses.", 
                attacks: [
                    { name: "Lazy Loop", dmg: 12, text: "Repeated the same excuse like a mantra." },
                    { name: "Procrastination", dmg: 14, text: "‘I’ll do it later’ struck at full force." },
                    { name: "Excuse", dmg: 16, text: "Invented a new excuse on the spot." },
                    { name: "Couch", dmg: 17, text: "Comfort over courage. Again." },
                    { name: "YouTube", dmg: 13, text: "Watched YouTube instead of the chart." },
                    { name: "Paper Hands", dmg: 15, text: "Took profit for 5 dollars. It ran for $500." },
                    { name: "Min Effort", dmg: 13, text: "You did the least and paid the price." },
                    { name: "Old Habits", dmg: 15, text: "Same old habits. Same old losses." },
                    { name: "Comfy", dmg: 12, text: "Tried to be comfy in a market that needs you sharp." },
                    { name: "99 Tabs", dmg: 14, text: "You got 99 tabs but a chart ain't one." },
                    { name: "Humble", dmg: 12, text: "You chose to sit down and be humble… again." },
                    { name: "Nap", dmg: 13, text: "You ain't a trader, you just nap a lot." }
                ] 
            },
            // 2. Paralysis Golem
            { 
                name: "Paralysis Golem", icon: "ph-lock-key", color: "text-stone-400", barColor: "bg-stone-500", maxHp: 100, hp: 100, 
                intro: "Your analysis loops for the fifth time, every new detail undoing the last thing you thought you understood. The Golem echoes: “You aren’t looking for certainty. You’re looking for a way to stall.”", 
                defeatMsg: "You acted with clarity. The Golem crumbles to dust.", 
                attacks: [
                    { name: "Checklist", dmg: 15, text: "Reviewed your rules five times. Missed entry." },
                    { name: "Fear", dmg: 17, text: "Scared of being wrong. Did nothing." },
                    { name: "Perfect", dmg: 19, text: "Waited for perfection. Missed the move entirely." },
                    { name: "Conflict", dmg: 16, text: "One indicator said up. Another said down. You froze." },
                    { name: "Lock", dmg: 13, text: "Couldn’t execute even though everything aligned." },
                    { name: "Sudoku", dmg: 14, text: "Chart looked like a puzzle with missing pieces." },
                    { name: "Calc", dmg: 13, text: "Risk calculator got more action than your trade button." },
                    { name: "Guess", dmg: 19, text: "Canceled a good order at the last second." },
                    { name: "Side Quest", dmg: 14, text: "Got lost overanalyzing side details." },
                    { name: "Reintro", dmg: 13, text: "You said 'Allow me to reintroduce myself' and then did nothing else." },
                    { name: "Million", dmg: 15, text: "The setup appeared and you froze as if Sub-Zero attacked you." },
                    { name: "Late", dmg: 17, text: "If you're reading this, you're too late." }
                ] 
            },
            // 3. FOMO Phantom
            { 
                name: "FOMO Phantom", icon: "ph-ghost", color: "text-indigo-400", barColor: "bg-indigo-500", maxHp: 100, hp: 100, 
                intro: "Price races ahead without looking back, leaving you breathless on the sidelines. The Phantom whispers: “Come chase me. It’s the only thing you’re good at.”", 
                defeatMsg: "You ignored the hype. The Phantom fades.", 
                attacks: [
                    { name: "Late Long", dmg: 17, text: "Saw a breakout. Entered at the wick top." },
                    { name: "Top Tick", dmg: 19, text: "You bought the exact high. Again." },
                    { name: "Missed", dmg: 14, text: "Entered from fear of being left behind." },
                    { name: "Bluff", dmg: 17, text: "Fake breakout. Real pain." },
                    { name: "Green", dmg: 21, text: "Entered because the candle was ‘big’." },
                    { name: "Parrot", dmg: 15, text: "Heard ‘it’s pumping’ and repeated it like a parrot." },
                    { name: "Hype", dmg: 19, text: "Caught bullish fever from a stranger’s screenshot." },
                    { name: "You Up?", dmg: 16, text: "Slid into the market at the worst possible time." },
                    { name: "Avengers", dmg: 17, text: "Entered because everyone else was entering." },
                    { name: "Pokemon", dmg: 15, text: "Saw a candle and yelled ‘I choose you!’ at the worst time." },
                    { name: "Stranger", dmg: 16, text: "Followed a setup from the upside-down." },
                    { name: "Spider", dmg: 14, text: "Your ‘intuition’ tingled. It lied." }
                ] 
            },
            // 4. Doomscroll Demon
            { 
                name: "Doomscroll Demon", icon: "ph-scroll", color: "text-orange-400", barColor: "bg-orange-500", maxHp: 120, hp: 120, 
                intro: "Your phone glows like a cursed artifact you can’t stop touching. The Demon laughs: “Your focus is mine. Your session is over.”", 
                defeatMsg: "You reclaimed your attention. The Demon disappears like deleted data.", 
                attacks: [
                    { name: "Reel", dmg: 18, text: "You got distracted by a cat video mid-trade." },
                    { name: "Algo", dmg: 20, text: "Your feed fed you nonsense. You ate it up." },
                    { name: "Scam", dmg: 22, text: "Followed someone else’s ‘perfect trade’. It wasn’t." },
                    { name: "Scooby", dmg: 17, text: "You chased a setup the way monsters chase Scooby and the gang." },
                    { name: "Loki", dmg: 20, text: "You let the algorithm manipulate you like Loki whispering in your ear." },
                    { name: "Buzz", dmg: 15, text: "Phone won't stop buzzing. Focus lost." },
                    { name: "Collapse", dmg: 24, text: "Read thread on economic collapse. Panicked." },
                    { name: "Thief", dmg: 22, text: "Comparison is the thief of joy. Lost confidence." },
                    { name: "Flex", dmg: 20, text: "Saw someone flexing profits. You clicked instantly." },
                    { name: "Theory", dmg: 19, text: "You opened your phone for news and ended up reading conspiracy theories." },
                    { name: "Cat", dmg: 15, text: "You looked for clarity. You found cat videos." },
                    { name: "Wander", dmg: 17, text: "Your mind wandered. And never returned." }
                ] 
            },
            // 5. Revenge Raptor
            { 
                name: "Revenge Raptor", icon: "ph-lightning", color: "text-red-500", barColor: "bg-red-500", maxHp: 140, hp: 140, 
                intro: "Drawdown tightens its grip, fueled by your frustration. The Raptor snarls: “Oh look… you’re emotional. My favorite flavor.”", 
                defeatMsg: "Your discipline outpaced its rage. The Raptor retreats.", 
                attacks: [
                    { name: "Cry", dmg: 19, text: "You entered just to feel something." },
                    { name: "Martingale", dmg: 27, text: "Kept doubling down on a loser." },
                    { name: "Stubborn", dmg: 22, text: "Held a bad trade because you ‘refused’ to lose." },
                    { name: "Salty", dmg: 18, text: "Entered out of pure saltiness." },
                    { name: "Spite", dmg: 22, text: "Clicked buy just to prove a point to nobody." },
                    { name: "Show You", dmg: 20, text: "Tried to out-trade the market out of spite. It laughed." },
                    { name: "YOLO", dmg: 24, text: "Entered because you were ‘in your feelings’." },
                    { name: "Sith", dmg: 26, text: "Gave in to the dark side. Took a revenge trade." },
                    { name: "Mortal", dmg: 24, text: "‘Finish Him!’ you said, but the market finished you." },
                    { name: "Wick", dmg: 22, text: "You went on a rampage after one loss like John Wick." },
                    { name: "Size Up", dmg: 27, text: "Doubled size to recover. Failed." },
                    { name: "Oops", dmg: 16, text: "Oops. You did it again." }
                ] 
            },
            // 6. Heartbreak Hedger
            { 
                name: "Heartbreak Hedger", icon: "ph-heart-break", color: "text-pink-400", barColor: "bg-pink-500", maxHp: 160, hp: 160, 
                intro: "Price dips again, but you cling to the fantasy that it’ll turn around if you “just give it time.” The Hedger croaks: “It’s not coming back… but you can’t walk away, can you?”", 
                defeatMsg: "You traded with clarity, not emotion. The Hedger melts into tears and smoke.", 
                attacks: [
                    { name: "Sad Song", dmg: 20, text: "Your playlist sabotaged your psychology." },
                    { name: "Romantic", dmg: 23, text: "A candle reminded you of them. You fumbled." },
                    { name: "Breakup", dmg: 26, text: "Traded like you were trying to hurt someone's feelings." },
                    { name: "Tear", dmg: 19, text: "You clicked buy with watery eyes." },
                    { name: "Lonely", dmg: 28, text: "Sized up like you had nothing left to lose." },
                    { name: "Emotional", dmg: 24, text: "Led with your heart. Lost with your account." },
                    { name: "No Closure", dmg: 20, text: "No closure? No profits either." },
                    { name: "Sloppy", dmg: 19, text: "Music got too deep. Execution got too sloppy." },
                    { name: "Titanic", dmg: 27, text: "You held a loser like Jack held onto Rose in Titanic." },
                    { name: "Drama", dmg: 20, text: "Brought personal drama to the charts." },
                    { name: "Broken", dmg: 21, text: "Heart's been broke so many times you don't know what to believe." },
                    { name: "Save", dmg: 18, text: "Save your tears for another trade." }
                ] 
            },
            // 7. Clarity Crusher
            { 
                name: "Clarity Crusher", icon: "ph-cloud-fog", color: "text-gray-400", barColor: "bg-gray-500", maxHp: 180, hp: 180, 
                intro: "Your eyes bounce between timeframes, drowning in possibilities until none of them make sense anymore. The Crusher cackles: “The truth is there… I just enjoy burying it.”", 
                defeatMsg: "You cleared your chart and your mind. The Crusher dissolves.", 
                attacks: [
                    { name: "Mist", dmg: 23, text: "Brain turned to mist mid-analysis." },
                    { name: "Maze", dmg: 23, text: "Got lost in your own head again." },
                    { name: "Soup", dmg: 20, text: "Too many signals, none made sense." },
                    { name: "Context", dmg: 26, text: "Everything made sense until it didn’t." },
                    { name: "Hoarders", dmg: 19, text: "Your chart looked as messy as a Hoarders episode." },
                    { name: "Thanos", dmg: 28, text: "Your clarity vanished as if Thanos snapped it away." },
                    { name: "Bias", dmg: 23, text: "You can’t see clearly now, your bias is gone." },
                    { name: "Tricks", dmg: 20, text: "Your mind's playin tricks on you." },
                    { name: "Zoom", dmg: 19, text: "You zoomed in, zoomed out, and still saw nothing." },
                    { name: "Entertain", dmg: 19, text: "You’re confused. The chart is confused. I’m entertained." },
                    { name: "Banana", dmg: 23, text: "Your clarity slipped on a banana peel." },
                    { name: "Vibes", dmg: 25, text: "You looked for direction and found vibes." }
                ] 
            },
            // 8. Volatility Viper
            { 
                name: "Volatility Viper", icon: "ph-wave-sine", color: "text-teal-400", barColor: "bg-teal-500", maxHp: 200, hp: 200, 
                intro: "The spread opens violently, ripping space between bid and ask like a wound in the chart. The Viper hisses: “Every smart trader is waiting… so of course you’re here.”", 
                defeatMsg: "Your steady mindset tames the chaos. The Viper recoils.", 
                attacks: [
                    { name: "Fakeout", dmg: 26, text: "A classic ‘looks good’ candle betrayed you instantly." },
                    { name: "NFP", dmg: 32, text: "A news spike demolished your plan." },
                    { name: "Breakpoint", dmg: 26, text: "Price tapped your stop and ran away laughing." },
                    { name: "GOT", dmg: 28, text: "The chart hit you with a plot twist straight out of Game of Thrones." },
                    { name: "Half", dmg: 23, text: "They had you in the first half, not gonna lie." },
                    { name: "Jumanji", dmg: 31, text: "You got hit with more chaos than a Jumanji board game turn." },
                    { name: "Surprise", dmg: 25, text: "Got hit with a news spike from an event you didn’t check." },
                    { name: "Blink", dmg: 26, text: "Price reversed faster than you can blink." },
                    { name: "Lawn", dmg: 28, text: "The market folded you like a cheap lawn chair." },
                    { name: "UNO", dmg: 33, text: "Market pulled out an UNO reverse card." },
                    { name: "In Out", dmg: 23, text: "You keep on falling… in and out… of profit." },
                    { name: "Loyal", dmg: 21, text: "These candles ain't loyal." }
                ] 
            },
            // 9. Greed Goblin
            { 
                name: "Greed Goblin", icon: "ph-hand-coins", color: "text-yellow-400", barColor: "bg-yellow-500", maxHp: 230, hp: 230, 
                intro: "The chart offers you clean profits, but the promise of more pulls at your instincts. The Goblin leans in: “One more pip, right? Don’t worry, I’ll take everything.”", 
                defeatMsg: "You stopped chasing more. The Goblin starved and collapsed.", 
                attacks: [
                    { name: "Target", dmg: 28, text: "Moved your take profit further. Lost everything." },
                    { name: "Hopium", dmg: 34, text: "Held a winner until it was a loser." },
                    { name: "Flip", dmg: 33, text: "Dreamed of millions. Ignored exit signal." },
                    { name: "Tunnel", dmg: 28, text: "Forgot risk management. Saw only dollar signs." },
                    { name: "Decoy", dmg: 26, text: "Ignored signs of reversal while dreaming big." },
                    { name: "Bag", dmg: 31, text: "Held like it was a family heirloom. Price reversed." },
                    { name: "Tax", dmg: 28, text: "Market charged you for daydreaming." },
                    { name: "Delusion", dmg: 34, text: "Imagined your future house mid-trade." },
                    { name: "Goblet", dmg: 26, text: "Took another sip of ‘just a little more’." },
                    { name: "Mirage", dmg: 28, text: "Thought you had a runner. Had a rug pull." },
                    { name: "Dragon", dmg: 33, text: "Held like you were charging a Spirit Bomb." },
                    { name: "Chill", dmg: 41, text: "Sweatpants, hair tied, chilling with no stop-loss." }
                ] 
            },
            // 10. Pride Pharaoh
            { 
                name: "Pride Pharaoh", icon: "ph-crown", color: "text-purple-400", barColor: "bg-purple-500", maxHp: 260, hp: 260, 
                intro: "Market structure reshapes like shifting sands, challenging everything you believe in.. The Pharaoh commands: “Defend your ego… to the death.”", 
                defeatMsg: "Humility prevails. The Pride Pharaoh returns to the sand.", 
                attacks: [
                    { name: "Rewrite", dmg: 36, text: "Changed your rules mid-trade to justify staying in." },
                    { name: "Prove", dmg: 42, text: "Held to ‘show the market’. It crushed you." },
                    { name: "Battle", dmg: 33, text: "You argued with price. Price won." },
                    { name: "Batman", dmg: 31, text: "Prepared for everything except the actual move." },
                    { name: "Walter", dmg: 36, text: "You were sure you were right. You weren’t." },
                    { name: "False", dmg: 33, text: "Held loser because ‘it will come back’." },
                    { name: "Main Char", dmg: 39, text: "Thought the chart revolved around you." },
                    { name: "Bully", dmg: 29, text: "Tried to intimidate the market with confidence." },
                    { name: "Sticky", dmg: 27, text: "Stuck to your bias like super glue." },
                    { name: "Light", dmg: 34, text: "Convinced yourself you were the smartest one here." },
                    { name: "Saiyan", dmg: 36, text: "Powered up your ego, not your accuracy." },
                    { name: "Played", dmg: 39, text: "Congratulations. You played yourself." }
                ] 
            },
            // 11. Account Assassin
            { 
                name: "Account Assassin", icon: "ph-crosshair", color: "text-red-600", barColor: "bg-red-700", maxHp: 350, hp: 350, 
                intro: "A cold wind cuts through your confidence, announcing the presence of the nightmare waiting behind every bad trading decision. The Assassin taps his blade: “The bosses before me let you live. I hold no such mercy.”", 
                defeatMsg: "You mastered every weakness. The Assassin falls and your account lives!", 
                attacks: [
                    { name: "Sniped", dmg: 38, text: "Your stop-loss got hunted like fresh prey." },
                    { name: "Mauling", dmg: 52, text: "The broker ate your whole livelihood." },
                    { name: "Drawdown", dmg: 58, text: "Went from fine to funeral in 30 seconds." },
                    { name: "Hopeium", dmg: 45, text: "Held a loser until it became a life lesson." },
                    { name: "Ruination", dmg: 49, text: "You believed… the market didn’t." },
                    { name: "Ender", dmg: 60, text: "A move so disrespectful it should be illegal." },
                    { name: "Massacre", dmg: 60, text: "Broker showed no mercy." },
                    { name: "Equity", dmg: 54, text: "Your equity said its final words." },
                    { name: "Burial", dmg: 58, text: "Your account didn’t make it home." },
                    { name: "Ignored", dmg: 52, text: "Ignored the plan. Paid the price." },
                    { name: "Losses", dmg: 30, text: "How many losses you got? A lot." },
                    { name: "Power", dmg: 60, text: "No one trade should have all that power." }
                ] 
            }
        ];

        // --- Fullscreen Fit Mode ---
        let isFullscreenFit = false;
        
        function toggleFullscreenFit() {
            const gameUI = document.getElementById('game-ui');
            const startScreen = document.getElementById('start-screen');
            const startPanel = startScreen ? startScreen.querySelector('.glass-panel') : null;
            const icon = document.getElementById('fullscreen-icon');
            isFullscreenFit = !isFullscreenFit;
            
            if (isFullscreenFit) {
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                
                // Scale game UI
                const gameHeight = gameUI.scrollHeight;
                const gameWidth = gameUI.offsetWidth;
                const scaleY = (viewportHeight - 32) / gameHeight;
                const scaleX = (viewportWidth - 32) / gameWidth;
                const scale = Math.min(scaleY, scaleX, 1.5);
                
                gameUI.style.transform = `scale(${scale})`;
                gameUI.style.height = `${gameHeight}px`;
                gameUI.classList.add('fullscreen-fit');
                
                // Also scale start screen panel if visible
                if (startPanel && startScreen.style.display !== 'none') {
                    const panelHeight = startPanel.scrollHeight;
                    const panelWidth = startPanel.offsetWidth;
                    const panelScaleY = (viewportHeight - 48) / panelHeight;
                    const panelScaleX = (viewportWidth - 48) / panelWidth;
                    const panelScale = Math.min(panelScaleY, panelScaleX, 1.5);
                    startPanel.style.transform = `scale(${panelScale})`;
                    startPanel.style.transformOrigin = 'center center';
                }
                
                icon.className = 'ph ph-arrows-in text-xl';
            } else {
                gameUI.style.transform = '';
                gameUI.style.height = '';
                gameUI.classList.remove('fullscreen-fit');
                
                // Reset start screen panel
                if (startPanel) {
                    startPanel.style.transform = '';
                }
                
                icon.className = 'ph ph-arrows-out text-xl';
            }
        }
        
        // Recalculate on resize if in fullscreen mode
        window.addEventListener('resize', () => {
            if (isFullscreenFit) {
                isFullscreenFit = false;
                toggleFullscreenFit();
            }
        });

        // --- Core Functions ---
        function init() {
            // SAFE RESET
            gameState.player = { maxHp: 150, hp: 150, isCharged: false, waitCooldown: 0, resetCooldown: 0 };
            gameState.level = 0;
            gameState.isGameOver = false;
            
            // Reset toolbelt (1 of each per run)
            gameState.tools = {
                volatilityStop: true,
                mentorCall: true,
                newsFilter: true
            };
            gameState.volatilityTurns = 0; // Tracks remaining turns of damage reduction
            gameState.bossStunnedTurns = 0; // Tracks remaining turns boss is stunned
            gameState.lastMarketEffect = null; // Reset market tracking
            gameState.upgrades = {}; // Reset acquired upgrades
            gameState.availableUpgrades = [...allUpgrades]; // Reset available upgrades pool
            
            updateToolbeltUI();
            
            hideModal();
            loadLevel();
            updatePlayerUI();
            
            // INTRO LOGIC (EXACT AS REQUESTED)
            const logBox = document.getElementById('combat-log');
            logBox.innerHTML = `
                <div class="mb-1 text-[11px] font-mono animate__animated animate__fadeInLeft faster flex items-start">
                    <span class="text-emerald-500 mr-2 font-bold shrink-0 flex items-center justify-center w-4">●</span>
                    <span class="text-slate-400">System Initialized. Waiting for market data...</span>
                </div>
            `;
            setTimeout(() => log("System Online. Market Open.", "system"), 500);
        }

        function hideModal() {
            const m = document.getElementById('modal-overlay');
            m.classList.add('hidden');
            m.classList.remove('flex', 'opacity-100');
        }

        function showModal(title, desc, iconHTML, action, btnText = "CONTINUE") {
            const m = document.getElementById('modal-overlay');
            const c = document.getElementById('modal-content');
            
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-desc').innerText = desc;
            document.getElementById('modal-icon').innerHTML = iconHTML;
            document.getElementById('modal-btn').innerText = btnText;
            
            gameState.modalAction = action;

            m.classList.remove('hidden');
            m.classList.add('flex');
            requestAnimationFrame(() => { m.classList.remove('opacity-0'); c.classList.remove('scale-95'); });
        }

        function handleModalClick() {
            if (gameState.modalAction === 'restart') {
                init();
            } else if (gameState.modalAction === 'nextLevel') {
                hideModal();
                // Check if upgrade should be offered (at start of levels 4 and 7)
                // Note: level was already incremented in levelComplete, so check for 4 and 7 (0-indexed)
                if (gameState.level === 4 || gameState.level === 7) {
                    showUpgradeSelection();
                } else {
                    loadLevel();
                }
            } else if (gameState.modalAction === 'battleAgain') {
                // Restart game from boss 1 (not start screen)
                hideModal();
                init();
            }
        }

        function showUpgradeSelection() {
            // At level 6 (before level 7): Sniper Vision can appear
            // At level 3 (before level 4): Exclude Sniper Vision (clashes with Choppy Market)
            let choices = [];
            
            if (gameState.level === 7) {
                // Level 7 upgrade: Sniper Vision can be offered + 1 random
                const shuffled = [...gameState.availableUpgrades].sort(() => Math.random() - 0.5);
                if (shuffled.length < 2) return loadLevel();
                choices = shuffled.slice(0, 2);
            } else {
                // Level 4: Exclude Sniper Vision, pick 2 random
                const poolWithoutSniper = gameState.availableUpgrades.filter(u => u.id !== 'sniperVision');
                if (poolWithoutSniper.length < 2) return loadLevel();
                const shuffled = [...poolWithoutSniper].sort(() => Math.random() - 0.5);
                choices = shuffled.slice(0, 2);
            }
            
            // Store current choices to remove both from pool after selection
            gameState.currentUpgradeChoices = choices.map(u => u.id);
            
            const container = document.getElementById('upgrade-options');
            container.innerHTML = choices.map(upgrade => `
                <button onclick="selectUpgrade('${upgrade.id}')" class="w-full glass-btn p-4 rounded-xl text-left hover:border-indigo-500 transition-all group">
                    <div class="flex items-center gap-3 mb-1">
                        <i class="ph ${upgrade.icon} ${upgrade.color} text-2xl"></i>
                        <span class="font-display font-bold text-white text-sm">${upgrade.name}</span>
                    </div>
                    <p class="text-slate-400 text-[10px] leading-relaxed">${upgrade.effect}</p>
                </button>
            `).join('');
            
            const m = document.getElementById('upgrade-overlay');
            const c = document.getElementById('upgrade-content');
            m.classList.remove('hidden');
            m.classList.add('flex');
            requestAnimationFrame(() => { m.classList.remove('opacity-0'); c.classList.remove('scale-95'); });
            sfx.click();
        }

        function hideUpgradeModal() {
            const m = document.getElementById('upgrade-overlay');
            m.classList.add('hidden');
            m.classList.remove('flex', 'opacity-100');
        }

        function showMarketModal(marketType) {
            const marketData = {
                bear: {
                    icon: '<i class="ph ph-trend-down text-red-400"></i>',
                    title: 'BEARISH MARKET',
                    desc: 'The market turns against you. Healing effects are reduced by 25%. Stay disciplined and manage your risk carefully.'
                },
                chop: {
                    icon: '<i class="ph ph-wave-sine text-yellow-400"></i>',
                    title: 'CHOPPY MARKET',
                    desc: 'Sideways conditions ahead. SNIPE accuracy drops to just 10%. Patience is key - wait for cleaner setups.'
                },
                bull: {
                    icon: '<i class="ph ph-trend-up text-emerald-400"></i>',
                    title: 'BULLISH MARKET',
                    desc: 'Momentum is on your side! All damage you deal is increased by 20%. Strike while the iron is hot.'
                },
                flash: {
                    icon: '<i class="ph ph-lightning text-orange-400"></i>',
                    title: 'FLASH CRASH',
                    desc: 'Extreme volatility! No buffs, no safety nets - just raw survival. This is where legends are made or broken.'
                }
            };
            
            const data = marketData[marketType];
            if (!data) return;
            
            document.getElementById('market-icon').innerHTML = data.icon;
            document.getElementById('market-title').innerText = data.title;
            document.getElementById('market-desc').innerText = data.desc;
            
            const m = document.getElementById('market-overlay');
            const c = document.getElementById('market-content');
            m.classList.remove('hidden');
            m.classList.add('flex');
            requestAnimationFrame(() => { m.classList.remove('opacity-0'); c.classList.remove('scale-95'); });
            sfx.warning();
        }

        function hideMarketModal() {
            const m = document.getElementById('market-overlay');
            m.classList.add('hidden');
            m.classList.remove('flex', 'opacity-100');
            
            // Process any pending logs after popup is dismissed
            if (gameState.pendingLogs && gameState.pendingLogs.length > 0) {
                gameState.pendingLogs.forEach(logItem => {
                    setTimeout(() => log(logItem.msg, logItem.type), logItem.delay);
                });
                gameState.pendingLogs = [];
            }
        }

        function showCurrentMarketPopup() {
            const market = getMarketCondition();
            if (market.effect) {
                showMarketModal(market.effect);
            }
        }

        function selectUpgrade(upgradeId) {
            // Find the upgrade
            const upgrade = allUpgrades.find(u => u.id === upgradeId);
            if (!upgrade) return;
            
            // Mark as acquired
            gameState.upgrades[upgradeId] = true;
            
            // Remove BOTH offered upgrades from pool (each upgrade only offered once per run)
            const offeredIds = gameState.currentUpgradeChoices || [upgradeId];
            gameState.availableUpgrades = gameState.availableUpgrades.filter(u => !offeredIds.includes(u.id));
            
            // Apply immediate effects
            if (upgradeId === 'ironMind') {
                const hpIncrease = Math.floor(gameState.player.maxHp * 0.2);
                gameState.player.maxHp += hpIncrease;
                gameState.player.hp += hpIncrease; // Also heal by the amount
                updatePlayerUI();
            }
            
            // Log the upgrade
            log(`Upgrade acquired: ${upgrade.name}`, 'heal');
            sfx.crit();
            
            hideUpgradeModal();
            loadLevel();
        }

        function getRandomText(key) {
            const arr = flavorText[key];
            return arr[Math.floor(Math.random() * arr.length)];
        }

        function loadLevel() {
            if (gameState.level >= bosses.length) return; 
            const data = bosses[gameState.level];
            gameState.currentBoss = { ...data };
            gameState.player.resetCooldown = 0;
            gameState.player.waitCooldown = 0;
            
            document.getElementById('boss-icon').className = `ph ${data.icon} text-6xl ${data.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`;
            document.getElementById('boss-name').innerText = data.name;
            document.getElementById('current-level').innerText = gameState.level + 1;
            
            updateBossUI();
            updateMarketUI();
            
            // Show market condition popup at levels 2, 4, 7, 10 (first appearance of each market type)
            const marketPopupLevels = [1, 3, 6, 9]; // 0-indexed: level 2, 4, 7, 10 (market transitions)
            const market = getMarketCondition();
            const showingMarketPopup = marketPopupLevels.includes(gameState.level) && market.effect;
            
            if (showingMarketPopup) {
                showMarketModal(market.effect);
                // Store pending logs to show after popup is dismissed
                gameState.pendingLogs = [];
                gameState.pendingLogs.push({ msg: `Identifying Pattern: ${data.name}...`, type: "warning", delay: 0 });
                gameState.pendingLogs.push({ msg: data.intro, type: "bossIntro", delay: 1000 });
                
                // Log market condition when entering a NEW market phase
                const prevMarket = gameState.lastMarketEffect || null;
                if (market.effect && market.effect !== prevMarket) {
                    let marketMsg = "";
                    if (market.effect === "bull") marketMsg = "Bullish Market: You deal +20% damage.";
                    else if (market.effect === "chop") marketMsg = "Choppy Market: Snipe accuracy drops to 10%.";
                    else if (market.effect === "bear") marketMsg = "Bearish Market: Healing is 25% less effective.";
                    else if (market.effect === "flash") marketMsg = "Flash Crash: Extreme volatility. No buffs, just pain.";
                    gameState.pendingLogs.push({ msg: marketMsg, type: "warning", delay: 2000 });
                }
            } else {
                // No popup - use normal timing
                setTimeout(() => log(`Identifying Pattern: ${data.name}...`, "warning"), 1000);
                setTimeout(() => log(data.intro, "bossIntro"), 2000);
                
                // Log market condition when entering a NEW market phase
                const prevMarket = gameState.lastMarketEffect || null;
                if (market.effect && market.effect !== prevMarket) {
                    let marketMsg = "";
                    if (market.effect === "bull") marketMsg = "Bullish Market: You deal +20% damage.";
                    else if (market.effect === "chop") marketMsg = "Choppy Market: Snipe accuracy drops to 10%.";
                    else if (market.effect === "bear") marketMsg = "Bearish Market: Healing is 25% less effective.";
                    else if (market.effect === "flash") marketMsg = "Flash Crash: Extreme volatility. No buffs, just pain.";
                    setTimeout(() => log(marketMsg, "warning"), 2500);
                }
            }
            gameState.lastMarketEffect = market.effect;
            
            gameState.isPlayerTurn = true;
            setControls(true);
            updatePlayerUI();
        }

        function updatePlayerUI() {
            const hpPct = (gameState.player.hp / gameState.player.maxHp) * 100;
            const bar = document.getElementById('player-hp-bar');
            const txt = document.getElementById('player-hp-text');
            const container = document.getElementById('hp-container');
            const execBtn = document.getElementById('btn-execute');
            const jrnlBtn = document.getElementById('btn-journal');
            const waitBtn = document.getElementById('btn-wait');
            const waitText = document.getElementById('btn-wait-text');
            const waitSub = document.getElementById('btn-wait-sub');

            bar.style.width = `${Math.max(0, hpPct)}%`;
            txt.innerText = `${Math.ceil(Math.max(0, hpPct))}%`;
            
            // Health Colors
            bar.classList.remove('bg-emerald-500', 'bg-yellow-500', 'bg-red-500', 'shadow-glow-green', 'shadow-glow-yellow', 'shadow-glow-red');
            txt.classList.remove('text-emerald-400', 'text-yellow-400', 'text-red-400');

            if (hpPct > 50) {
                bar.classList.add('bg-emerald-500', 'shadow-glow-green');
                txt.classList.add('text-emerald-400');
            } else if (hpPct > 25) {
                bar.classList.add('bg-yellow-500', 'shadow-glow-yellow');
                txt.classList.add('text-yellow-400');
            } else {
                bar.classList.add('bg-red-500', 'shadow-glow-red');
                txt.classList.add('text-red-400');
            }

            // Charged State
            if (gameState.player.isCharged) {
                execBtn.classList.add('btn-glow-anim');
                jrnlBtn.classList.add('btn-glow-anim');
            } else {
                execBtn.classList.remove('btn-glow-anim');
                jrnlBtn.classList.remove('btn-glow-anim');
            }

            // Cooldown Logic
            const breatheBtn = document.getElementById('btn-breathe');
            const breatheText = document.getElementById('btn-breathe-text');
            const breatheSub = document.getElementById('btn-breathe-sub');

            if (gameState.player.resetCooldown > 0) {
                breatheBtn.disabled = true;
                breatheBtn.classList.add('btn-cooldown');
                breatheText.innerText = `RECOVERING (${gameState.player.resetCooldown})`;
                breatheSub.innerText = "Reset cooldown active.";
            } else {
                if(gameState.isPlayerTurn) breatheBtn.disabled = false;
                breatheBtn.classList.remove('btn-cooldown');
                breatheText.innerText = "RESET";
                breatheSub.innerText = "Restore mental cap.";
            }

            if (gameState.player.waitCooldown > 0) {
                waitBtn.disabled = true;
                waitBtn.classList.add('btn-cooldown');
                waitText.innerText = `RECHARGING (${gameState.player.waitCooldown})`;
                waitSub.innerText = "Wait cooldown active.";
            } else {
                if(gameState.isPlayerTurn) waitBtn.disabled = false; 
                waitBtn.classList.remove('btn-cooldown'); 
                waitText.innerText = "WAIT";
                waitSub.innerText = "Charge up. Next 2x Dmg.";
            }
        }

        function updateBossUI() {
            const boss = gameState.currentBoss;
            const pct = (boss.hp / boss.maxHp) * 100;
            document.getElementById('boss-hp-bar').style.width = `${Math.max(0, pct)}%`;
            document.getElementById('boss-hp-val').innerText = `${Math.max(0, boss.hp)}/${boss.maxHp}`;
        }

        function showToolInfo() {
            const panel = document.getElementById('tool-info-panel');
            panel.classList.toggle('hidden');
            sfx.click();
        }

        function getMarketCondition() {
            const level = gameState.level; // 0-indexed
            if (level === 0) return { name: "Normal", color: "text-slate-400", effect: null };
            if (level >= 1 && level <= 2) return { name: "Bullish Market", color: "text-emerald-400", effect: "bull" };
            if (level >= 3 && level <= 5) return { name: "Choppy Market", color: "text-yellow-400", effect: "chop" };
            if (level >= 6 && level <= 8) return { name: "Bearish Market", color: "text-red-400", effect: "bear" };
            if (level >= 9) return { name: "Flash Crash", color: "text-orange-400", effect: "flash" };
            return { name: "Normal", color: "text-slate-400", effect: null };
        }

        function updateMarketUI() {
            const condition = getMarketCondition();
            const el = document.getElementById('market-condition');
            // Hide label during Normal market (level 1)
            if (condition.name === "Normal") {
                el.innerText = "";
                el.className = "hidden";
            } else {
                el.innerText = condition.name;
                el.className = `text-[9px] font-display uppercase tracking-wider mt-1 px-2 py-0.5 rounded bg-slate-800/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${condition.color}`;
            }
        }

        function updateToolbeltUI() {
            const volBtn = document.getElementById('tool-volatility');
            const mentorBtn = document.getElementById('tool-mentor');
            const newsBtn = document.getElementById('tool-news');
            
            if (!gameState.tools) return;
            
            volBtn.disabled = !gameState.tools.volatilityStop;
            mentorBtn.disabled = !gameState.tools.mentorCall;
            newsBtn.disabled = !gameState.tools.newsFilter;
            
            // Visual feedback for used/available tools
            if (gameState.tools.volatilityStop) {
                volBtn.classList.remove('opacity-30');
            } else {
                volBtn.classList.add('opacity-30');
            }
            if (gameState.tools.mentorCall) {
                mentorBtn.classList.remove('opacity-30');
            } else {
                mentorBtn.classList.add('opacity-30');
            }
            if (gameState.tools.newsFilter) {
                newsBtn.classList.remove('opacity-30');
            } else {
                newsBtn.classList.add('opacity-30');
            }
        }

        function useTool(tool) {
            if (!gameState.isPlayerTurn || gameState.isGameOver) return;
            if (!gameState.tools[tool]) return;
            
            sfx.click();
            
            switch(tool) {
                case 'volatilityStop':
                    gameState.tools.volatilityStop = false;
                    gameState.volatilityTurns = 3;
                    log("Volatility Stop activated! -30% damage for 3 turns.", "heal");
                    floatText("V-STOP!", 'heal');
                    break;
                    
                case 'mentorCall':
                    gameState.tools.mentorCall = false;
                    const healAmt = Math.floor(gameState.player.maxHp * 0.4);
                    // Apply Bear Market reduction if active
                    const mentorMarket = getMarketCondition();
                    const finalHealAmt = (mentorMarket.effect === "bear") ? Math.floor(healAmt * 0.75) : healAmt;
                    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + finalHealAmt);
                    updatePlayerUI();
                    sfx.heal();
                    log("Mentor Call! Your coach reminds you of your edge. +40% HP restored.", "heal");
                    floatText(`+${finalHealAmt}`, 'heal');
                    break;
                    
                case 'newsFilter':
                    gameState.tools.newsFilter = false;
                    gameState.bossStunnedTurns = 2;
                    log("News Filter activated! Boss is stunned for 2 turns.", "heal");
                    floatText("STUNNED!", 'heal');
                    break;
            }
            
            updateToolbeltUI();
        }

        function log(msg, type = 'normal') {
            const box = document.getElementById('combat-log');
            const line = document.createElement('div');
            // Add flex and items-start for better alignment of multi-line boss intros
            line.className = "mb-1 text-[11px] font-mono animate__animated animate__fadeInLeft faster flex items-start";

            if (type === 'bossIntro') {
                // --- SPECIAL BOSS INTRO STYLING (SMALLER ICON) ---
                line.innerHTML = `
                    <span class="text-red-500 mr-2 shrink-0 flex items-center justify-center w-4"><i class="ph-fill ph-skull drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]"></i></span>
                    <span class="text-red-100 font-display italic tracking-wide text-xs leading-tight">${msg}</span>
                `;
            } else {
                // --- STANDARD LOG STYLING (RESTORED COLORS) ---
                let icon = '●';
                let colorClass = 'text-slate-400';
                let textClass = 'text-slate-300'; // Default text color
                let iconHTML = ''; // To support custom HTML icons

                switch(type) {
                    case 'damage': 
                        icon = '▼'; 
                        colorClass = 'text-red-400'; 
                        textClass = 'text-red-300'; // Red text for damage
                        break;
                    case 'hit': 
                        icon = '▲'; 
                        colorClass = 'text-blue-400'; 
                        textClass = 'text-blue-200'; // Blue text for hit
                        break;
                    case 'crit': 
                        icon = '★'; 
                        colorClass = 'text-gold'; 
                        textClass = 'text-yellow-100'; // Gold text for crit
                        break;
                    case 'heal': 
                        icon = '+'; 
                        colorClass = 'text-emerald-400'; 
                        textClass = 'text-emerald-200'; // Green text for heal
                        break;
                    case 'charge': 
                        // Use Phosphor Crosshair for Charge (Wait) - WITH text-xs
                        iconHTML = '<i class="ph-bold ph-crosshair text-xs"></i>'; 
                        colorClass = 'text-cyan-400'; 
                        textClass = 'text-cyan-200'; // Cyan text for charge
                        break;
                    case 'warning': 
                        icon = '!'; 
                        colorClass = 'text-orange-400'; 
                        textClass = 'text-orange-200'; // Orange text for warning
                        break;
                    case 'market':
                        icon = ''; 
                        colorClass = 'text-orange-400'; 
                        textClass = 'text-orange-200'; // Orange text for market conditions
                        break;
                    case 'system': 
                        icon = '>'; 
                        colorClass = 'text-slate-500'; 
                        textClass = 'text-slate-500'; // Dim text for system
                        break;
                    case 'normal':
                         icon = '●';
                         colorClass = 'text-slate-500';
                         textClass = 'text-slate-400';
                         break;
                }
                
                // If iconHTML is set (like for charge), use it. Otherwise use the character.
                const finalIcon = iconHTML ? iconHTML : icon;
                
                line.innerHTML = `<span class="${colorClass} mr-2 font-bold shrink-0 text-sm leading-none flex items-center justify-center w-4">${finalIcon}</span><span class="${textClass}">${msg}</span>`;
            }

            box.prepend(line);
            if (box.children.length > 20) box.lastChild.remove();
        }

        function floatText(text, type) {
            const layer = document.getElementById('damage-layer');
            const el = document.createElement('div');
            el.innerText = text;
            let colorClass = 'text-white text-2xl';
            if (type === 'crit') colorClass = 'text-gold text-3xl font-bold';
            if (type === 'heal') colorClass = 'text-emerald-400 text-2xl';
            if (type === 'playerDmg') colorClass = 'text-red-500 text-2xl';
            if (type === 'charge') colorClass = 'text-cyan-400 text-2xl font-bold';
            el.className = `damage-text ${colorClass}`;
            const rx = (Math.random() - 0.5) * 40;
            el.style.transform = `translate(${rx}px, 0)`;
            layer.appendChild(el);
            setTimeout(() => el.remove(), 800);
        }

        function setControls(enabled) {
            ['execute', 'breathe', 'wait', 'journal'].forEach(id => {
                const btn = document.getElementById(`btn-${id}`);
                if (enabled && id === 'wait' && gameState.player.waitCooldown > 0) return;
                if (enabled && id === 'breathe' && gameState.player.resetCooldown > 0) return;
                btn.disabled = !enabled;
                btn.style.opacity = enabled ? "1" : "0.5";
            });
        }

        // --- Combat Logic (SAFE MODE with 10% miss chance) ---
        function playerAction(type) {
            try {
                if (!gameState.isPlayerTurn || gameState.isGameOver) return;
                if (type === 'wait' && gameState.player.waitCooldown > 0) return;
                if (type === 'breathe' && gameState.player.resetCooldown > 0) return;

                gameState.isPlayerTurn = false;
                setControls(false);

                let dmg = 0;
                let logMsg = "";
                let txtType = "hit";
                let multiplier = 1;

                // Handle Charge
                if (gameState.player.isCharged && (type === 'execute' || type === 'journal')) {
                    multiplier = 2;
                    gameState.player.isCharged = false;
                    txtType = 'crit';
                    updatePlayerUI();
                }

                if (type === 'execute') {
                    // 10% Chance to Miss
                    if (Math.random() < 0.1) {
                         dmg = 0;
                         logMsg = "Execution fumbled. Missed trade.";
                         txtType = "warning"; // Use warning color for miss
                         sfx.miss(); // Miss sound
                         floatText("YOU MISSED", "playerDmg");
                    } else {
                        // Logic: Base (12-18) + (Level * 2.0) * Multiplier
                        const baseMin = 12;
                        const baseMax = 18;
                        const levelScaling = gameState.level * 2.0; 
                        const rawDmg = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
                        dmg = Math.floor((rawDmg + levelScaling) * multiplier);
                        
                        // Bull Market: +20% damage
                        const market = getMarketCondition();
                        if (market.effect === "bull") {
                            dmg = Math.floor(dmg * 1.2);
                        }
                        
                        // Diamond Hands: 2x damage when below 25 HP (absolute)
                        if (gameState.upgrades.diamondHands && gameState.player.hp < 25) {
                            dmg = Math.floor(dmg * 2);
                        }

                        logMsg = getRandomText('execute');
                        if(multiplier > 1) logMsg += " (PERFECT SETUP!)";
                        sfx.hit();
                        floatText(dmg, multiplier > 1 ? 'crit' : 'hit');
                    }
                } 
                else if (type === 'breathe') {
                    // Set cooldown: can't use RESET next turn
                    gameState.player.resetCooldown = 2;
                    // Logic: Base (15-25) + (Level * 1.0)
                    const baseHealMin = 15;
                    const baseHealMax = 25;
                    const healScaling = gameState.level * 1.0;
                    let rawHeal = Math.floor(Math.random() * (baseHealMax - baseHealMin + 1)) + baseHealMin;
                    
                    // Final Boss Bonus
                    let healBonus = (gameState.level === 10) ? 8 : 0;
                    
                    // Box Breathing upgrade: +5 extra heal
                    if (gameState.upgrades.boxBreathing) {
                        healBonus += 5;
                    }
                    
                    let heal = Math.floor(rawHeal + healScaling + healBonus);
                    
                    // Bear Market: Healing is 25% less effective
                    const market = getMarketCondition();
                    if (market.effect === "bear") {
                        heal = Math.floor(heal * 0.75);
                    }
                    
                    gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + heal);
                    
                    logMsg = getRandomText('breathe');
                    txtType = "heal";
                    sfx.heal();
                    floatText(`+${heal}`, 'heal');
                    log(`${logMsg} <span class="text-emerald-400 ml-1">[+${heal}%]</span>`, 'heal');
                    updatePlayerUI();
                    setTimeout(bossTurn, 800);
                    return;
                }
                else if (type === 'wait') {
                    gameState.player.isCharged = true;
                    gameState.player.waitCooldown = 3; // 3 Turns
                    logMsg = getRandomText('wait');
                    sfx.click(); 
                    updatePlayerUI();
                    log(logMsg, 'charge');
                    setTimeout(bossTurn, 600);
                    return;
                }
                else if (type === 'journal') {
                    const market = getMarketCondition();
                    // Base success: 30% (threshold 0.7), Sniper Vision: 40% (threshold 0.6)
                    // Chop Market: Snipe accuracy drops to 10% (threshold 0.9)
                    let baseThreshold = gameState.upgrades.sniperVision ? 0.6 : 0.7;
                    const successThreshold = (market.effect === "chop") ? 0.9 : baseThreshold;
                    const roll = Math.random();
                    
                    if (roll > successThreshold) { 
                        // Success: Base (20-30) + (Level * 3.0)
                        const baseMin = 20;
                        const baseMax = 30;
                        const levelScaling = gameState.level * 3;
                        const rawDmg = Math.floor(Math.random() * (baseMax - baseMin + 1)) + baseMin;
                        dmg = Math.floor((rawDmg + levelScaling) * multiplier);
                        
                        // Bull Market: +20% damage
                        if (market.effect === "bull") {
                            dmg = Math.floor(dmg * 1.2);
                        }
                        
                        // Diamond Hands: 2x damage when below 25 HP (absolute)
                        if (gameState.upgrades.diamondHands && gameState.player.hp < 25) {
                            dmg = Math.floor(dmg * 2);
                        }
                        
                        logMsg = getRandomText('auditHit');
                        if(multiplier > 1) logMsg += " (AMPLIFIED!)";
                        txtType = "crit";
                        sfx.crit();
                        floatText(dmg, 'crit');
                        const bossIcon = document.getElementById('boss-container');
                        bossIcon.classList.add('shake');
                        setTimeout(()=>bossIcon.classList.remove('shake'), 400);
                    } else {
                        dmg = 4 * multiplier;
                        logMsg = getRandomText('auditMiss');
                        sfx.error();
                        floatText(`${dmg}`, 'hit');
                        // Log handled separately for minor hit
                    }
                }

                if (dmg > 0 || type === 'journal' || type === 'execute') {
                     // For misses, dmg is 0 but we still update boss UI (to trigger win if 0 HP logic was flawed, but here dmg is subtracted)
                     gameState.currentBoss.hp -= dmg;
                     updateBossUI();
                     // Log with appropriate format based on action type
                     if (type === 'journal' && dmg <= 4) {
                         log(`${logMsg} Minor Hit: ${dmg}`, txtType);
                     } else if (dmg > 0) {
                         log(`${logMsg} Hit: ${dmg}`, txtType);
                     } else if (type === 'execute' && dmg === 0) {
                         log(logMsg, txtType); // Log execute miss
                     }
                }

                if (gameState.currentBoss.hp <= 0) {
                    setTimeout(levelComplete, 600);
                } else {
                    setTimeout(bossTurn, 1000);
                }
            } catch(e) {
                console.error(e);
                log("Error executing move. Try again.", "warning");
                setControls(true);
                gameState.isPlayerTurn = true;
            }
        }

        function bossTurn() {
            if (gameState.isGameOver) return;
            
            if (gameState.player.waitCooldown > 0) {
                gameState.player.waitCooldown--;
            }
            if (gameState.player.resetCooldown > 0) {
                gameState.player.resetCooldown--;
            }

            // Ensure boss exists
            const boss = gameState.currentBoss;
            if(!boss) return;

            // Check if boss is stunned (News Filter)
            if (gameState.bossStunnedTurns > 0) {
                gameState.bossStunnedTurns--;
                log(`📰 ${boss.name} is filtering through the noise... Turn skipped! (${gameState.bossStunnedTurns} stun turns left)`, 'heal');
                floatText("SKIP!", 'heal');
                gameState.isPlayerTurn = true;
                setControls(true);
                updatePlayerUI();
                return;
            }

            const atk = boss.attacks[Math.floor(Math.random() * boss.attacks.length)];
            let dmg = atk.dmg;

            // Player Dodge: Base 5%, Tight Stops: 10%
            const playerDodgeChance = gameState.upgrades.tightStops ? 0.1 : 0.05;
            if (Math.random() < playerDodgeChance) {
                dmg = 0;
                sfx.dodge();
                floatText("DODGED", 'heal');
                log(`You saw it coming! Dodged ${boss.name}'s attack.`, 'heal');
            }
            // Boss Miss: Base 10%
            else if (Math.random() < 0.10) {
                dmg = 0;
                sfx.dodge(); // Dodging sound
                floatText("BOSS MISSED", 'heal'); // Green text implies good thing
                log(`${boss.name} missed! You avoided the trap.`, 'heal');
            } else {
                // Institutional Backing: -15% damage from all boss attacks
                if (gameState.upgrades.institutionalBacking) {
                    dmg = Math.floor(dmg * 0.85);
                }
                
                // Apply Volatility Stop damage reduction
                if (gameState.volatilityTurns > 0) {
                    const reducedDmg = Math.floor(dmg * 0.7); // 30% reduction
                    gameState.volatilityTurns--;
                    log(`Volatility Stop absorbed ${dmg - reducedDmg}% damage! (${gameState.volatilityTurns} turns left)`, 'heal');
                    dmg = reducedDmg;
                }
                
                gameState.player.hp -= dmg;
                updatePlayerUI();
                sfx.error();
                
                const shakeWrapper = document.getElementById('game-shake-wrapper');
                shakeWrapper.classList.add('shake');
                setTimeout(()=> shakeWrapper.classList.remove('shake'), 400);
                
                floatText(`-${dmg}`, 'playerDmg');
                log(`${atk.text} <span class="text-red-500 ml-1">[-${dmg}%]</span>`, 'damage');
            }

            if (gameState.player.hp <= 0) {
                gameOver();
            } else {
                gameState.isPlayerTurn = true;
                setControls(true);
                updatePlayerUI(); // Update UI to refresh wait button state
            }
        }

        function triggerConfetti() {
            const container = document.createElement('div');
            container.id = 'confetti-container';
            container.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;overflow:hidden;';
            document.body.appendChild(container);
            
            const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#ef4444', '#8b5cf6'];
            
            function createConfettiPiece() {
                const confetti = document.createElement('div');
                confetti.style.cssText = `
                    position:absolute;
                    width:${Math.random() * 10 + 5}px;
                    height:${Math.random() * 10 + 5}px;
                    background:${colors[Math.floor(Math.random() * colors.length)]};
                    left:${Math.random() * 100}%;
                    top:-20px;
                    opacity:${Math.random() * 0.7 + 0.3};
                    transform:rotate(${Math.random() * 360}deg);
                    border-radius:${Math.random() > 0.5 ? '50%' : '0'};
                `;
                container.appendChild(confetti);
                
                const fallDuration = (Math.random() * 2 + 2) * 1.25;
                const drift = (Math.random() - 0.5) * 200;
                confetti.animate([
                    { transform: `translateY(0) translateX(0) rotate(0deg)`, opacity: 1 },
                    { transform: `translateY(${window.innerHeight + 50}px) translateX(${drift}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }
                ], {
                    duration: fallDuration * 1000,
                    easing: 'ease-out'
                });
                
                setTimeout(() => confetti.remove(), fallDuration * 1000);
            }
            
            // Generate confetti continuously for 4 seconds
            let spawnCount = 0;
            const spawnInterval = setInterval(() => {
                for (let i = 0; i < 8; i++) {
                    createConfettiPiece();
                }
                spawnCount++;
                if (spawnCount >= 40) {
                    clearInterval(spawnInterval);
                }
            }, 100);
            
            // Initial burst
            for (let i = 0; i < 50; i++) {
                createConfettiPiece();
            }
            
            setTimeout(() => container.remove(), 10000);
        }

        function levelComplete() {
            const heal = Math.floor(gameState.player.maxHp * 0.1);
            
            // Check if this was the final boss first (don't play normal win sound)
            if (gameState.level !== bosses.length - 1) {
                sfx.win();
            }
            
            // Check if this was the final boss (Account Assassin - index 10)
            if (gameState.level === bosses.length - 1) {
                // Final boss defeated - game complete!
                sfx.superWin();
                triggerConfetti();
                showModal("THREAT NEUTRALIZED", `${gameState.currentBoss.defeatMsg}`, '<i class="ph ph-trophy text-gold"></i>', 'battleAgain', "BATTLE AGAIN");
            } else {
                // Not final boss - heal and continue
                gameState.player.hp = Math.min(gameState.player.maxHp, gameState.player.hp + heal);
                gameState.level++;
                showModal("THREAT NEUTRALIZED", `${gameState.currentBoss.defeatMsg} (+10% Mental Equity)`, '<i class="ph ph-check-circle text-emerald-500"></i>', 'nextLevel', "NEXT LEVEL");
            }
        }

        function gameOver() {
            gameState.isGameOver = true;
            showModal("BLOWN UP", "Emotions took over. Mental capital depleted.", '<i class="ph ph-skull text-red-500"></i>', 'restart', "REBOOT SYSTEM");
        }

        function gameWin() {
            gameState.isGameOver = true;
            sfx.win();
            showModal("PROFITABLE", "You have mastered your mind. The markets are yours.", '<i class="ph ph-trophy text-gold"></i>', 'restart', "PLAY AGAIN");
        }

        function startGame() {
            const startScreen = document.getElementById('start-screen');
            startScreen.classList.add('animate__animated', 'animate__fadeOut');
            setTimeout(() => {
                startScreen.style.display = 'none';
                init();
            }, 300);
        }

        window.onload = function() {
            // Show start screen, don't auto-init game
        };
