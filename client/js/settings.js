const SAVE_VER = 0;
const defaultSettings = {
    settingsVersion: SAVE_VER,
    networkProtocolVersion: 2,

    // Boolean settings
    neonMode: false,
    darkBorders: false,
    rgbBorders: false,
    glassMode: false,
    pointy: false,
    inverseBorderColor: false,
    noBorders: false,
    tintedDamage: true,
    tintedHealth: true,
    coloredHealthBars: false,
    deathAnimations: true,
    shieldbars: false,
    minimapScaleEntities: false, // draw entities on minimap scaled to their true size
    minimapNamedEntities: true, // only draw named entities on minimap
    roundUpgrades: false,
    disableGameMessages: false,
    autoUpgrade: true,
    screenshotMode: false,
    lerpSize: true,
    performanceMode: false,
    animatedLasers: true,
    clientSideAim: false,
    darkModeMenu: false,
    showFps: true,
    squareLeaderboardBars: false,
    compactLeaderboard: false,
    leaderboardRawScores: false,
    squareStatsBars: false,
    squareNameplateBars: false,
    linkNameplateToStats: false,
    imageSmoothing: false,
    entityRawScores: false,

    // Number settings
    inGameChatMessageDuration: 3000,
    inGameChatMessageLimit: 3,
    closedMessageShowDuration: 5000,
    messageHistoryLimit: 50, // UI > Chat: Message History Limit
    uiScale: 1.2,
    fontStrokeRatio: 7,
    borderWidth: 2.5, // borderChunk
    barWidth: 4, // barChunk
    fontSizeBoost: 10,
    vignetteStrength: 1,
    leaderboardAlpha: 0.85,
    leaderboardBackgroundAlpha: 0.5,
    // custom leaderboard controls
    leaderboardBorderSize: 0.25, // multiplier for border thickness (0.01 – 5)
    leaderboardSize: 1.25, // overall scale for leaderboard UI
    chatAlpha: 0.5,
    chatOverlayAlpha: 0.75,
    chatOverlaySize: 1.25,
    chatBorderSize: 1,
    chatSize: 1.2,
    fpsCap: 1000,
    inputBufferSize: 500,
    menuAnimSpeed: 0.25,
    upgradeMenuScale: 1.25,
    minimapScaleFactor: 1.25,
    minimapSize: 0.3,
    minimapOpacity: 0.75,
    minimapRenderType: "Entity Image",
    statsAlpha: 0.75,
    statsBackgroundAlpha: 0.75,
    // custom stats menu controls
    statsBorderSize: 1, // multiplier for border thickness (0.01 – 5)
    statsSize: 1.25, // overall scale for stats UI
    nameplateOpacity: 0.75,
    nameplateBorderSize: .75, // multiplier for border thickness (0.01 – 5)
    nameplateSize: 1.25, // overall scale for nameplate UI

    // String/Dropdown settings
    barStyle: "Circle",
    resolutionScale: "High (100%)",
    entityResolution: 256,
    fontFamily: "Ubuntu",
    theme: "normal",
    shaders: "Disabled",
    filter: "Disabled",

    chatOverlayPos: "Above Map",

    // Input Elements
    inputElementsCacheInterval: 1000,
    textRenderCacheSize: 7500,

    deltaMax: 2,
};
const settingTypes = {
    settingsVersion: "number",
    networkProtocolVersion: "number",

    // Boolean settings
    neonMode: "checkbox",
    darkBorders: "checkbox",
    rgbBorders: "checkbox",
    glassMode: "checkbox",
    pointy: "checkbox",
    inverseBorderColor: "checkbox",
    noBorders: "checkbox",
    tintedDamage: "checkbox",
    tintedHealth: "checkbox",
    coloredHealthBars: "checkbox",
    deathAnimations: "checkbox",
    shieldbars: "checkbox",
    minimapScaleEntities: "checkbox",
    minimapNamedEntities: "checkbox",
    minimapSize: "number",
    minimapOpacity: "number",
    minimapScaleFactor: "number",
    minimapRenderType: "dropdown",
    roundUpgrades: "checkbox",
    disableGameMessages: "checkbox",
    autoUpgrade: "checkbox",
    screenshotMode: "checkbox",
    lerpSize: "checkbox",
    performanceMode: "checkbox",
    animatedLasers: "checkbox",
    clientSideAim: "checkbox",
    darkModeMenu: "checkbox",
    showFps: "checkbox",
    squareLeaderboardBars: "checkbox",
    compactLeaderboard: "checkbox",
    leaderboardRawScores: "checkbox",
    squareStatsBars: "checkbox",
    squareNameplateBars: "checkbox",
    linkNameplateToStats: "checkbox",
    imageSmoothing: "checkbox",
    entityRawScores: "checkbox",

    // Number settings
    inGameChatMessageDuration: "number",
    inGameChatMessageLimit: "number",
    closedMessageShowDuration: "number",
    messageHistoryLimit: "number",
    uiScale: "number",
    fontStrokeRatio: "number",
    borderWidth: "number",
    barWidth: "number",
    fontSizeBoost: "number",
    vignetteStrength: "number",
    leaderboardAlpha: "number",
    leaderboardBackgroundAlpha: "number",
    leaderboardBorderSize: "number",
    leaderboardSize: "number",
    statsAlpha: "number",
    statsBackgroundAlpha: "number",
    statsBorderSize: "number",
    statsSize: "number",
    chatAlpha: "number",
    chatOverlayAlpha: "number",
    chatOverlaySize: "number",
    chatBorderSize: "number",
    chatSize: "number",
    fpsCap: "number",
    inputBufferSize: "number",
    menuAnimSpeed: "number",
    upgradeMenuScale: "number",
    nameplateOpacity: "number",
    nameplateBorderSize: "number",
    nameplateSize: "number",
    // Dropdown settings
    barStyle: "dropdown",
    resolutionScale: "dropdown",
    entityResolution: "number",
    fontFamily: "dropdown",
    theme: "dropdown",
    shaders: "dropdown",
    filter: "dropdown",
    chatOverlayPos: "dropdown",

    // Input Elements
    inputElementsCacheInterval: "number",
    textRenderCacheSize: "number",

    deltaMax: "number",
};
const settingLimits = {
    settingsVersionMin: 0,
    settingsVersionMax: 99999,
    networkProtocolVersionMin: 0,
    networkProtocolVersionMax: 99999,

    // Number setting limits
    inGameChatMessageDurationMin: 0,
    inGameChatMessageDurationMax: 60000,
    inGameChatMessageLimitMin: 0,
    inGameChatMessageLimitMax: 1000,
    closedMessageShowDurationMin: 0,
    closedMessageShowDurationMax: 30000,
    messageHistoryLimitMin: 0,
    messageHistoryLimitMax: 500,
    uiScaleMin: 0.5,
    uiScaleMax: 3,
    fontStrokeRatioMin: 0,
    fontStrokeRatioMax: 20,
    borderWidthMin: 0,
    borderWidthMax: 10,
    barWidthMin: 0,
    barWidthMax: 10,
    fontSizeBoostMin: 0,
    fontSizeBoostMax: 50,
    vignetteStrengthMin: 0,
    vignetteStrengthMax: 5,
    leaderboardAlphaMin: 0,
    leaderboardAlphaMax: 1,
    // leaderboard extra limits
    leaderboardBorderSizeMin: 0.01,
    leaderboardBorderSizeMax: 5,
    leaderboardSizeMin: 0.01,
    leaderboardSizeMax: 5,
    statsAlphaMin: 0,
    statsAlphaMax: 1,
    leaderboardBackgroundAlphaMin: 0,
    leaderboardBackgroundAlphaMax: 1,
    statsBackgroundAlphaMin: 0,
    statsBackgroundAlphaMax: 1,
    // stats extra limits
    statsBorderSizeMin: 0.01,
    statsBorderSizeMax: 5,
    statsSizeMin: 0.01,
    statsSizeMax: 5,
    nameplateBorderSizeMin: 0.01,
    nameplateBorderSizeMax: 5,
    nameplateSizeMin: 0.01,
    nameplateSizeMax: 5,
    chatAlphaMin: 0,
    chatAlphaMax: 1,
    chatOverlayAlphaMin: 0,
    chatOverlayAlphaMax: 1,
    chatOverlaySizeMin: 0.1,
    chatOverlaySizeMax: 5,
    chatBorderSizeMin: 0.01,
    chatBorderSizeMax: 5,
    chatSizeMin: 0.1,
    chatSizeMax: 5,
    fpsCapMin: 1,
    fpsCapMax: 1000,
    inputBufferSizeMin: 100,
    inputBufferSizeMax: 1000,
    menuAnimSpeedMin: 0.01,
    menuAnimSpeedMax: 1,
    upgradeMenuScaleMin: 0.1,
    upgradeMenuScaleMax: 5,
    nameplateOpacityMin: 0,
    nameplateOpacityMax: 1,

    minimapSizeMin: 0.01,
    minimapSizeMax: 5,
    minimapOpacityMin: 0,
    minimapOpacityMax: 1,
    minimapScaleFactorMin: 0.001,
    minimapScaleFactorMax: 5,
    minimapRenderTypeOptions: ["Circle", "Entity Image", "Live Render"],
    // Dropdown setting options
    barStyleOptions: ["Circle", "Square", "Triangle"],
    resolutionScaleOptions: [
        "Very Low (35%)",
        "Low (50%)",
        "Medium (75%)",
        "High (100%)"
    ],
    entityResolutionMin: 1,
    entityResolutionMax: 1080,
    fontFamilyOptions: [
        "Ubuntu",
        "Alfa Slab One",
        "Bebas Neue",
        "Bungee",
        "Cutive Mono",
        "Dancing Script",
        "Fredoka One",
        "Indie Flower",
        "Nanum Brush Script",
        "Pacifico",
        "Passion One",
        "Permanent Marker",
        "Zen Dots",
        "Rampart One",
        "Roboto Mono",
        "Share Tech Mono",
        "Syne Mono",
        "wingdings",
        "serif",
        "sans-serif",
        "cursive",
        "system-ui"
    ],
    themeOptions: [
        "normal",
        "classic",
        "dark",
        "natural",
        "ocean",
        "midnight",
        "pastel",
        "space",
        "halloween",
        "christmas",
        "neon",
        "retro",
        "forest",
        "cyber",
        "fantasy"
    ],
    shadersOptions: [
        "Disabled",
        "Light Blur",
        "Dark Blur",
        "Colorful Blur",
        "Light",
        "Dark",
        "Colorful Dense",
        "Fake 3D",
        "Dynamic Fake 3D"
    ],
    filterOptions: [
        "Disabled",
        "Saturated",
        "Grayscale",
        "Dramatic",
        "Inverted",
        "Sepia"
    ],
    chatOverlayPosOptions: [
        "Over Map",
        "Above Map",
        "Next to Map"
    ],

    // Input Elements
    inputElementsCacheIntervalMin: 1,
    inputElementsCacheIntervalMax: 10000,

    textRenderCacheSizeMin: 200,
    textRenderCacheSizeMax: 9999,

    deltaMaxMin: 0.1,
    deltaMaxMax: 5,
};

