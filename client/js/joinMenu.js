import { global } from "./global.js";
import { _startGame } from "./app.js";
import { multiplayer } from "./multiplayer.js";
import { openModBrowser } from "./mainmenu.js";
import { util } from "./util.js";

/*
== NOTE ==
using .click() on an element such as a filter element will not automatically refresh the ui
*/

const closeButton = document.getElementById("gameJoinClose");
closeButton.onclick = openJoinScreen;
function openJoinScreen(close) {
    let mb = document.getElementById("gameJoinScreen");
    if (close === true || mb.style.zIndex == "101") {
        mb.style.opacity = 0;
        setTimeout(() => {
            mb.style.zIndex = "-101";
        }, 200);
    } else if (!window.gameLaunched) {
        mb.style.zIndex = "101";
        mb.style.opacity = 1;
    }
}

const roomGalleryTemplate = document.getElementById("joinEntryGalleryTemplate");
roomGalleryTemplate.style.display = "none";

const roomListTemplate = document.getElementById("joinEntryListTemplate");
roomListTemplate.style.display = "none";

const modListTemplate = document.getElementById("modListTemplate");
modListTemplate.children[1].style.display = "none";
modListTemplate.style.display = "none";

const roomInfoPlayerCount = document.getElementById("roomInfoPlayerAmount");
const roomInfoGamemode = document.getElementById("roomInfoGamemode");
const roomInfoGamemodeImage = document.getElementById("roomInfoGamemodeImage");
const roomInfoGamemodeDescription = document.getElementById(
    "roomInfoGamemodeDescription",
);
const roomInfoSettingsMaxPlayerInput = document.getElementById(
    "roomInfoSettingsMaxPlayerInput",
);
const roomInfoSettingsMaxBotsInput = document.getElementById(
    "roomInfoSettingsMaxBotsInput",
);

let playerCount = 0;
let maxPlayerCount = 99;
let gamemodeName = "";
let gamemodeImage = "";
let gamemodeDescription = "";
let selectedGamemode = "";
let selectedRoomId = "";
let maxPlayers = 99;
let maxBots = 10;
resetRoomInfo();
function resetRoomInfo() {
    gamemodeName = "Welcome!";
    gamemodeImage = "";
    gamemodeDescription =
        "Select a room to join other players or click create and host a room for others to join.";
}
function updateRoomInfo() {
    roomInfoPlayerCount.innerText = `${playerCount}${maxPlayerCount !== 99 ? `/${maxPlayerCount}` : ""}`;
    roomInfoGamemode.innerText = gamemodeName;
    if (gamemodeImage === "") {
        roomInfoGamemodeImage.style.display = "none";
    } else {
        roomInfoGamemodeImage.style.display = "block";
    }
    roomInfoGamemodeImage.src = gamemodeImage;
    roomInfoGamemodeDescription.innerText = gamemodeDescription;
    if (maxPlayers < 1) {
        roomInfoSettingsMaxPlayerInput.value = 1;
        maxPlayers = 1;
    } else if (maxPlayers > 99) {
        roomInfoSettingsMaxBotsInput.value = 99;
        maxPlayers = 99;
    }
    if (maxBots < 0) {
        roomInfoSettingsMaxBotsInput.value = 0;
        maxBots = 0;
    }
}

roomInfoSettingsMaxPlayerInput.oninput = function() {
    maxPlayers = Number(roomInfoSettingsMaxPlayerInput.value);
};
roomInfoSettingsMaxPlayerInput.value = maxPlayers;

roomInfoSettingsMaxBotsInput.oninput = function() {
    maxBots = Number(roomInfoSettingsMaxBotsInput.value);
};
roomInfoSettingsMaxBotsInput.value = maxBots;

const nameInput = document.getElementById("nameInput");
nameInput.oninput = function() {
    util._submitToLocalStorage("nameInput");
};

const tokenInput = document.getElementById("tokenInput");
tokenInput.oninput = function() {
    util._submitToLocalStorage("tokenInput");
};

const joinButton = document.getElementById("joinActionButton");
joinButton.onclick = function() {
    if (window.creatingRoom === false && selectedRoomId === "") {
        return;
    }
    openModBrowser(true);
    openJoinScreen(true);
    if (global._disconnected && global._gameStart) return;
    window.gameLaunched = true;
    _startGame(
        selectedGamemode,
        selectedRoomId,
        Math.min(99, Math.max(1, maxPlayers)),
        maxBots,
    );
};
document.addEventListener("keydown", function eh(e) {
    if (global._disconnected && global._gameStart) return;
    let key = e.which || e.keyCode;
    if (document.getElementById("gameJoinScreen").style.zIndex !== "101") return;
    this.removeEventListener("keydown", eh);
    if (!global._disableEnter && key === global.KEY_ENTER && !global._gameStart)
        joinButton.click();
});

