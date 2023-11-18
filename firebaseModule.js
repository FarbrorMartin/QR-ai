

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCKFBJPXhk_mFUBcCKWW4iz-ujwps_fIhM",
    authDomain: "martins-push-poc.firebaseapp.com",
    databaseURL: "https://martins-push-poc-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "martins-push-poc",
    storageBucket: "martins-push-poc.appspot.com",
    messagingSenderId: "701298343921",
    appId: "1:701298343921:web:cfed3991609cea60740e50"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firebase Database Reference
const database = firebase.database();

export function registerNewGame(gameId, shuffledLocations) {
    const gamesRef = database.ref('games/' + gameId);
    gamesRef.set({ in_progress: true, shuffledLocations });
}

export function sendGameEvent(gameId, eventType, playerId) {
    const eventsRef = database.ref('games/' + gameId + '/events');
    eventsRef.push({
        action: eventType,
        byPlayer: playerId,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });
}

export function joinGame(gameId, playerId) {
    const playersRef = database.ref('games/' + gameId + '/players');
    playersRef.child(playerId).set(true);
}

export function listenForGameEvents(gameId, eventCallback) {
    const eventsRef = database.ref('games/' + gameId + '/events');
    eventsRef.on('child_added', snapshot => {
        const event = snapshot.val();
        eventCallback(event);
    });
}

export function listenForPlayerAdded(gameId, callback){
    const playersRef = database.ref('games/' + gameId + '/players');
    playersRef.on('child_added', snapshot => {
        const event = snapshot.val();
        callback(event);
    });
}

export function getGame(gameId, gameCallback) {
    const gameRef = database.ref('games/' + gameId);
    gameRef.once('value', snapshot => {
        const gameData = snapshot.val();
        gameCallback(gameData);
    });
}

export function setGameState(gameId, inProgress){
    const gameRef = database.ref('games/' + gameId);
    gameRef.set({ started: inProgress }); // TODO: use a game state instead so that a game can be in progress or finished.
}

export function deleteOldGames() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const gamesRef = database.ref('games');
    gamesRef.once('value', snapshot => {
        snapshot.forEach(gameSnapshot => {
            if (gameSnapshot.val().timestamp < oneDayAgo) {
                gameSnapshot.ref.remove();
            }
        });
    });
}