let currentSettings = undefined;

function getSavedSettings() {
    let settingsInfo = localStorage.getItem("settingsInfo");
    if (!settingsInfo) {
        settingsInfo = {
            activeProfile: "Default",
            profiles: {
                Default: defaultSettings
            }
        };
    } else {
        settingsInfo = JSON.parse(settingsInfo);
    }
    // Ensure the active profile exists, otherwise fallback to "Default Profile"
    if (!settingsInfo.profiles[settingsInfo.activeProfile]) {
        console.warn(
            `Profile "${settingsInfo.activeProfile}" not found. Falling back to default profile.`
        );
        settingsInfo.activeProfile = "Default";
        if (!settingsInfo.profiles[settingsInfo.activeProfile]) {
            settingsInfo.profiles[settingsInfo.activeProfile] = defaultSettings;
        }
    }
    return settingsInfo;
}

function updateSettings() {
    let settingsInfo = getSavedSettings();
    currentSettings = convertSettings(
        settingsInfo.profiles[settingsInfo.activeProfile]
    );
}

function convertSettings(obj) {
    const newObj = {};
    let defaultSettingsEntries = Object.entries(defaultSettings);
    for (let [key, value] of defaultSettingsEntries) {
        // Additive fixes based on version number can be placed here

        newObj[key] = new Setting(key, settingTypes[key], value);
    }
    let objEntries = Object.entries(obj);
    for (let [key, value] of objEntries) {
        if (defaultSettings[key] === undefined) {
            console.warn(
                `Setting "${key}" is not defined in the defaults, are your provided settings correct?`
            );
        }
        newObj[key] = new Setting(key, settingTypes[key], value);
    }
    return newObj;
}

