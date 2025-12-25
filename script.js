// ================= FIREBASE =================
firebase.initializeApp({
  apiKey: "AIzaSyCLsfetGGbvG5aeVHQSzVMXyzt395Buucg",
  authDomain: "cards29-game.firebaseapp.com",
  databaseURL: "https://cards29-game-default-rtdb.firebaseio.com",
  projectId: "cards29-game",
  storageBucket: "cards29-game.firebasestorage.app",
  messagingSenderId: "989522634372",
  appId: "1:989522634372:web:7c9e6059119ccbd71e84d1"
});
const db = firebase.database()

let playerName, roomCode;
const suits = ["S", "H", "D", "C"];
const ranks = ["7", "8", "Q", "K", "10", "A", "9", "J"]; // Order of strength
const points = { "J": 3, "9": 2, "A": 1, "10": 1, "K": 0, "Q": 0, "8": 0, "7": 0 };

function joinRoom() {
    playerName = document.getElementById("name-input").value.trim();
    roomCode = document.getElementById("room-input").value.trim() || "1001";
    if (!playerName) return alert("Enter name!");

    const ref = db.ref(`rooms/${roomCode}`);
    ref.once('value', s => {
        if (!s.exists()) {
            ref.set({ creator: playerName, phase: 'waiting', players: {}, bid: 16 });
        }
        ref.child(`players/${playerName}`).set({ id: playerName });
        startSync();
    });
}

function startSync() {
    document.getElementById("join-screen").classList.add("hidden");
    document.getElementById("game-screen").classList.remove("hidden");
    
    db.ref(`rooms/${roomCode}`).on('value', s => {
        const data = s.val();
        if (!data) return;
        updateUI(data);
    });
}

function updateUI(data) {
    const pList = Object.keys(data.players || {});
    const isMyTurn = data.turn === playerName;
    
    // UI Updates
    document.getElementById("status-bar").innerText = isMyTurn ? "YOUR TURN" : `${data.turn || 'Waiting'}'s Turn`;
    document.getElementById("bid-val").innerText = `${data.bid} (${data.bidder || 'None'})`;
    document.getElementById("start-btn").classList.toggle("hidden", data.creator !== playerName || pList.length < 4 || data.phase !== 'waiting');

    // Modals
    document.getElementById("bid-modal").classList.toggle("hidden", data.phase !== 'bidding' || !isMyTurn);
    document.getElementById("trump-modal").classList.toggle("hidden", data.phase !== 'trump_selection' || !isMyTurn);
    
    if (data.phase === 'bidding' && isMyTurn) createBidButtons(data.bid);

    // Cards
    if (data.hands && data.hands[playerName]) {
        renderHand(data.hands[playerName], isMyTurn && data.phase === 'play');
    }
    renderTable(data.trick || {});
}

function createBidButtons(min) {
    const div = document.getElementById("bid-options");
    div.innerHTML = "";
    for (let i = min + 1; i <= 28; i++) {
        let b = document.createElement("button");
        b.innerText = i;
        b.onclick = () => submitBid(i);
        div.appendChild(b);
    }
}

function renderHand(cards, active) {
    const div = document.getElementById("my-hand");
    div.innerHTML = "";
    cards.forEach(c => {
        const img = document.createElement("img");
        img.src = `cards/${c}.png`; // Format: JH.png
        img.className = "card";
        img.onclick = () => { if (active) playCard(c); };
        div.appendChild(img);
    });
}

function renderTable(trick) {
    const div = document.getElementById("play-area");
    div.innerHTML = "";
    Object.values(trick).forEach(c => {
        const img = document.createElement("img");
        img.src = `cards/${c}.png`;
        img.className = "table-card";
        div.appendChild(img);
    });
}

// --- GAME ACTIONS ---

function startGame() {
    let deck = [];
    suits.forEach(s => ["7", "8", "9", "10", "J", "Q", "K", "A"].forEach(v => deck.push(v + s)));
    deck.sort(() => Math.random() - 0.5);

    db.ref(`rooms/${roomCode}`).once('value', s => {
        const players = Object.keys(s.val().players);
        let hands = {};
        players.forEach((p, i) => hands[p] = deck.slice(i * 4, (i * 4) + 4));
        
        db.ref(`rooms/${roomCode}`).update({
            phase: 'bidding',
            hands: hands,
            deck: deck.slice(16),
            turn: players[0],
            scores: { team1: 0, team2: 0 },
            passed: []
        });
    });
}

function submitBid(val) {
    db.ref(`rooms/${roomCode}`).transaction(g => {
        if (!g) return g;
        if (val === 'pass') {
            if (!g.passed) g.passed = [];
            g.passed.push(playerName);
        } else {
            g.bid = val; g.bidder = playerName;
        }
        const p = Object.keys(g.players);
        g.turn = p[(p.indexOf(playerName) + 1) % 4];
        if (g.passed && g.passed.length === 3) {
            g.phase = 'trump_selection';
            g.turn = g.bidder;
        }
        return g;
    });
}

function setTrump(suit) {
    db.ref(`rooms/${roomCode}`).once('value', s => {
        const g = s.val();
        const players = Object.keys(g.players);
        players.forEach((p, i) => {
            g.hands[p] = g.hands[p].concat(g.deck.slice(i * 4, (i * 4) + 4));
        });
        db.ref(`rooms/${roomCode}`).update({
            trump: suit, phase: 'play', hands: g.hands, turn: g.bidder
        });
    });
}

function playCard(card) {
    db.ref(`rooms/${roomCode}`).transaction(g => {
        if (!g.trick) g.trick = {};
        g.trick[playerName] = card;
        g.hands[playerName] = g.hands[playerName].filter(c => c !== card);
        const p = Object.keys(g.players);
        g.turn = p[(p.indexOf(playerName) + 1) % 4];
        
        if (Object.keys(g.trick).length === 4) {
            // Trick Winner Logic here (next step)
        }
        return g;
    });
}