let createFilter = "join";
const joinFilter = document.getElementById("joinFilter");
const hostFilter = document.getElementById("hostFilter");
function createFilterClick(e) {
    if (typeof this === "string") createFilter = this;
    if (createFilter === "host") {
        // if we clicked join
        joinFilter.classList.remove("joinSearchButtonUnselected");
        joinFilter.classList.add("joinSearchButtonSelected");
        hostFilter.classList.remove("joinSearchButtonSelected");
        hostFilter.classList.add("joinSearchButtonUnselected");
        createFilter = "join";
        window.creatingRoom = false;
        if (e.isTrusted === false) return;
        clearGamemodes();
        clearRooms();
        showRooms();
    } else {
        // if we clicked host
        hostFilter.classList.remove("joinSearchButtonUnselected");
        hostFilter.classList.add("joinSearchButtonSelected");
        joinFilter.classList.remove("joinSearchButtonSelected");
        joinFilter.classList.add("joinSearchButtonUnselected");
        createFilter = "host";
        window.creatingRoom = true;
        if (e.isTrusted === false) return;
        clearGamemodes();
        clearRooms();
        showGamemodes();
    }
}
joinFilter.onclick = createFilterClick.bind("host");
hostFilter.onclick = createFilterClick.bind("join");

let roomFilter = "gallery";
const galleryFilter = document.getElementById("galleryFilter");
const listFilter = document.getElementById("listFilter");
function roomFilterClick(e) {
    if (typeof this === "string") roomFilter = this;
    if (roomFilter === "list") {
        galleryFilter.classList.remove("joinSearchButtonUnselected");
        galleryFilter.classList.add("joinSearchButtonSelected");
        listFilter.classList.remove("joinSearchButtonSelected");
        listFilter.classList.add("joinSearchButtonUnselected");
        roomFilter = "gallery";
        localStorage.setItem("roomFilter", "gallery");
    } else {
        listFilter.classList.remove("joinSearchButtonUnselected");
        listFilter.classList.add("joinSearchButtonSelected");
        galleryFilter.classList.remove("joinSearchButtonSelected");
        galleryFilter.classList.add("joinSearchButtonUnselected");
        roomFilter = "list";
        localStorage.setItem("roomFilter", "list");
    }
    if (e.isTrusted === false) return;
    if (createFilter === "host") {
        clearGamemodes();
        showGamemodes();
    } else if (createFilter === "join") {
        clearRooms();
        showRooms();
    }
}
galleryFilter.onclick = roomFilterClick.bind("list");
listFilter.onclick = roomFilterClick.bind("gallery");