function saveSettingsProfile(profileName) {
    if (profileName === "Default")
        return console.error("Cannot override default settings profile");
    let settingsInfo = getSavedSettings();
    let newSettingsObj = {};
    for (let key in currentSettings) {
        let nv = undefined;
        let v = currentSettings[key].value;
        if (v.selected !== undefined) {
            nv = v.selected;
        } else if (v.number !== undefined) {
            nv = v.number;
        } else if (v.enabled !== undefined) {
            nv = v.enabled;
        } else if (v.text !== undefined) {
            nv = v.text;
        }
        newSettingsObj[key] = nv;
    }
    settingsInfo.profiles[profileName] = newSettingsObj;
    localStorage.setItem("settingsInfo", JSON.stringify(settingsInfo));
    console.log(`Saving settings for profile ${profileName}`, settingsInfo);
    loadSettingsProfile(profileName);
}

function loadSettingsProfile(profileName) {
    let settingsInfo = getSavedSettings();
    if (!settingsInfo.profiles[profileName])
        return console.error(`Settings profile ${profile} does not exist`);
    settingsInfo.activeProfile = profileName;
    localStorage.setItem("settingsInfo", JSON.stringify(settingsInfo));
    console.log(`Loading settings for profile ${profileName}`, settingsInfo);
    updateSettings();
}

