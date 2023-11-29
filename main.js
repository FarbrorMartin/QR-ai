"use strict";
import QrScanner from "./qrscan/qr-scanner.min.js";
import * as db from "./firebaseModule.js";
// try{

let testMode = false;
// Constants
const GAME_NOT_STARTED = 0;
const GAME_INITIALIZED = 1;
const GAME_IN_PROGRESS = 2;
const GAME_FINISHED = 3;
const scanHideShowDelay = 500;
let playerFinished = false;

// Sound initialization
const correctSound = new Audio("Stinger15.mp3");
const errorSound = new Audio("wrong.mp3");
const banditEncounterSound = new Audio("maleb_laugh.mp3");
const banditCaughtSound = new Audio("evil_laughter.mp3");
const banditEscapeSound = new Audio("event_15.mp3");
const coinsSound = new Audio("Coins_Drop_Carpet_05.mp3");
const diamondSound = new Audio("Stinger_1.mp3");
const gemSound = new Audio("Glass_2.mp3");
const whistleSound = new Audio("whistle2.mp3");
const finishGameSound = new Audio("Stinger_13.mp3");
const clickSound = new Audio("clicky_button_low.mp3");

// Images
const banditImage = "images/bandit_100x100.png";

// treasures
const encounters = ["bandit", "bandit", "bandit", "diamond", "ruby", "ruby", "sapphire", "sapphire", "emerald", "emerald", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins"];
const treasures = {
    diamond: {
        value: 100,
        image: "images/diamond.png",
        name: "diamanten",
        sound: diamondSound
    },
    ruby: {
        value: 50,
        image: "images/ruby.png",
        name: "en rubin",
        sound: gemSound,
    },
    emerald: {
        value: 40,
        image: "images/emerald.png",
        name: "en smaragd",
        sound: gemSound,
    },
    sapphire: {
        value: 30,
        image: "images/sapphire.png",
        name: "en safir",
        sound: gemSound,
    },
    topaz: {
        value: 20,
        image: "images/topas.png",
        name: "en topas",
        sound: gemSound,
    },
    coins: {
        value: 5,
        image: "images/coins.jfif",
        name: "en hög guldmynt",
        sound: coinsSound,
    }
};

let foundTreasures = [];

// Global Variables
let gameState = GAME_NOT_STARTED;
let money = 0;
let foundDiamond = false;
let banditMarkers = 0;
let shuffledLocations = [];
let visitedLocations = [];
let finishTime = 0;
let startTime = new Date().getTime();
let isProcessingScanResult = false;

let currentGameId = null;
let playerId = 'player_' + Math.random().toString(36).substr(2, 9);


let state = {
    gameState: GAME_NOT_STARTED,
    money: 0,
    foundDiamond: false,
    shuffledLocations: [],
    visitedLocations: [],
    startTime: new Date().getTime()
};

// HTML Elements
const video = document.querySelector("#qr-video");
const videoContainer = document.querySelector("#video-container");
const scanButton = document.querySelector(".scan-button");
const colorBlock = document.querySelector("#color-block");
const banditContainer = document.querySelector(".bandit-row");
const qrcodeContainer = document.querySelector("#qrcode-container");
const gameContainer = document.querySelector("#game-container");
const treasureGrid = document.querySelector(".grid");
const gemSlots = document.querySelectorAll(".gem-slot");
const overlayText = document.querySelector("#waiting-for-game-text");



// QR Scanner
const scanner = new QrScanner(video, result => handleScanResult(result), {
    onDecodeError: error => console.log(error),
    highlightScanRegion: false,
    highlightCodeOutline: true,
});
scanner.setCamera("environment");

// Event Listeners
scanButton.addEventListener("click", toggleScanner);

// Functions
function handleScanResult(result) {
    if (!isProcessingScanResult) {
        isProcessingScanResult = true;
        const url = new URL(result.data);
        scanQRCode(url.searchParams);
        scanner.stop();
    }
}

function scanQRCode(urlParams) {
    console.log("IS SCANNING:" + isProcessingScanResult.toString());
    scanner.stop();
    setTimeout(() => {
        setScannerState(false);
        let scannedGameId = urlParams.get("gameid");
        const gameSeed = urlParams.get("gameseed");
        const location = urlParams.get("location");
        if (gameSeed !== null) handleSeedScanned(scannedGameId, gameSeed);
        else if (location === null || location === "start") handleStartScanned();
        else if (visitedLocations.includes(location)) errorSound.play();
        else showModal({
            message: "Klicka för söka igenom platsen!",
            callback: () => handleEncounterBing(location)
        });
        isProcessingScanResult = false;
    }, scanHideShowDelay);
}

function startNewGame() {

    resetGame();

    gameState = GAME_INITIALIZED;

    if (testMode == true) {
        trace("Testmode");
        shuffledLocations = [];
        for (var i in encounters) {
            shuffledLocations.push(i);
        }
    }

    registerNewGame();

    var qrCodeContainer = document.createElement("div");
    renderQRCodeGameSeed(qrCodeContainer, JSON.stringify(shuffledLocations), "#000000");

    showModal({
        message: "Nytt spel!",
        callback: () => sendGameStartedEvent(),
        element: qrCodeContainer,
        secondMessage: "Andra kan skanna koden här för att joina ditt spel. Tryck OK för att starta spelet!"
    });
}

function sendGameStartedEvent() {
    db.sendGameEvent(currentGameId, "gameStarted", playerId);
}

function showModal(options) {
    var modal = document.createElement("div");
    modal.classList.add("modal");

    var modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    var messageElement = document.createElement("p");
    messageElement.textContent = options.message;
    messageElement.classList.add("large");
    modalContent.appendChild(messageElement);

    if (options.secondMessage) {
        var secondMessageElement = document.createElement("p");
        secondMessageElement.textContent = options.secondMessage;
        secondMessageElement.classList.add("small");
        modalContent.appendChild(secondMessageElement);
    }

    if (options.element) {
        let el = options.element;
        el.classList.add("modal-content-center-element");
        modalContent.appendChild(el);
    }

    var okButton = document.createElement("button");
    okButton.textContent = options.buttonText ?? "OK";
    okButton.classList.add("modal-button");

    okButton.addEventListener("click", function () {
        modal.remove();
        if (options.callback) {
            options.callback();
        }
    });

    modalContent.appendChild(okButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
}

function updateScore() {
    var moneyElement = document.querySelector("#score");
    moneyElement.textContent = money.toString() + " kr";

    var foundDiamondElement = document.querySelector("#found-diamond");
    // if (foundDiamond) {
    //   foundDiamondElement.textContent = "Du hittade diamanten!";
    // }
    // else {
    //   foundDiamondElement.textContent = "";
    // }

    // var finishTimeElement = document.querySelector("#finish-time");
    // if (gameState == GAME_FINISHED) {
    //   var timeInSeconds = finishTime / 1000;
    //   var seconds = Math.floor(timeInSeconds % 60);
    //   var minutes = Math.floor(timeInSeconds / 60);
    //   finishTimeElement.textContent = "TID: " + minutes + "m " + seconds + "s";
    // }
    // else {
    //   finishTimeElement.textContent = "";
    // }

    // banditContainer.textContent = "";
    // for (var i = 0; i < banditMarkers; i++) {
    //   var banditImage = document.createElement("img");
    //   banditImage.src = "bandit.jfif";
    //   banditImage.style.width = "50px";
    //   banditImage.style.height = "50px";
    //   banditImage.style.marginRight = "10px";
    //   banditContainer.appendChild(banditImage);
    // }
}
// Bing Chat
function saveStateObject() {
    localStorage.setItem("state", JSON.stringify(state));
}

function loadStateObject() {
    var savedState = localStorage.getItem("state");
    if (savedState) {
        state = JSON.parse(savedState);
        return true;
    }
    else {
        resetState();
        return false;
    }
}

function resetStateObject() {
    Object.assign(state, {
        gameState: GAME_NOT_STARTED,
        money: 0,
        foundDiamond: false,
        shuffledLocations: [],
        visitedLocations: [],
        startTime: new Date().getTime(),
        banditMarkers: 0
    });
}


function loadState() {
    var parsedGameState = parseInt(localStorage.getItem("gameState"));
    if (isNaN(parsedGameState)) {
        resetState();
        return false;
    }
    else {
        gameState = parsedGameState;
    }
    playerFinished = JSON.parse(localStorage.getItem("playerFinished"));
    currentGameId = JSON.parse(localStorage.getItem("gameId"));
    shuffledLocations = JSON.parse(localStorage.getItem("shuffledLocations"));
    visitedLocations = JSON.parse(localStorage.getItem("visitedLocations")) ?? [];
    money = parseInt(localStorage.getItem("money")) ?? 0;
    foundDiamond = localStorage.getItem("foundDiamond") == "true";
    startTime = parseFloat(localStorage.getItem("startTime"));
    banditMarkers = parseInt(localStorage.getItem("banditsEncountered")) ?? 0;
    return true;
}

function saveState() {
    localStorage.setItem("playerFinished", JSON.stringify(playerFinished));
    localStorage.setItem("gameId", JSON.stringify(currentGameId));
    localStorage.setItem("shuffledLocations", JSON.stringify(shuffledLocations));
    localStorage.setItem("visitedLocations", JSON.stringify(visitedLocations));
    localStorage.setItem("gameState", gameState.toString());
    localStorage.setItem("money", money.toString());
    localStorage.setItem("foundDiamond", foundDiamond.toString());
    localStorage.setItem("startTime", startTime.toString());
    localStorage.setItem("banditsEncountered", banditMarkers.toString());
}

function resetState() {
    gameState = GAME_NOT_STARTED;
    money = 0;
    foundDiamond = false;
    foundTreasures = [];
    shuffledLocations = [];
    visitedLocations = [];
    playerFinished = false;
    for (var i in encounters) {
        shuffledLocations.push(i);
    }
    shuffle(shuffledLocations);

    startTime = new Date().getTime();
    banditMarkers = 0;
    saveState();
}

function resetGame() {
    resetState();
    updateGameState();
}

function updateGameState() {
    updateTreasureGrid();
    updateScore();
}

function renderQRCodeGameSeed(element, text, color) {
    trace("rendering");
    var url = "https://farbrormartin.github.io/QR-ai";
    var innerDiv = document.createElement("div");
    element.textContent = "";
    element.appendChild(innerDiv);
    innerDiv.classList.add("qr-code");
    var qrcode = new QRCode(innerDiv, {
        text: url + "?gameid=" + currentGameId + "&gameseed=" + text,
        width: Math.min(window.innerWidth * 0.6, 300),
        height: Math.min(window.innerWidth * 0.6, 300),
        colorDark: color,
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    element.querySelector("img").classList.add("qr-code");
}

function toggleScanner() {
    setScannerState(videoContainer.classList.contains("hidden"));
}

function setScannerState(active) {
    if (active) {
        scanner.start();
        videoContainer.classList.remove("hidden");
        gameContainer.classList.add("hidden");
        scanButton.classList.add("active");

    } else {
        videoContainer.classList.add("hidden");
        gameContainer.classList.remove("hidden");
        scanButton.classList.remove("active");
        scanner.stop();
    }
}

function handleEncounterBing(location) {
    if (gameState == GAME_INITIALIZED) {
        showModal("Vänta på att ledaren startar spelet.");
    }
    else if (gameState == GAME_NOT_STARTED) {
        showModal("Börja med att skanna Start-koden.");
    }
    else if (gameState == GAME_FINISHED) {
        showModal("Spelet är slut, skanna Start-koden för att spela igen.");
    }
    else {
        visitedLocations.push(location);
        let shufffledLoc = shuffledLocations[location];
        let encounter = encounters[shufffledLoc];
        //isItemCollected = false;  
        trace(encounter);
        if (encounter == "bandit") {
            trace("bandit");
            handleBandit();
        }
        else if (encounters.includes(encounter)) {
            trace("treasure");
            handleTreasureFound(encounter);
        }
        else {
            showModal({
                message: "Det var ingenting här... :(",
                callback: function () {
                    errorSound.play();
                }
            });
        }
    }
}

function handleBandit() {
    banditMarkers += 1;
    banditEncounterSound.play();
    let banditImg = document.createElement("img");
    banditImg.classList.add("bandit-marker");
    banditImg.src = banditImage;
    banditContainer.appendChild(banditImg);
    showModal({
        message: "Banditer!!",
        element: banditImg,
        buttonText: "Fly!!",
        callback: () => {
            let escapeMessage = ""
            if (banditMarkers == 3) {
                escapeMessage = "Banditerna tar alla dina pengar!";
                money = 0;
                banditCaughtSound.play();
            }
            else {
                escapeMessage = "Du lyckas fly!";
                banditEscapeSound.play();
            }
            showModal({
                message: escapeMessage,
                callback: () => {
                    saveState();
                    updateScore();
                }

            })

        }
    });

    // if (banditMarkers == 3) {
    //     money = 0;
    //     banditContainer.innerHTML = "";
    //     banditMarkers = 0;
    //     showModal({
    //         message: "Banditer! De stjäl alla dina pengar! :(",
    //         element: banditImg,
    //         callback: () => {
    //             money = 0;
    //             saveState();
    //             updateScore();
    //         }
    //     });
    // }
    // else{
    //     showModal({
    //         message: "Banditer! Du flyr i sista sekunden!",
    //         element: banditImg,
    //         callback: () => {
    //             saveState();
    //             updateScore();
    //         }
    //     });
    // }
}

function beginGameEndCountdown() {
    startCountdown(60);
}

function startCountdown(durationInSeconds) {
    let remainingTime = durationInSeconds;
    overlayText.classList.toggle("hidden", false);

    // Update the countdown every second
    const intervalId = setInterval(() => {
        // Calculate minutes and seconds from remainingTime
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;

        // Display the result in the element with id="countdown"
        //overlayText.textContent = "Spelet avslutas om " +  `${minutes}:${seconds.toString().padStart(2, '0')}` + " sekunder.";
        overlayText.textContent = "Tid kvar " + `${remainingTime.toString().padStart(2, '0')}` + " sekunder.";
        // Decrease the remaining time
        remainingTime--;

        if (gameState == GAME_FINISHED) {
            clearInterval(intervalId);
            overlayText.textContent = "Väntar på ledaren...";
            overlayText.classList.toggle("hidden", true);
        }
        // When the countdown is over, clear the interval
        else if (remainingTime < 0) {
            clearInterval(intervalId);
            overlayText.textContent = 'Spelet är slut.';
            if (gameState == GAME_IN_PROGRESS) {
                sendGameOverEvent();
            }
        }

    }, 1000);
}

function sendGameOverEvent() {
    console.log("Sending game over for " + currentGameId);
    db.setGameState(currentGameId, false); // TODO: use a proper game state instead of just a bool
    db.sendGameEvent(currentGameId, "gameOver", playerId);
}

function handleTreasureFound(treasure) {
    let treasureData = treasures[treasure];
    let treasureValue = getValueForTreasure(treasure);
    let treasureImg = document.createElement("img");
    treasureImg.classList.add("treasure-image");
    treasureImg.src = treasureData.image;
    treasureData.sound.play();
    trace("handle treasure");
    if (treasure == "diamond") {

        sendFindTreasureEvent();
    }
    showModal({
        message: "Du hittade " + treasureData.name + "!",
        callback: () => {

            money += treasureValue;
            foundTreasures.push(treasure);
            saveState();
            updateScore();
            updateTreasureGrid();
        },
        element: treasureImg,
        secondMessage: treasureValue.toString() + "kr!"

    });
}

function updateTreasureGrid() {
    for (let i = 0; i < gemSlots.length; i++) {
        if (foundTreasures.length > i) {
            let treasureKey = foundTreasures[i];
            gemSlots[i].style.backgroundImage = "url('" + treasures[treasureKey].image + "')";
        }
        else {
            gemSlots[i].style.backgroundImage = "none";
        }
    }
    // for (let i in foundTreasures) {
    //   if (i < gemSlots.length) {
    //     gemSlots[i].style.backgroundImage = "url('" + gemsFound[i] + "')";
    //   }
    // }
}

// function collectItem() {
//   if (isItemCollected || foundItem === "none" || foundItem === "bandit") return;

//   if (foundItem === "coins") {
//     money += 1000;
//     coinsSound.play();
//   } else if (foundItem === "diamond") {
//     money += 10000;
//     foundDiamond = true;
//     diamondSound.play();
//   }

//   colorBlock.style.backgroundImage = '';  // Clear image
//   foundItem = "";  // Clear found item
//   isItemCollected = true;

//   saveState();
//   updateScore();
// }

function getValueForTreasure(treasure) {
    if (treasures.hasOwnProperty(treasure)) {
        return treasures[treasure].value * 1000;
    }
    else {
        return 0;
    }
}

function handleStartScanned() {
    db.getGame(currentGameId, (gameData) => {
        if (gameData && gameData.in_progress) {
            // The game is in progress, so continue with this game
            console.log("Game in progress. Continuing game with ID: " + currentGameId);

            if (!playerFinished) {
                finishTime = new Date().getTime() - startTime;
                var timeInSeconds = finishTime / 1000;
                var seconds = Math.floor(timeInSeconds % 60);
                var minutes = Math.floor(timeInSeconds / 60);
                playerFinished = true;
                saveState();

            }
            else {
                startNewGame();
            }
        }
        else {

            // No game found, or the game is finished, start a new game
            console.log("No game in progress found. Starting a new game.");
            startNewGame();
        }
    });


    // if (gameState === GAME_NOT_STARTED || gameState === GAME_FINISHED || !currentGameId ) {
    //   startNewGame();
    // }
    // else if (gameState === GAME_IN_PROGRESS) {


    // }
}

function handleSeedScanned(gameId, seed) {
    try {
        const parsedSeedData = JSON.parse(seed);

        showModal({
            message: "Spelinfo inläst. Tryck OK för att gå med i spelet.",
            callback: () => {
                joinGame(gameId, parsedSeedData);

            }
        });

    } catch (error) {
        showModal({
            message: "Något blev fel vid inläsningen av QR-koden. Prova att skanna igen, eller börja om med en ny kod."
        });
    }
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

function trace(message) {
    return;
    //     let el = document.createElement("div");
    //     el.textContent=message;
    //     document.querySelector("body").appendChild(el);
}

function adjustHeight() {
    const viewHeight = window.innerHeight;
    document.querySelector('.main-container').style.height = `${viewHeight}px`;
}

window.addEventListener('resize', adjustHeight);
window.addEventListener('load', adjustHeight);



// // Your Firebase configuration
// const firebaseConfig = {
//   apiKey: "AIzaSyCKFBJPXhk_mFUBcCKWW4iz-ujwps_fIhM",
//   authDomain: "martins-push-poc.firebaseapp.com",
//   databaseURL: "https://martins-push-poc-default-rtdb.europe-west1.firebasedatabase.app",
//   projectId: "martins-push-poc",
//   storageBucket: "martins-push-poc.appspot.com",
//   messagingSenderId: "701298343921",
//   appId: "1:701298343921:web:cfed3991609cea60740e50"
// };

// // Initialize Firebase
// firebase.initializeApp(firebaseConfig);
// const database = firebase.database();



function joinGame(id, locations) {
    resetGame();
    currentGameId = id;
    shuffledLocations = locations;

    db.joinGame(currentGameId, playerId);
    document.querySelector("#waiting-for-game-text").classList.toggle("hidden", false);
    listenForEvents();
}

function sendFindTreasureEvent() {
    if (!currentGameId) {
        console.log('findTreasure() without joining game first.');
        return;
    }

    // 
    db.sendGameEvent(currentGameId, "treasureFound", playerId);
}

// function deleteOldGames() {
//   const gamesRef = database.ref('games');
//   const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
//   gamesRef.once('value').then(snapshot => {
//     snapshot.forEach(gameSnapshot => {
//       if (snapshot.val().timestamp < oneDayAgo) {
//         gameSnapshot.ref.remove();
//       }
//     })


//   });
// }

function registerNewGame() {
    db.deleteOldGames();
    currentGameId = 'game_' + Math.random().toString(36).substr(2, 9);
    db.registerNewGame(currentGameId, shuffledLocations);

    joinGame(currentGameId, shuffledLocations);
}



function listenForEvents() {
    db.listenForGameEvents(currentGameId, (event) => {
        console.log("Received event " + event.action + " for " + currentGameId);
        if (event.action === 'treasureFound') {
            if (event.byPlayer != playerId) {
                showModal({ message: "Diamanten är hittad, skynda dig till start!" });
            }
            beginGameEndCountdown();
        }
        else if (event.action === "gameStarted") {
            gameState = GAME_IN_PROGRESS;
            whistleSound.play();
            startTime = new Date().getTime();
            overlayText.classList.toggle("hidden", true);
            saveState();
        }
        else if (event.action === "gameOver") {
            console.log("Received game over.");
            if (gameState == GAME_IN_PROGRESS) {
                finishGameSound.play();
                overlayText.classList.toggle("hidden", true)
                if (playerFinished) {
                    showModal({ message: "Du hann tillbaka med " + money.toString() + " kr!" });

                }
                else {
                    showModal({ message: "Tyvärr hann du inte tillbaka i tid :(" });
                    money = 0;

                }
            }
            gameState = GAME_FINISHED;
            updateGameState();
            saveState();
        }
    });

    db.listenForPlayerAdded(currentGameId, (event) => {
        console.log("event playerId:" + event.key + " playerId:" + playerId);
        if (event.key !== playerId) {
            console.log("Displaying notification");
            //displayNotification('Player ' + snapshot.key + ' joined the game');
            showPopup("Spelare " + event.key + " joinade!");
        }
        //updatePlayerList();
    }
    );
}

function displayNotification(messageText) {
    showModal({
        message: messageText
    });
}

function showPopup(messageText) {
    let popup = document.createElement("div");
    popup.classList.add("timed-popup");
    popup.textContent = messageText;
    let body = document.querySelector("body");
    body.appendChild(popup)
    setTimeout(() => body.removeChild(popup), 3000);
}

if (window.location.hostname == "localhost") {
    testMode = true;
}
testMode = true;
document.querySelector("button").addEventListener("click", () => clickSound.play());
document.querySelector(".frame").addEventListener("click", () => document.querySelector(".top-gem").classList.toggle("hidden"));
// Initialization
trace("initializing");
loadState();
scanQRCode(new URLSearchParams(window.location.search));
updateGameState();
console.log("Gamestate: " + gameState.toString());

// for (let i= 1; i<10; i++){
//   setTimeout(() => showPopup("Hello "+i.toString()), 1000*i);
// }
//}
// catch (error){
//     let el = document.createElement("div");
//     el.textContent=error;
//     document.querySelector("body").appendChild(el);
// }

