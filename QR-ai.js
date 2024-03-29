"use strict";
import QrScanner from "./qrscan/qr-scanner.min.js";
// try{
// Constants
const GAME_NOT_STARTED = 0;
const GAME_IN_PROGRESS = 1;
const GAME_FINISHED = 2;
const scanHideShowDelay = 500;

// Sound initialization
const correctSound = new Audio("Stinger15.mp3");
const errorSound = new Audio("wrong.wav");
const banditEncounterSound = new Audio("maleb_laugh.mp3");
const banditCaughtSound = new Audio("evil_laughter.mp3");
const banditEscapeSound = new Audio("event_15.mp3");
const coinsSound = new Audio("Coins_Drop_Carpet_05.wav");
const diamondSound = new Audio("Stinger_1.mp3");
const gemSound = new Audio("Glass_2.wav");
const whistleSound = new Audio("whistle2.wav");
const finishGameSound = new Audio("Stinger_13.mp3");
const clickSound = new Audio("clicky button low.wav");

// Images
const banditImage = "bandit.jfif";

// treasures
const encounters = ["bandit", "bandit", "bandit", "diamond", "ruby", "ruby", "sapphire", "sapphire", "emerald", "emerald", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins", "coins"];
const treasures = {
    diamond: {
        value: 100,
        image: "diamond.png",
        name: "diamanten",
        sound: diamondSound
    },
    ruby: {
        value: 50,
        image: "ruby.png",
        name: "en rubin",
        sound: gemSound,
    },
    emerald: {
        value: 40,
        image: "emerald.png",
        name: "en smaragd",
        sound: gemSound,
    },
    sapphire: {
        value: 30,
        image: "sapphire.png",
        name: "en safir",
        sound: gemSound,
    },
    topaz: {
        value: 20,
        image: "topas.png",
        name: "en topas",
        sound: gemSound,
    },
    coins: {
        value: 5,
        image: "coins.jfif",
        name: "en hög guldmynt",
        sound: coinsSound,
    }
};



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
        else showModal({
            message: "Klicka för söka igenom platsen!",
            callback: () => handleEncounterBing(location)
        });
        isProcessingScanResult = false;
    }, scanHideShowDelay);
}



function startNewGame(locationList) {

    resetGame();
    shuffledLocations = locationList ?? shuffledLocations;
    gameState = GAME_IN_PROGRESS;
    startTime = new Date().getTime();

    if (window.location.hostname == "localhost") {
        trace("Testmode");
        shuffledLocations = [];
        for (var i in encounters) {
            shuffledLocations.push(i);
        }
    }

    var qrCodeContainer = document.createElement("div");
    renderQRCodeGameSeed(qrCodeContainer, JSON.stringify(shuffledLocations), "#000000");

    showModal({
        message: "Nytt spel!",
        callback: () => whistleSound.play(),
        element: qrCodeContainer,
        secondMessage: "Tryck ok för att starta eller låt andra skanna koden här för att joina ditt spel."
    });



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
    var moneyElement = document.querySelector("#money");
    moneyElement.textContent = money.toString() + " kr";

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
    if (isNaN(parsedGameState)) {
        resetState();
        return false;
    }
    else {
        gameState = parsedGameState;
    }

    shuffledLocations = JSON.parse(localStorage.getItem("shuffledLocations"));
    visitedLocations = JSON.parse(localStorage.getItem("visitedLocations")) ?? [];
    money = parseInt(localStorage.getItem("money")) ?? 0;
    foundDiamond = localStorage.getItem("foundDiamond") == "true";
    startTime = parseFloat(localStorage.getItem("startTime"));
    banditMarkers = parseInt(localStorage.getItem("banditsEncountered")) ?? 0;
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
    trace("rendering");
    var url = "https://farbrormartin.github.io/QR-ai";
    var innerDiv = document.createElement("div");
    element.textContent = "";
    element.appendChild(innerDiv);
    innerDiv.classList.add("qr-code");
    var qrcode = new QRCode(innerDiv, {
        text: url + "?gameseed=" + text,
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
        videoContainer.classList.remove("hidden");
        scanButton.classList.add("active");
        scanner.start();
    } else {
        videoContainer.classList.add("hidden");
        scanButton.classList.remove("active");
        scanner.stop();
    }
}

function handleEncounterBing(location) {
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

function handleBandit() {
    banditMarkers += 1;
    banditEncounterSound.play();
    let banditImg = document.createElement("img");
    banditImg.classList.add("treasure-image");
    banditImg.src = banditImage;
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

function handleTreasureFound(treasure) {
    let treasureData = treasures[treasure];
    let treasureValue = getValueForTreasure(treasure);
    let treasureImg = document.createElement("img");
    treasureImg.classList.add("treasure-image");
    treasureImg.src = treasureData.image;
    treasureData.sound.play();
    trace("handle treasure");
    showModal({
        message: "Du hittade " + treasureData.name + "!",
        callback: () => {

            money += treasureValue;
            saveState();
            updateScore();
        },
        element: treasureImg,
        secondMessage: treasureValue.toString() + "kr!"

    });
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

function getValueForTreasure(treasure) {
    if (treasures.hasOwnProperty(treasure)) {
        return treasures[treasure].value * 1000;
        // let originalValue = treasures[treasure].value;
        // let randRange = 0.2;
        // let randomFactor = (Math.random() * 2*randRange)-randRange;

        // let randomizedValue = originalValue + originalValue*randomFactor;
        // return Math.round(randomizedValue);
    }
    else {
        return 0;
    }
}

function handleStartScanned() {
    if (gameState === GAME_NOT_STARTED || gameState === GAME_FINISHED) {
        startNewGame();
    } else if (gameState === GAME_IN_PROGRESS) {
        finishTime = new Date().getTime() - startTime;
        var timeInSeconds = finishTime / 1000;
        var seconds = Math.floor(timeInSeconds % 60);
        var minutes = Math.floor(timeInSeconds / 60);
        showModal({
            message: "Du blev klar på " + minutes + " min och " + seconds + " sek!",
            callback: function () {
                finishGameSound.play();
                gameState = GAME_FINISHED;
                updateGameState();
                saveState();
            }
        });
    }
}

function handleSeedScanned(seed) {
    try {
        const parsedArray = JSON.parse(seed);
        showModal({
            message: "Bana inläst. Tryck på OK för att börja!",
            callback: () => {
                startNewGame(parsedArray);
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


document.querySelector("button").addEventListener("click", () => clickSound.play());

// Initialization
trace("initializing");
loadState();
scanQRCode(new URLSearchParams(window.location.search));
updateGameState();
console.log("Gamestate: " + gameState.toString());
//}
// catch (error){
//     let el = document.createElement("div");
//     el.textContent=error;
//     document.querySelector("body").appendChild(el);
// }