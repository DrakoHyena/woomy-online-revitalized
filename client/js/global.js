import { color, getColor } from "/js/colors.js";
import { lerp } from "./lerp.js";
import { config } from "./config.js";
import { mockups, getEntityImageFromMockup } from "./mockups.js";
import { Smoothbar } from "./util.js";

// must be var because its gets defiend immediately
var global = {
    _selectedServer: 0,
    mobile: navigator.userAgentData?.mobile ?? /Mobi/i.test(navigator.userAgent),
    guiMouse: {
        x: 0,
        y: 0
    },
    aimAlpha: 0,
    _mapType: 0,
    _killTracker: 0,
    _forceTwiggle: false,
    KEY_ESC: 27,
    KEY_ENTER: 13,
    _canvas: null,
    KEY_CHAT: 13,
    KEY_FIREFOOD: 119,
    KEY_SPLIT: 32,
    KEY_LEFT: 65,
    KEY_UP: 87,
    KEY_RIGHT: 68,
    KEY_DOWN: 83,
    KEY_LEFT_ARROW: 37,
    KEY_UP_ARROW: 38,
    KEY_RIGHT_ARROW: 39,
    KEY_DOWN_ARROW: 40,
    KEY_AUTO_SPIN: 67,
    KEY_AUTO_FIRE: 69,
    KEY_OVER_RIDE: 82,
    KEY_UPGRADE_ATK: 49,
    KEY_UPGRADE_HTL: 50,
    KEY_UPGRADE_SPD: 51,
    KEY_UPGRADE_STR: 52,
    KEY_UPGRADE_PEN: 53,
    _diedAt: 0,
    KEY_UPGRADE_DAM: 54,
    KEY_UPGRADE_RLD: 55,
    KEY_UPGRADE_MOB: 56,
    KEY_UPGRADE_RGN: 57,
    KEY_UPGRADE_SHI: 48,
    KEY_MOUSE_0: 32,
    //KEY_MOUSE_1: 86,
    KEY_MOUSE_2: 16,
    KEY_LEVEL_UP: 78,
    KEY_TESTBED: 191,
    KEY_TESTBED_FIREFOX: 111,
    KEY_TESTBED_ALT: 192,
    KEY_RESET_BASIC_TANK: 80,
    KEY_CHANGE_TO_BASIC: 85,
    KEY_SUICIDE: 75,
    KEY_MAX_STATS: 77,
    KEY_GODMODE: 186,
    KEY_GODMODE_2: 59,
    KEY_COLOR_CHANGE: 66,
    KEY_SPAWN_SHAPES: 70,
    KEY_TELEPORT: 84,
    KEY_POWER_CYCLE: 222,
    KEY_POWER_CYCLE_FIREFOX: 165,
    KEY_BAN_PLAYER: 190,
    KEY_PASSIVE_MODE: 88,
    KEY_RAINBOW: 187,
    KEY_RAINBOW_2: 61,
    KEY_DEBUG: 76,
    //KEY_CLASS_TREE: -69, //85, Disabled for now due to new mockup system
    KEY_TIER_SWITCH: 79,
    KEY_TIER_SWITCH_2: 81,
    KEY_OVERRIDE_ENTITY: 86,
    KEY_INFECT_MINION: 73,
    KEY_RESET_COLOR: 89,
    KEY_CONTROL_DOM: 72,
    KEY_TANK_JOURNEY: 220,
    KEY_KILL_WITH_MOUSE: 71,
    KEY_STEALTH: 74,
    KEY_DRAG: 90,
    DEV_KEY_1: 35,
    DEV_KEY_2: 40,
    DEV_KEY_3: 34,
    DEV_KEY_4: 37,
    DEV_KEY_5: 12,
    DEV_KEY_6: 49,
    DEV_KEY_7: 36,
    DEV_KEY_8: 38,
    DEV_KEY_9: 33,
    _screenWidth: 0,
    _screenHeight: 0,
    _gameWidth: 0,
    _gameHeight: 0,
    _gameStart: false,
    _disconnected: false,
    _died: false,
    _deathScreenState: 1, // 0 = on | 1 = off
    _loadingMockups: true,
    _debug: 1,
    _scrollX: 0,
    _realScrollX: 0,
    _disconnectReason: "The connection was lost for an unknown reason.\nPlease press F12 or ctrl+shift+i then click on the console tab and take a screenshot, then send it in the discord.",
    _disableEnter: false,
    _seeInvisible: false,
    _tipSplash: [
        "Press the E key to enable autofire.",
        "Press the C key to enable autospin.",
        "Press the R key to disable drone and auto turret AI.",
        "Hold the N key to level up.",
        "Hold the Z key to change the color of the upgrade menu.",
        "Press the U key to change back to basic",
        "Hold the M key and press a number stat to instantly max out that stat.",
        "Hold the L key to show extra debug stuff above the minimap.",
        "If you have a low frame rate, you can try enabling Low Graphics in the options menu, which removes death fade.",
        "Don't like seeing a lot of messages? Or maybe they cause you lag? Consider enabling the Disable Messages option.",
        "Don't like the rounded edges look of Arras? Try the Use Miter Edges option.",
        "Begging for beta-tester on this server is like digging your own grave.",
        "Naming yourself Trans Rights makes your name have the colors of the Transgender Pride Flag.",
        "Don't get salty just because someone kills you; it's just a game, after all.",
        "Bosses are spawned by a randomizer; they may spawn every 8 to 15 minutes.",
        "The Password is 4NAX.",
        "The Password is Silvy.",
        "The password is SkuTsu.",
        "The Password is Trans Rights.",
        "Sanctuaries are spawned by a randomizer; they may spawn every 2 to 10 minutes.",
        "Sometimes, it helps to press Ctrl+R if your UI is bugged out.",
        "The first thing you should try if the client or in-game UI is bugged out is Ctrl+R.",
        "The first thing you should try if the client or in-game UI is bugged out is Ctrl+R.", // Duplicated on purpose // Jekyll - I might just automate this at some point /shrug
        "Sanctuaries can be seen on the minimap, and will spawn a boss when killed.",
        "Hitting the enemy deals more damage than not hitting them.",
        "If you can't take a joke, press Alt+F4 for godmode.",
        "Developers are marked by their badges next to their names.",
        "Developers typically have very fancy names.",
        'Import "Secret5"...',
        'Import "Pixel Mode"...',
        'Import "delete woomy"...',
        'Import "token"...',
        'Import "randomize"...'
    ],
    _deathSplash: [
        "All things must come to an end eventually.",
        "That's unfortunate...",
        "Tanks for playing!",
        "Don't be mad because you died; Be happy that you got the score you did.",
        "We interrupt this program to bring you this death screen.",
        "ZZAZZ Corruption will get to this world if you won't hurry and respawn!",
        "Success is not final, failure is not fatal: it is the courage to continue that counts.",
        "Dread it. Run from it. Destiny arrives all the same.",
        "F in the chat.",
        "Here lies your grave.",
        "Game over.",
        "Don't get mad, get even.",
        "Try, try again.",
        "OOF",
        "How much wood would a woodchuck chuck?",
        "Please refrain from abusing your computer.",
        "Ouch. Just ouch.",
        "Did you get a world record score?",
        "Try another tank, maybe it'll work out.",
        "Press Alt+F4 for godmode.",
        "L",
        "k",
        "YO WE GOT THAT IN VIDEOOOOOOOO",
        "Show em' who's boss!",
        "MEDICCCC! MEDICCCCCCCC!",
        "Quick! We're loosing them!",
        "Out played.",
        "OH GOD! HOW WILL THIS AFFECT THE TROUT POPULATION??",
        "I heard trying again with zero changes works wonders..",
        "All players stop just before their big run!",
        "That's all folks!",
        "*Crickets*"
    ],
    _deathSplashOverride: 0,
    _deathSplashChoice: 0,
    _tankMenuColor: 0,
    searchName: "Basic",
    _arenaClosed: false,
    _ratio: window.devicePixelRatio,
    _fps: 60,
    _fpsc: 0,
    _fpscap: 1000 / 60,
    _oldFpsCap: 1000 / 60,
    _bandwidth: {
        _outbound: 0,
        _inbound: 0,
        _out: 0,
        _in: 0
    },
    _sentPackets: 80085,
    _receivedPackets: 80085,
    displayTextUI: {
        enabled: false,
        text: "",
        color: "#FFFFFF"
    },
    _waterAnimation: .5,
    _waterDirection: 1,
    _target: {
        _x: 0,
        _y: 0
    },
    _screenSize: Math.min(1920, Math.max(window.innerWidth, 1280)),
    _mobileOptions: false,
    _mobileFiring: [4, false],
    _mobileChatText: "Chat",
    _standalone: window.navigator.standalone || (window.matchMedia && window.matchMedia("(display-mode: fullscreen), (display-mode: standalone), (display-mode: minimal-ui)").matches),
}