function deleteSettingsProfile(profileName) {
    if (profileName === "Default")
        return console.error("Cannot delete default settings profile");
    let settingsInfo = getSavedSettings();
    if (!settingsInfo.profiles[profileName])
        return console.error(`Setting Profile ${profileName} does not exist`);
    delete settingsInfo.profiles[profileName];
    localStorage.setItem("settingsInfo", JSON.stringify(settingsInfo));
    updateSettings();
}

class Setting {
    constructor(uniqueLabel, type, value) {
        this.settingName = uniqueLabel;
        this.type = type;
        this.verifyType();
        this.value = this.verifyValue(value);
    }
    verifyType() {
        switch (this.type) {
            case "text":
            case "number":
            case "checkbox":
            case "dropdown":
                return true;
            default:
                console.warn(
                    `Setting "${this.type}" is not a valid type. See Settings.js > class Setting > verifyType for the valid setting types.`
                );
                return false;
        }
    }
    verifyValue(value) {
        let obj = undefined;
        switch (this.type) {
            case "text":
                obj = {
                    text: value,
                    lengthLimit: settingLimits[this.settingName + "LengthLimit"]
                };
                if (obj.lengthLimit === undefined) {
                    console.warn(
                        `Text length limits for setting "${this.settingName}" are undefined`
                    );
                }
                return obj;

            case "number":
                obj = {
                    min: settingLimits[this.settingName + "Min"],
                    max: settingLimits[this.settingName + "Max"]
                };
                obj.number = Math.min(obj.max, Math.max(obj.min, value));
                if (obj.min === undefined || obj.max === undefined) {
                    console.warn(
                        `Number limits for setting "${this.settingName}" are undefined`
                    );
                }
                return obj;
            case "checkbox":
                obj = {
                    enabled: !!value
                };
                return obj;
            case "dropdown":
                obj = {
                    options: settingLimits[this.settingName + "Options"] || [],
                    selected: value
                };
                if (obj.options.length > 0 && !obj.options.includes(value)) {
                    console.warn(
                        `Dropdown value "${value}" is not in the options list for setting "${this.settingName}". Using first option.`
                    );
                    obj.selected = obj.options[0];
                }
                if (obj.options.length === 0) {
                    console.warn(
                        `Dropdown options for setting "${this.settingName}" are undefined or empty`
                    );
                }
                return obj;
            default:
                console.warn(
                    `Setting "${this.type}" is not a valid type. See Settings.js > class Setting > verifyValue for the valid setting types.`
                );
                return {
                    text: "undefined",
                    lengthLimit: Infinity,
                    enabled: false,
                    min: 1,
                    max: 2,
                    number: 1,
                    percent: 1,
                    options: [],
                    selected: ""
                };
        }
    }
}
updateSettings();

export {
    currentSettings,
    getSavedSettings,
    updateSettings,
    saveSettingsProfile,
    loadSettingsProfile,
    deleteSettingsProfile
};
