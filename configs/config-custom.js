let map = {
    // Set this to true so you can start a modded server
    // This is false by default so non-modders cant start a modded server
    "selectable": false,

    // Any configs that are commented out either don't work or apply to woomy online

    //"host": "0.0.0.0",
    //"api_url": "https://woomy-api.glitch.me",
    //"api_ws_url": "wss://woomy-api.glitch.me",
    //"servesStatic": true,
    //"mockupChunkLength": 200,
    //"port": 3001,
    "restarts": {
        "enabled": false,
        "interval": 14401
    },
    "networkUpdateFactor": 24,
    //"socketWarningLimit": 5,
    //"tabLimit": 1,
    //"strictSingleTab": true,
    "maxPlayers": 100, // Room manager has a hard cap of 100 players per server
    // "BETA": 0,
    //"networkFrontlog": 1,
    //"networkFallbackTime": 150,
    "gameSpeed": 1.25,
    "runSpeed": 1.75,
    //"maxHeartbeatInterval": 1000,
    //"verbose": true,
    "WIDTH": 6500,
    "HEIGHT": 6500,
    //"connectionLimit": 999,
    "MODE": "ffa",
    //"serverName": "Free For All",
    "displayName": "", // Replaces the gamemode name on the website (25 Character limit)
    "displayDesc": "", // Replaces the gamemode description on the website (350 character limit)
    "TEAM_AMOUNT": 2,
    "RANDOM_COLORS": false,
    "BOSS_SPAWN_TIMER": 2000, // Infinity disables bosses
    "PORTALS": {
        "ENABLED": false,
        "TANK_FORCE": 3000,
        "TANK_DAMP": 4000,
        "BOSS_FORCE": 12500,
        "DIVIDER_1": {
            "ENABLED": true,
            "LEFT": 2979,
            "RIGHT": 3521
        },
        "DIVIDER_2": {
            "ENABLED": true,
            "TOP": 2979,
            "BOTTOM": 3521
        }
    },
    "MAZE": {
        "ENABLED": false,
        "cellSize": 150,
        "stepOneSpacing": 3,
        "fillChance": 0.33,
        "sparedChance": 0.65,
        "cavey": false,
        "lineAmount": false,
        "margin": 0,
        "posMulti": 0.25
    },
    //"BANNED_CHARACTER_REGEX": "/[\uFDFD\u200E\u0000]/gi",
    "ROOM_SETUP": [
        ["roid", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "rock", "rock", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "roid"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock", "norm", "norm", "norm"],
        ["rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "roid", "nest", "nest", "nest", "nest", "roid", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["rock", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "roid", "roid", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "rock"],
        ["rock", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "roid", "roid", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "rock"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "nest", "nest", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "roid", "nest", "nest", "nest", "nest", "roid", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "nest", "nest", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock"],
        ["norm", "norm", "norm", "rock", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "rock", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm", "norm"],
        ["roid", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "rock", "rock", "norm", "norm", "norm", "rock", "norm", "norm", "norm", "roid"]
    ],
    "X_GRID": 18,
    "Y_GRID": 18,
    "PLAYER_SPAWN_TILES": ["norm"],
    "DAMAGE_CONSTANT": 0.75,
    "KNOCKBACK_CONSTANT": 1.8,
    "BORDER_FORCE": 0.025,
    "OUTSIDE_ROOM_DAMAGE": 0,
    "MAX_SKILL": 9,
    "SOFT_MAX_SKILL": 0.59,
    "REGEN_MULTIPLIER": 0.65,
    "TIER_1": 15,
    "TIER_2": 30,
    "TIER_3": 45,
    "TIER_4": 60,
    "LEVEL_ZERO_UPGRADES": false,
    "SKILL_CAP": 60,
    "SKILL_SOFT_CAP": 0,
    "SKILL_CHEAT_CAP": 60,
    "SKILL_LEAK": 0,
    "STEALTH": 4,
    "MIN_DAMAGE": 0,
    "MAX_FOOD": 400,
    "MAX_NEST_FOOD": 30,
    "MAX_CRASHERS": 18,
    "MAX_SANCS": 1,
    "TIME_BETWEEN_SANCS": 900000,
    "EVOLVE_TIME": 90000,
    "EVOLVE_TIME_RAN_ADDER": 210000,
    "EVOLVE_HALT_CHANCE": 0.25,
    "SHINY_CHANCE": 0.00001,
    "SKILL_BOOST": 5,
    "BOTS": 10,
    "GLASS_HEALTH_FACTOR": 1.8,
    "DO_BASE_DAMAGE": true,
    //"liveTankEditor": false,
    "SIEGE": false,
    "DISABLE_LEADERBOARD": false,
    "BLACKOUT": false,
    //"GAMEMODE_JS": "", // DOES WORK, Changing this will enable the void walkers code. See server.js to add your own.
    //"KILL_SCORE_FORMULA": "Math.min(x, 2_500_000) * 7 / 8" // DOES WORK, optional, taken from growth
    "modes": [/*"oneVsOne"*/], // New prefered way to do gamemode effects, array of identifiers
}
map
