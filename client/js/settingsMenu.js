import { global, resizeEvent } from "./global.js"
import { config } from "./config.js"
import { themes, setColor, color } from "./colors.js";
import { rewardManager } from "./achievements.js";

const initSettingsMenu = function() {
    // Increase this value if you change something huge
    let CURRENTVERSION = 5;
    let saveButtonReal = false;
    if (localStorage.getItem("LOCALVERSION") !== CURRENTVERSION.toString() && localStorage.length !== 0) {
        for (let key of Object.keys(localStorage).filter(store => store.includes("Woomy_"))) localStorage.removeItem(key);
        localStorage.setItem("LOCALVERSION", CURRENTVERSION);
        setTimeout(() => { window.location.reload(true) }, 200);
    }

    function resetOptions(dontOutput = false) {
        localStorage.setItem("hasLoadedBefore", true);
        for (let _ in config.Woomy) {
            let setting = config.Woomy[_];
            let element = document.getElementById(`Woomy_${setting.key}`);
            if (element.type === "checkbox") element.checked = setting.default;
            else element.value = setting.default;
            setting.set(element.type === "checkbox" ? element.checked : element.value);
        }
        if (dontOutput) return;
        document.getElementById("optionsResult").value = "";
        document.getElementById("optionsResult").placeholder = "Your options have been restored to default";
        rewardManager.unlockAchievement("back_to_default");
    };

    return () => {
        let holder = document.createElement("div");
        document.body.appendChild(holder);
        holder.id = "optionsMenu";
        holder.className = "optionsMenu";
        holder.style.display = "none";
        let innerHTML = `<h1 style="text-align: left; padding-left: 20px;">Options Menu</h1><br><hr><div class="optionsFlexHolder">`;
        let createInput = setting => {
            if (setting.dropDown.status) {
                let HTML = `<div class="optionsFlexItem">${setting.name}: <select id="Woomy_${setting.key}" tabindex="-1" value="${setting.value}">`;
                for (let option of setting.dropDown.options) HTML += `<option value="${option}">${(option = option.split(""), option[0] = option[0].toUpperCase(), option = option.join(""), `${option} ${setting.dropDown.suffix}`)}</option>`;
                HTML += "</select><br/></div>";
                innerHTML += HTML;
                return;
            }
            switch (setting.type) {
                case "boolean": {
                    innerHTML += `<div class="optionsFlexItem">${setting.name}: <label><input id="Woomy_${setting.key}" tabindex="-1" class="checkbox" type="checkbox"${setting.value ? " checked" : ""}></label></br></div>`;
                } break;
                case "number": {
                    innerHTML += `<div class="optionsFlexItem">${setting.name}: <label><input id="Woomy_${setting.key}" tabindex="-1" class="optionInput" type="number" step="0.01" min="0" max="100" value="${setting.value}"></label></br></div>`;
                } break;
                case "string": {
                    innerHTML += `<div class="optionsFlexItem">${setting.name}: <label><input id="Woomy_${setting.key}" tabindex="-1" class="optionInput" type="text" value="${setting.value}"></label></br></div>`;
                } break;
            }
        };
        for (let _ in config.Woomy) {
            let setting = config.Woomy[_];
            createInput(setting);
        }
        innerHTML += `</div><hr><br><button id="saveOptions">Save & Apply</button><button id="resetOptions">Reset Options</button><div style="float: right;"><button id="exportOptions">Export Options</button><button id="importOptions">Import Options</button></div> <br><input type="text" tabindex="0" spellcheck="false" placeholder="..." id="optionsResult"/><button id="entityEditor" style="display:none">Entity Editor (Beta)</button>`;
        holder.innerHTML += innerHTML;
        document.body.appendChild(holder);
        document.getElementById("Woomy_theme").value = config.Woomy["Theme"].value;
        document.getElementById("Woomy_shaders").value = config.Woomy["Shader Casting"].value;
        document.getElementById("Woomy_filter").value = config.Woomy["Filters"].value;
        document.getElementById("Woomy_resolutionScale").value = config.Woomy["Resolution"].value;
        document.getElementById("Woomy_barStyle").value = config.Woomy["Bar Style"].value;
        document.getElementById("Woomy_fontFamily").value = config.Woomy["Font Family"].value;
        let toggle = document.createElement("div");
        toggle.id = "settings-button";
        //if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|android|mobi/i.test(navigator.userAgent)) {
        document.body.appendChild(toggle);
        //}
        let saveButton = document.getElementById("saveOptions");
        let resetButton = document.getElementById("resetOptions");
        let exportButton = document.getElementById("exportOptions");
        let inportButton = document.getElementById("importOptions");
        let resultField = document.getElementById("optionsResult");
        let respond = (text, value = false) => {
            document.getElementById("optionsResult").value = value ? text : "";
            document.getElementById("optionsResult").placeholder = value ? "..." : text;
        }
        let active = false;
        toggle.onclick = () => {
            let width = (+document.getElementById("optionsMenu").style.width.replace("%", "") / 100) * innerWidth;
            if (!active) {
                holder.style.display = "block";
            } else {
                holder.style.display = "none";
            }
            active = !active;
            holder.style.left = width + "px";
            document.getElementById('gameCanvas').focus();
        };
        inportButton.onclick = () => {
            let input = resultField.value;
            if (input.value == "") respond("Paste your settings here!");
            switch (input) {
                case "Pixel Mode":
                    respond("Pixel Mode has been added.");
                    let op = document.createElement("option");
                    op.value = op.innerHTML = "PixelMode (8%)"
                    document.getElementById("Woomy_resolutionScale").appendChild(op);
                    break;
                case "Secret5":
                    respond("https://youtu.be/xm3YgoEiEDc", true)
                    break;
                case "delete woomy":
                    document.body.remove();
                    break;
                case "token":
                    respond("token." + "YouAreVeryReallyGayLOl".split("").sort(_ => 0.5 - Math.random()).join("") + ".tokenDEVELOPER", true);
                    break;
                case "randomize":
                    let obj = {}
                    for (let _ in config.Woomy) {
                        let setting = config.Woomy[_];
                        switch (setting.type) {
                            case "boolean":
                                obj[_] = Math.random() >= 0.5;
                                break;
                            case "number":
                                obj[_] = Number((setting.default / 2 + setting.default * 2 * Math.random()).toFixed(1));
                                break;
                            case "string":
                                obj[_] = setting.dropDown.options[~~(setting.dropDown.options.length * Math.random())];
                                break;
                        }
                    }
                    respond(JSON.stringify(obj), true);
                    break;
                default: {
                    try {
                        input = JSON.parse(input);
                        if (input instanceof Array || !(typeof input === "object")) throw ("Not an object");
                        for (let _ in config.Woomy) {
                            let setting = config.Woomy[_];
                            if (input[setting.name] == null) continue;
                            let element = document.getElementById(`Woomy_${setting.key}`);
                            let value = input[setting.name];
                            if (element.type === "checkbox") element.checked = value;
                            else element.value = value;
                            setting.set(element.type === "checkbox" ? element.checked : element.value);
                        }
                        respond("Options have been succsesfully imported");
                    } catch (error) {
                        respond("Failed to parse the provided options");
                        console.warn('Failed to load "' + input + '" because ' + `${error}`);
                    };
                }
            };
        };
        exportButton.onclick = () => {
            let out = {};
            for (let key of Object.keys(config.Woomy)) out[key] = config.Woomy[key].value
            navigator.clipboard.writeText(JSON.stringify(out));
            respond(JSON.stringify(out), true);
        }
        saveButton.onclick = () => {
            for (let _ in config.Woomy) {
                let setting = config.Woomy[_];
                let option = document.getElementById(`Woomy_${setting.key}`);
                let value = option.value;
                if (option.type === "checkbox") value = option.checked;
                setting.set(value);
            }
            respond("Your options have been saved");
            saveButtonReal = true;
            if (config.firstLoad != null) rewardManager.unlockAchievement("personalization");
            config.firstLoad = false;
        };

        let entityEditor = document.getElementById("entityEditor")
        entityEditor.onclick = () => {
            window.open("/editor.html", "_blank", "width=600,height=400,top=0,left=0");
        }

        resultField.addEventListener("keydown", event => {
            if (event.key == "Enter") inportButton.click();
        })
        if (!localStorage.getItem("hasLoadedBefore")) resetOptions(true);
        saveButton.click();
        resetButton.onclick = () => resetOptions(false);
        respond("...");
    }
}();