global.statHover = 0;
global.upgradeHover = 0;
global.messages = []
global._sendMessageToClient = (msg, c = "black") => global.messages.push({
    text: msg,
    status: 2,
    alpha: 0,
    time: Date.now(),
    color: color[c]
});
global.chatMessages = new Map();
global.clearUpgrades = function() {
    _gui._upgrades = [];
};
global.canUpgrade = 0;
global.canSkill = 0;
global.message = "";
global.time = 0;

global.player = {
    x: 0,
    y: 0,
    _cx: 0,
    _cy: 0,
    rendershiftx: 0,
    _rendershifty: 0,
    _renderx: 0,
    _rendery: 0,
    _renderv: 1,
    _name: "",
    _view: 1,
    _lastUpdate: 0,
    _time: 0,
    _nameColor: 0 /*"#FFFFFF"*/,
    _color: 0,
    _canSeeInvisible: 0,
    _isOutsideRoom: 0,
    // PLACEHOLDER
    instance: {
        "interval": 0,
        "id": 0,
        "index": 0,
        "x": 0,
        "y": 0,
        "size": 1,
        "facing": 0,
        "twiggle": 0,
        "layer": 0,
        "color": 16,
        "health": 1,
        "shield": 1,
        "alpha": 1,
        "seeInvisible": 0,
        "nameColor": "#FFFFFF",
        "widthHeightRatio": [
            1,
            1
        ],
        "drawsHealth": 2,
        "nameplate": 4,
        "invuln": 1,
        "name": "Whygena",
        "score": 0,
        "render": {
            "draws": true,
            "lastRender": 0,
            "x": 0,
            "y": 0,
            "lastx": 0,
            "lasty": 0,
            "f": 0,
            "h": 1,
            "s": 1,
            "interval": 0,
            "slip": 0,
            "status": {},
            "health": {},
            "shield": {},
            "size": 1,
        },
        "oldIndex": 0,
        "guns": {
            "length": 0
        },
        "turrets": [],
        "props": {
            "length": 0
        }
    },
    pepperspray: {
        apply: false,
        blurAmount: 0,
        blurMax: 0
    },
    lsd: false
}