const defaultGamemodes = [
    {
        name: "FFA",
        image: "/resources/gamemodes/ffa.webp",
        description: "The genre classic. Everyone for themselves!",
        players: 0,
        code: "ffa.json",
    },
    {
        name: "1 v 1",
        image: "/resources/gamemodes/1v1.webp",
        description: "Duel random players in a mostly private arena.",
        players: 0,
        code: "1v1.js",
    },
    {
        name: "2 TDM",
        image: "/resources/gamemodes/2tdm.webp",
        description: "Hold the nest in the middle of map and keep the other team back.",
        players: 0,
        code: "2tdm.json",
    },
    {
        name: "4 TDM",
        image: "/resources/gamemodes/4tdm.webp",
        description: "Try your best to keep the other teams away from your base and the nest in the middle.",
        players: 0,
        code: "4tdm.json",
    },
    {
        name: "Warfront",
        image: "/resources/gamemodes/warfront.webp",
        description: "Fight to push back the line of battle to the other team's base. Additional players recommended.",
        players: 0,
        code: "warfront.js",
    },
    {
        name: "Maze",
        image: "/resources/gamemodes/maze.webp",
        description: "Classic FFA inside a randomly generated maze.",
        players: 0,
        code: "maze.js",
    },
    {
        name: "Cave",
        image: "/resources/gamemodes/cave.webp",
        description: "Free for all inside of a cave system! Close quarters!",
        players: 0,
        code: "cave.json",
    },
    {
        name: "Maze TDM",
        image: "/resources/gamemodes/maze_tdm.webp",
        description: "Fight against other teams inside of a randomly generated maze. Random team configurations upon starting. ",
        players: 0,
        code: "mazetdm.js",
    },
    {
        name: "Cave TDM",
        image: "/resources/gamemodes/cavetdm.webp",
        description: "Fight against other teams inside of a cave system! Random team configurations upon starting. ",
        players: 0,
        code: "cavetdm.js",
    },

    {
        name: "Maze TDM Blackout",
        image: "/resources/gamemodes/mazetdm_blackout.webp",
        description:
            "Fight against other teams inside of a maze while in the dark... Random team configurations upon starting.",
        players: 0,
        code: "blackoutmazetdm.js",
    },
    {
        name: "Cave TDM Blackout",
        image: "/resources/gamemodes/cavetdm_blackout.webp",
        description:
            "Fight against other teams inside of a cave system while in the dark... Random team configurations upon starting.",
        players: 0,
        code: "blackoutcavetdm.js",
    },

    {
        name: "2 TDM Domination",
        image: "/resources/gamemodes/2tdm_dom.webp",
        description:
            "Fight on one of two teams to capture all the dominators first!",
        players: 0,
        code: "2dom.js",
    },
    {
        name: "4 TDM Domination",
        image: "/resources/gamemodes/4tdm_dom.webp",
        description:
            "Fight on one of four teams to capture all the dominators first!",
        players: 0,
        code: "4dom.json",
    },
    {
        name: "4 TDM Mothership",
        image: "/resources/gamemodes/4tdm_mot.webp",
        description:
            "Fight on one of four teams to destroy all of the other teams' motherships!",
        players: 0,
        code: "4mot.json",
    },
    {
        name: "2 TDM Mothership",
        image: "/resources/gamemodes/2tdm_mot.webp",
        description:
            "Fight on one of two teams to kill the other team's mothership!",
        players: 0,
        code: "2mot.json",
    },
    {
        name: "4 TDM Tag",
        image: "/resources/gamemodes/4tdm_tag.webp",
        description:
            "Kill other players on the other three teams to recruit them to your team.",
        players: 0,
        code: "4tag.json",
    },
    {
        name: "Growth",
        image: "/resources/gamemodes/growth.webp",
        description:
            "Everyone for themselves! The more score you have the larger and stronger you get. Get to 2 million score to unlock dreadnaughts.",
        players: 0,
        code: "growth.json",
    },
    {
        name: "Boss Rush",
        image: "/resources/gamemodes/bossrush.webp",
        description:
            "Defeat 75 waves of bosses. Think you or your computer can take it? Good luck!",
        players: 0,
        code: "boss.json",
    },
    {
        name: "Space",
        image: "/resources/gamemodes/space.webp",
        description: "Everyone for themselves: Now in space!",
        players: 0,
        code: "space.json",
    },
    {
        name: "Soccer",
        image: "/resources/gamemodes/soccer.webp",
        description: "Player soccer on one of two teams.",
        players: 0,
        code: "soccer.json",
    },
    {
        name: "Portal FFA",
        image: "/resources/gamemodes/potffa.webp",
        description: "Everyone for themselves: Now with portals!",
        players: 0,
        code: "pffa.json",
    },
    {
        name: "Survival",
        image: "/resources/gamemodes/survival.webp",
        description: "Classic FFA but even more classic. Get grinding.",
        players: 0,
        code: "srvivl.json",
    },
    {
        name: "Corrupt Tanks",
        image: "/resources/gamemodes/corrupted_tanks.webp",
        description: "See the unholy horrors that lay deep within the code.",
        players: 0,
        code: "crptTanks.json",
    },
    {
        name: "Hangout",
        image: "/resources/gamemodes/hangout.webp",
        description: "Everyone is on the same team. Sit around and chat.",
        players: 0,
        code: "hangout.js",
    },
    {
        name: "Sandbox",
        image: "/resources/gamemodes/sandbox.webp",
        description:
            "Each player has their own private arena. Test different combos alone.",
        players: 0,
        code: "sbx.json",
    },
    {
        name: "Custom",
        image: "/resources/gamemodes/custom.webp",
        description:
            "A special gamemode reserved for modders to distinguish their rooms. By default, its a normal ffa map. Join the discord and ask for help learning to mod the game!",
        players: 0,
        code: "custom.js",
    },
];
let gamemodeEles = [];
function clearGamemodes() {
    for (let ele of gamemodeEles) ele.remove();
    gamemodeEles.length = 0;
}
function showGamemodes() {
    for (let gamemode of defaultGamemodes) {
        let template =
            roomFilter === "gallery" ? roomGalleryTemplate : roomListTemplate;
        let ele = template.cloneNode(true);
        ele.style.display = "block";

        // Background/image
        if (gamemode.image !== "") {
            ele.style.background = `url(${gamemode.image})`;
        }

        // Gamemode
        ele.children[0].children[0].innerText = gamemode.name;

        // Player count
        ele.children[0].children[1].style.display = "none";

        // Room Code
        ele.children[0].children[2].style.display = "none";

        ele.onclick = function() {
            playerCount = gamemode.players;
            gamemodeName = gamemode.name;
            gamemodeImage = gamemode.image;
            gamemodeDescription = gamemode.description;
            selectedGamemode = gamemode.code;
            updateRoomInfo();
        };

        gamemodeEles.push(ele);
        template.parentElement.appendChild(ele);
    }
}

