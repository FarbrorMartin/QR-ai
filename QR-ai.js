import QrScanner from "./qrscan/qr-scanner.min.js";
try{
"use strict";
// Constants
const GAME_NOT_STARTED = 0;
const GAME_IN_PROGRESS = 1;
const GAME_FINISHED = 2;
const scanHideShowDelay = 500;
const encounters = ["bandit", "bandit", "bandit", "diamond", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins"];

// Sound initialization
const correctSound = new Audio("Stinger15.mp3");
const errorSound = new Audio("wrong.wav");
const banditSound = new Audio("Stinger16.mp3");
const coinsSound = new Audio("Coins_Drop_Carpet_05.wav");
const diamondSound = new Audio("Stinger_1.mp3");
const whistleSound = new Audio("whistle.wav");
const finishGameSound = new Audio("Stinger_13.mp3");

// Images
const coinsImage = "url('coins.jfif')";
const diamondImage = "url('diamond.jfif')";
const banditImage = "url('bandit.jfif')";

// Global Variables
let gameState = GAME_NOT_STARTED;
let money = 0;
let foundDiamond = false;
let banditMarkers = 0;
let shuffledLocations = [];
let visitedLocations = [];
let lastScannedCode = parseInt(localStorage.getItem("lastScannedCode")) || 0;
let expectedColorIndex = 1;
let score = parseInt(localStorage.getItem("score")) || 0;
let finishTime = 0;
let startTime = new Date().getTime();
let isProcessingScanResult = false;

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
const scanButton = document.querySelector("#toggle-scan-button");
const colorBlock = document.querySelector("#color-block");
const banditContainer = document.querySelector("#bandit-marker-container");
const qrcodeContainer = document.querySelector("#qrcode-container");


// QR Scanner
const scanner = new QrScanner(video, result => handleScanResult(result), {
    onDecodeError: error => console.log(error),
    highlightScanRegion: true,
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
        const gameSeed = urlParams.get("gameseed");
        const location = urlParams.get("location");
        if (gameSeed !== null) handleSeedScanned(gameSeed);
        else if (location === null || location === "start") handleStartScanned();
        else if (visitedLocations.includes(location)) errorSound.play();
        else showModal("Klicka för söka igenom platsen!", () => handleEncounterBing(location));
        isProcessingScanResult = false;
    }, scanHideShowDelay);
}



function startNewGame(locationList) {
    resetGame();
    shuffledLocations = locationList ?? shuffledLocations;
    gameState = GAME_IN_PROGRESS;
    startTime = new Date().getTime();

    var qrCodeContainer = document.createElement("div");
    renderQRCodeGameSeed(qrCodeContainer, JSON.stringify(shuffledLocations), "#000000");
    
    showModal("Tryck på OK för att börja spela.", null, qrCodeContainer, "Andra spelare kan skanna QR-koden här för att spela samma bana.");
    whistleSound.play();
}

function showModal(message, callback, element, secondMessage) {
    var modal = document.createElement("div");
    modal.classList.add("modal");

    var modalContent = document.createElement("div");
    modalContent.classList.add("modal-content");

    var messageElement = document.createElement("p");
    messageElement.textContent = message;
    modalContent.appendChild(messageElement);

    if (secondMessage){
        var secondMessageElement = document.createElement("p");
        secondMessageElement.textContent = secondMessage;
        secondMessageElement.style.fontSize = "30px";
        modalContent.appendChild(secondMessageElement);

    }

    if (element) {
        modalContent.appendChild(element);
    }

    var okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.classList.add("modal-button");

    okButton.addEventListener("click", function () {
        modal.remove();
        if (callback) {
            callback();
        }
    });

    modalContent.appendChild(okButton);

    modal.appendChild(modalContent);

    document.body.appendChild(modal);
}

function updateScore() {
    var moneyElement = document.querySelector("#money");
    moneyElement.textContent = "PENGAR: " + money.toString();

    var foundDiamondElement = document.querySelector("#found-diamond");
    if (foundDiamond) {
        foundDiamondElement.textContent = "Du hittade diamanten!";
    }
    else {
        foundDiamondElement.textContent = "";
    }

    var finishTimeElement = document.querySelector("#finish-time");
    if (gameState == GAME_FINISHED) {
        var timeInSeconds = finishTime / 1000;
        var seconds = Math.floor(timeInSeconds % 60);
        var minutes = Math.floor(timeInSeconds / 60);
        finishTimeElement.textContent = "TID: " + minutes + "m " + seconds + "s";
    }
    else {
        finishTimeElement.textContent = "";
    }
    banditContainer.textContent = "";
    for (var i = 0; i < banditMarkers; i++) {
        var banditImage = document.createElement("img");
        banditImage.src = "bandit.jfif";
        banditImage.style.width = "50px";
        banditImage.style.height = "50px";
        banditImage.style.marginRight = "10px";
        banditContainer.appendChild(banditImage);
    }
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
    if (parsedGameState == null) {
        resetState();
        return false;
    }
    else {
        gameState = parsedGameState;
    }

    shuffledLocations = JSON.parse(localStorage.getItem("shuffledLocations"));
    visitedLocations = JSON.parse(localStorage.getItem("visitedLocations"));
    money = parseInt(localStorage.getItem("money")) || 0;
    foundDiamond = localStorage.getItem("foundDiamond") == "true";
    startTime = parseFloat(localStorage.getItem("startTime"));
    banditMarkers = parseInt(localStorage.getItem("banditsEncountered")) || 0;
    return true;
}

function saveState() {
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
    shuffledLocations = [];
    visitedLocations = [];
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
    updateScore();
}

function renderQRCodeGameSeed(element, text, color) {
    var url = "https://farbrormartin.github.io/QR-ai";
    var innerDiv = document.createElement("div");
    element.textContent = "";
    element.appendChild(innerDiv);
    var qrcode = new QRCode(innerDiv, {
        text: url + "?gameseed=" + text,
        width: 300,
        height: 300,
        colorDark: color,
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

function toggleScanner() {
    setScannerState(videoContainer.classList.contains("hidden"));
}

function setScannerState(active) {
    if (active) {
        videoContainer.classList.remove("hidden");
        scanner.start();
    } else {
        videoContainer.classList.add("hidden");
        scanner.stop();
    }
}

function handleEncounterBing(location) {
    visitedLocations.push(location);
    var shufffledLoc = shuffledLocations[location];
    var encounter = encounters[shufffledLoc];
    isItemCollected = false;  

    if (encounter == "coins") {
        colorBlock.style.backgroundImage = coinsImage;
        foundItem = "coins";  // Set the found item
    } else if (encounter == "diamond") {
        colorBlock.style.backgroundImage = diamondImage;
        foundItem = "diamond";  // Set the found item
    }
    else if (encounter == "bandit") {
        showModal("Ånej! En bandit är här!", function () {
            banditMarkers++;
            if (banditMarkers == 3) {
                money = 0;
                banditContainer.innerHTML = "";
                banditMarkers = 0;
                showModal("Du förlorade alla dina pengar!", function () {
                    saveState();
                    updateScore();
                });
            }
            else {
                showModal("Du fick ett banditmärke - tre märken betyder att du !", function () {
                    saveState();
                    updateScore();
                });
            }
        });
    }
    else {
        showModal("Det var ingenting här... :(", function () {
            errorSound.play();
        });
    }
}

function collectItem() {
    if (isItemCollected || foundItem === "none" || foundItem === "bandit") return;

    if (foundItem === "coins") {
        money += 1000;
        coinsSound.play();
    } else if (foundItem === "diamond") {
        money += 10000;
        foundDiamond = true;
        diamondSound.play();
    }

    colorBlock.style.backgroundImage = '';  // Clear image
    foundItem = "";  // Clear found item
    isItemCollected = true;  

    saveState();
    updateScore();
}

function handleStartScanned() {
    if (gameState === GAME_NOT_STARTED || gameState === GAME_FINISHED) {
         startNewGame();
    } else if (gameState === GAME_IN_PROGRESS) {
        finishTime = new Date().getTime() - startTime;
        var timeInSeconds = finishTime / 1000;
        var seconds = Math.floor(timeInSeconds % 60);
        var minutes = Math.floor(timeInSeconds / 60);
        showModal("Du blev klar på " + minutes + " min och " + seconds + " sek!", function () {
            finishGameSound.play();
            gameState = GAME_FINISHED;
            updateGameState();
            saveState();
        });
    }
}

function handleSeedScanned(seed) {
    try {
        const parsedArray = JSON.parse(seed);
        showModal("Bana inläst. Tryck på OK för att börja!", ()=>{
            startNewGame(parsedArray);
        });
        
    } catch (error) {
        showModal("Något blev fel vid inläsningen av QR-koden. Prova att skanna igen, eller börja om med en ny kod.");
    }
}

function shuffle(array) {
    array.sort(() => Math.random() - 0.5);
}

// Initialization
loadState();
scanQRCode(new URLSearchParams(window.location.search));
updateGameState();
console.log("Gamestate: " + gameState.toString());
}
catch (exception){
    console.log(exception);
}