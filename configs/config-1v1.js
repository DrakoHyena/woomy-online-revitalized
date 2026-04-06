let map = {
    "modes": ["oneVsOne"],
    "restarts": {
        "enabled": false,
        "interval": 14401
    },
    "networkUpdateFactor": 24,
    "maxPlayers": 100, // Room manager has a hard cap of 100 players per server
    "gameSpeed": 1.25,
    "runSpeed": 1.75,
    "WIDTH": 3000,
    "HEIGHT": 3000,
    "MODE": "ffa",
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
        ["norm", "norm", "norm", "norm", "norm"],
        ["norm", "roid", "norm", "roid", "norm"],
        ["norm", "norm", "nest", "norm", "norm"],
        ["norm", "roid", "norm", "roid", "norm"],
        ["norm", "norm", "norm", "norm", "norm"]
    ],
    "X_GRID": 5,
    "Y_GRID": 5,
    "PLAYER_SPAWN_TILES": ["norm"],
    "DAMAGE_CONSTANT": 0.75,
    "KNOCKBACK_CONSTANT": 1.8,
    "BORDER_FORCE": 0.025,
    "OUTSIDE_ROOM_DAMAGE": 0,
    "MAX_SKILL": 9,
    "SOFT_MAX_SKILL": 0.59,
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
    "BOTS": 0,
    "GLASS_HEALTH_FACTOR": 1.8,
    "DO_BASE_DAMAGE": true,
    "SIEGE": false,
    "DISABLE_LEADERBOARD": false,
    "BLACKOUT": false
}
map