config.Woomy = (() => {
    let library = {};
    class Setting {
        constructor(key, name, type, normal, setFunction = () => { }, dropDown = {
            keys: [],
            suffix: ""
        }) {
            this.key = key;
            this.name = name;
            this.type = type;
            this.default = normal;
            this.setFunction = setFunction;
            this.dropDown = {
                status: !!dropDown.keys.length,
                options: dropDown.keys,
                suffix: dropDown.suffix
            };
            this.retrieveFromLocalStorage();
            library[name] = this;
        }
        getStorageName() {
            return "Woomy_" + this.type + "_" + this.key;
        }
        retrieveFromLocalStorage() {
            let key = this.getStorageName();
            let value = localStorage.getItem(key);
            if (this.type === "number" && !isNaN(+value)) value = +value;
            let valid = (value !== "undefined" && value);
            this.set(valid ? JSON.parse(value) : this.default);
        }
        update() {
            config[this.key] = this.value;
            localStorage.setItem(this.getStorageName(), JSON.stringify(this.value));
        }
        set(value) {
            if (this.type === "number" && !isNaN(+value)) value = +value;
            if (this.type === "boolean" && ["on", "off"].includes(value)) value = value === "on";
            if (typeof value === this.type) {
                this.value = value;
                this.update();
                this.setFunction(value);
            }
        }
        reset() {
            this.value = this.default;
            this.update();
        }
    }
    new Setting("neon", "Neon", "boolean", false);
    new Setting("darkBorders", "Dark Borders", "boolean", false);
    new Setting("rgbBorders", "Rainbow Borders", "boolean", false);
    new Setting("glassMode", "Glass Mode", "boolean", false);
    new Setting("pointy", "Sharp Borders", "boolean", false);
    new Setting("inverseBorderColor", "Inverse Border Color", "boolean", false);
    new Setting("noBorders", "No Borders", "boolean", false);
    new Setting("tintedDamage", "Red Damage", "boolean", true);
    new Setting("tintedHealth", "Tinted Health Bars", "boolean", true);
    new Setting("coloredHealthBars", "Colored Health Bars", "boolean", false);
    new Setting("deathAnimations", "Death Animations", "boolean", true);
    new Setting("shieldbars", "Split Health Bars", "boolean", false);
    new Setting("roundUpgrades", "Round Upgrades", "boolean", false);
    new Setting("disableGameMessages", "Disable Game Messages", "boolean", false);
    new Setting("autoUpgrade", "Auto Level Up", "boolean", global.mobile);
    new Setting("screenshotMode", "Screenshot Mode", "boolean", false);
    new Setting("hideMiniRenders", "Hide Mini-Renders", "boolean", false);
    new Setting("lerpSize", "Lerp Entity Sizes", "boolean", true);
    new Setting("performanceMode", "Performance Mode", "boolean", false);
    new Setting("animatedLasers", "Animated Lasers", "boolean", true);
    new Setting("clientSideAim", "Fake Aim", "boolean", false)
    new Setting("mainMenuStyle", "Menu Dark Mode", "boolean", false, enabled => {
        const setProperties = vars => {
            if (enabled) {
                vars.setProperty('--backgroundColor', '#202225');
                vars.setProperty('--backgroundBorderColor', '#f2e558');
                vars.setProperty('--menuTextColor', '#e1e1e7');
                vars.setProperty('--backgroundBrightness', '0.85');
                vars.setProperty('--backgroundLink', "url(/resources/background_dark_new.png)");
                rewardManager.unlockAchievement("its_better_for_my_eyes");
            } else {
                vars.setProperty('--backgroundColor', '#dde6eb');
                vars.setProperty('--backgroundBorderColor', '#c1cfd8');
                vars.setProperty('--menuTextColor', '#000000');
                vars.setProperty('--backgroundBrightness', '0.9');
                vars.setProperty('--backgroundLink', "url(/resources/background_light_new.png)");
            }
        }
        setProperties(document.querySelector(":root").style);
    });
    new Setting("chatMessageDuration", "Chat Message Duration", "number", 5);
    new Setting("uiScale", "UI Scale", "number", 1.2);
    new Setting("fontStrokeRatio", "Font Stroke Ratio", "number", 7);
    new Setting("borderChunk", "Border Width", "number", 6.5);
    new Setting("barChunk", "Bar Stroke Thickness", "number", 4);
    new Setting("fontSizeBoost", "Font Size", "number", 10);
    new Setting("vignetteStrength", "Vignette Strength", "number", 1)
    /*new Setting("movementSmoothing", "Movement Smoothing", "number", .625, function(v){
        this.value = Math.min(1, Math.max(0, v))
        this.update()
        if(document.getElementById("Woomy_movementSmoothing")){
            document.getElementById("Woomy_movementSmoothing").value = this.value;
        }
    });*/
    new Setting("fpsCap", "FPS Cap", "number", 1000, value => {
        global._fpscap = 1000 / Math.max(value, 1);
        if (global._fpscap !== global._oldFpsCap) global._sendMessageToClient("Max FPS changed, it may take a few seconds to show any difference.");
        if (value === 1) rewardManager.unlockAchievement("artificial_lag");
        global._oldFpsCap = global._fpscap;
    });
    new Setting("barStyle", "Bar Style", "string", "Circle", resizeEvent, {
        keys: ["Circle", "Square", "Triangle"],
        suffix: ""
    });
    new Setting("resolutionScale", "Resolution", "string", "High (100%)", resizeEvent, {
        keys: ["Very Low (35%)", "Low (50%)", "Medium (75%)", "High (100%)"],
        suffix: ""
    });
    new Setting("fontFamily", "Font Family", "string", "Ubuntu", value => {
        if (value !== "Ubuntu") global._sendMessageToClient("If a font is too big or too small, try changing the Font Size option!");
    }, {
        keys: ["Ubuntu", "Alfa Slab One", "Bebas Neue", "Bungee", "Cutive Mono", "Dancing Script", "Fredoka One", "Indie Flower", "Nanum Brush Script", "Pacifico", "Passion One", "Permanent Marker", "Zen Dots", "Rampart One", "Roboto Mono", "Share Tech Mono", "Syne Mono", "wingdings", "serif", "sans-serif", "cursive", "system-ui"],
        suffix: ""
    });
    new Setting("theme", "Theme", "string", "normal", value => { if (themes[value]) { setColor(themes[value]) } else { setColor(themes.normal) } }, {
        keys: Object.keys(themes),
        suffix: "Colors"
    });
    codeblock_shadowsSetting: {
        let shadowTypes = ["Disabled", "Light Blur", "Dark Blur", "Colorful Blur", "Light", "Dark",/* "Light Stroke", "Dark Stroke",*/ "Colorful Dense", "Fake 3D", "Dynamic Fake 3D"];
        new Setting("shaders", "Shader Casting", "string", "Disabled", value => {
            if (value !== "Disabled") rewardManager.unlockAchievement("like_minecraft_shaders_no");
        }, {
            keys: shadowTypes,
            suffix: ""
        });
    }
    new Setting("filter", "Filters", "string", "Disabled", () => { }, {
        keys: ["Disabled", "Saturated", "Grayscale", "Dramatic", "Inverted", "Sepia"],
        suffix: ""
    });
    /*new Setting("testSetting", "Slider Test", "slider", "25", value => {
        console.log(parseInt(value));
    }, {
        keys: [0, 10],
        suffix: ""
    });*/
    /*new Setting("prediction", "Prediction", "string", "Smooth (Reccomended)", val => {
        config.prediction = {
            "Original (Old)": 0,
            "Woomy (New)": 1,
            "Smooth (Reccomended)": 2
        }[val];
        if (config.prediction == null) config.prediction = 2;
    }, {
        keys: ["Original (Old)", "Woomy (New)", "Smooth (Reccomended)"],
        suffix: ""
    })*/
    return library;
})();

export { initSettingsMenu }