window._anims = new Map()
window._gui = {
    _getStatNames: function(num) {
        switch (num) {
            case 1:
                return ["Body Damage", "Max Health", "", "", "", "", "Acceleration", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 2:
                return ["Body Damage", "Max Health", "Drone Speed", "Drone Health", "Drone Penetration", "Drone Damage", "Respawn Rate", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 3:
                return ["Body Damage", "Max Health", "Drone Speed", "Drone Health", "Drone Penetration", "Drone Damage", "Max Drone Count", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 4:
                return ["Body Damage", "Max Health", "Swarm Speed", "Swarm Health", "Swarm Penetration", "Swarm Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 5:
                return ["Body Damage", "Max Health", "Trap Speed", "Trap Health", "Trap Penetration", "Trap Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 6:
                return ["Body Damage", "Max Health", "Weapon Speed", "Weapon Health", "Weapon Penetration", "Weapon Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 7:
                return ["Body Damage", "Max Health", "Bullet Speed", "Bullet Health", "Bullet Penetration", "Bullet Damage", "Reload & Acceleration", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 8:
                return ["Body Damage", "Max Health", "Minion Speed", "Minion Health", "Minion Penetration", "Minion Damage", "Respawn Rate", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 9:
                return ["Body Damage", "Max Health", "", "", "", "", "Jump Rate", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 10:
                return ["Body Damage", "Max Health", "Block Speed", "Block Health", "Block Penetration", "Block Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 11:
                return ["Body Damage", "Max Health", "Rebound Speed", "Boomerang Health", "Boomerang Penetration", "Boomerang Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 12:
                return ["Body Damage", "Max Health", "Lance Range", "Lance Longevity", "Lance Sharpness", "Lance Damage", "Lance Density", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 13:
                return ["Body Damage", "Max Health", "Flail Speed", "Flail Resistance", "Flail Penetration", "Flail Damage", "Flail Density", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 14:
                return ["Body Damage", "Max Health", "Syringe Range", "Syringe Longevity", "Syringe Sharpness", "Syringe Damage", "Refill Time", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 15:
                return ["Body Damage", "Max Health", "Laser Length", "Laser Duration", "Laser Pierce", "Laser Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            case 16:
                return ["Body Damage", "Max Health", "", "", "", "", "", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
            default:
                return ["Body Damage", "Max Health", "Bullet Speed", "Bullet Health", "Bullet Penetration", "Bullet Damage", "Reload", "Movement Speed", "Shield Regeneration", "Shield Capacity"];
        }
    },
    _skills: [{
        amount: 0,
        color: "purple",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "pink",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "blue",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "lgreen",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "red",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "yellow",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "green",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "teal",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "gold",
        cap: 1,
        softcap: 1
    }, {
        amount: 0,
        color: "orange",
        cap: 1,
        softcap: 1
    }],
    _points: 0,
    _upgrades: [],
    _realUpgrades: [],
    _playerid: -1,
    _skill: function() {
        let levelScore = 0,
            deduction = 0,
            level = 0,
            score = Smoothbar(0);
        return {
            setScores: function(s) {
                if (s) {
                    score.set(s);
                    if (deduction > score.get()) {
                        level = 0;
                        deduction = 0;
                    }
                } else {
                    score = Smoothbar(0);
                    level = 0;
                }
            },
            update: function() {
                levelScore = Math.ceil(1.8 * Math.pow(level + 1, 1.8) - 2 * level + 0), score.get() - deduction >= levelScore && (deduction += levelScore, level += 1);
            },
            getProgress: function() {
                return levelScore ? Math.min(1, Math.max(0, (score.get() - deduction) / levelScore)) : 0;
            },
            getScore: function() {
                return score.get();
            },
            getLevel: function() {
                return level;
            }
        };
    }(),
    _type: 0,
    _fps: 0,
    _color: 0,
    _accel: 0,
    _topSpeed: 1,
    _minimap: {
        _display: [],
        _server: []
    },
    _leaderboard: {
        _display: [],
        _server: [],
        _publish: (old, entry) => {
            let ref = mockups.get(entry.index);
            let trueLabel = entry.labelOverride ? entry.labelOverride : entry.label
            return {
                id: entry.id,
                image: getEntityImageFromMockup(entry.index, entry.color),
                position: ref.position,
                barColor: getColor(entry.barColor),
                label: entry.name ? entry.name + " - " + (trueLabel || ref.name) : (trueLabel || ref.name),
                score: lerp(old.score, entry.score, 0.03),
                nameColor: entry.nameColor,
            }
        }
    }
};

function resizeEvent() {
    if (!global._canvas) return
    let scale = window.devicePixelRatio;
    scale *= [0.15, 0.5, 0.75, 1, 0.08][["Very Low (35%)", "Low (50%)", "Medium (75%)", "High (100%)", "PixelMode (8%)"].indexOf(config.resolutionScale)];
    global._canvas._cv.width = global._screenWidth = window.innerWidth * scale;
    global._canvas._cv.height = global._screenHeight = window.innerHeight * scale;
    global._canvas.vignetteCanvas.width = global._canvas._cv.width;
    global._canvas.vignetteCanvas.height = global._canvas._cv.height;
    global._ratio = scale;
    if (!global.mobile) document.getElementById('gameCanvas').focus();
    global._screenSize = Math.min(1920, Math.max(window.innerWidth, 1280));
}

window.metrics = {
    _latency: 0,
    _lag: 0,
    _rendertime: 0,
    _updatetime: 0,
    _lastlag: 0,
    _lastrender: 0,
    _rendergap: 0,
    _lastuplink: 0,
    _serverCpuUsage: 0,
    _serverMemUsage: 0
};
window.roomSetup = [
    ["norm"]
];
window.serverStart = 0;
window.getNow = function() {
    return Date.now() - serverStart;
};
window.entityArr = [];
window.entityMap = new Map();
window.laserMap = new Map();
window.getRatio = function() {
    return Math.max(global._screenWidth / global.player._renderv, global._screenHeight / global.player._renderv / 9 * 16);
};
window.upgradeSpin = 0,
    window.lastPing = 0,
    window.doingPing = false,
    window.lastServerStat = 0,
    window.renderTimes = 0,
    window.updateTimes = 0;
window.isInView = function(x, y, r) {
    let mid = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0,
        ratio = getRatio();
    r += config.borderChunk;
    if (mid) {
        ratio *= 2;
        return x > -global._screenWidth / ratio - r && x < global._screenWidth / ratio + r && y > -global._screenHeight / ratio - r && y < global._screenHeight / ratio + r;
    }
    return x > -r && x < global._screenWidth / ratio + r && y > -r && y < global._screenHeight / ratio + r;
}

export { global, resizeEvent }