let roomEles = [];
function clearRooms() {
    for (let ele of roomEles) ele.remove();
    roomEles.length = 0;
}
async function showRooms() {
    let rooms = await multiplayer.getRooms();
    for (let room of rooms) {
        let template =
            roomFilter === "gallery" ? roomGalleryTemplate : roomListTemplate;
        let ele = template.cloneNode(true);
        ele.style.display = "block";

        let gamemodeInfo = null;
        for (let gamemode of defaultGamemodes) {
            if (room.gamemodeCode === gamemode.code) {
                gamemodeInfo = gamemode;
                break;
            }
        }
        if (gamemodeInfo === null) {
            gamemodeInfo ??= room.gamemodeCode;
        }

        // Background/image
        if (gamemodeInfo.image) {
            ele.style.background = `url(${gamemodeInfo.image})`;
        }

        // Gamemode
        ele.children[0].children[0].innerText = gamemodeInfo.name || gamemodeInfo;

        // Player count
        ele.children[0].children[1].innerText = `Players: ${room.players}${room.maxPlayers < 99 ? `/${room.maxPlayers}` : ""}`;

        // Room Code
        ele.children[0].children[2].innerText = room.id;

        ele.onclick = function() {
            playerCount = room.players;
            maxPlayerCount = room.maxPlayers || 99;
            gamemodeName = gamemodeInfo.name || gamemodeInfo;
            gamemodeImage = gamemodeInfo.image || "";
            gamemodeDescription =
                room.desc || gamemodeInfo.description || gamemodeInfo;
            selectedRoomId = room.id;
            updateRoomInfo();
        };

        roomEles.push(ele);
        template.parentElement.appendChild(ele);
    }
}

const joinSearch = document.getElementById("joinSearch");
joinSearch.oninput = async function() {
    const term = joinSearch.value.toLowerCase();
    if (createFilter === "host") {
        clearGamemodes();
        showGamemodes();
        for (let ele of gamemodeEles) {
            if (
                ele.children[0].children[0].innerText.toLowerCase().includes(term) ===
                false &&
                ele.children[0].children[0].innerText
                    .toLowerCase()
                    .replaceAll(" ", "")
                    .includes(term) === false
            ) {
                ele.remove();
            }
        }
    } else if (createFilter === "join") {
        clearRooms();
        await showRooms();
        for (let ele of roomEles) {
            if (
                ele.children[0].children[0].innerText.toLowerCase().includes(term) ===
                false && // Gamemode Name
                ele.children[0].children[0].innerText
                    .toLowerCase()
                    .replaceAll(" ", "")
                    .includes(term) === false &&
                ele.children[0].children[1].innerText.toLowerCase().includes(term) ===
                false && // Player Count
                ele.children[0].children[1].innerText
                    .toLowerCase()
                    .replaceAll(" ", "")
                    .includes(term) === false &&
                ele.children[0].children[2].innerText.toLowerCase().includes(term) ===
                false && // Room Code
                ele.children[0].children[2].innerText
                    .toLowerCase()
                    .replaceAll(" ", "")
                    .includes(term) === false
            ) {
                ele.remove();
            }
        }
    }
};

// Setup default state
(async () => {
    if (localStorage.getItem("roomFilter") === "list") {
        listFilter.click();
    } else {
        // "gallery" or default
        galleryFilter.click();
    }
    joinFilter.click();
    await showRooms();
    if (roomEles.length > 0) {
        roomEles[0].click(); // Join most popular room by default
    } else {
        // No joinable rooms
        hostFilter.click();
        clearRooms();
        showGamemodes();
        gamemodeEles[23 * Math.random() | 0].click(); // Host random default gamemode
    }
})();

document.getElementById("startButton").onclick = openJoinScreen;

export { openJoinScreen };
