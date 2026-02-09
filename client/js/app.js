import { global, resizeEvent } from "./global.js";
import { util, getWOSocketId } from "/js/util.js"
import "./mainmenu.js";
import "./joinMenu.js";

// App.js
function RememberScriptingIsBannable() {
    // MAIN MENUS //
    window.addEventListener("resize", resizeEvent);
    resizeEvent();

    util._retrieveFromLocalStorage("playerNameInput");

    document.addEventListener("keydown", function eh (e) {
        if (global._disconnected && global._gameStart) return;
        let key = e.which || e.keyCode;
        if (document.getElementById("gameJoinScreen").style.zIndex !== "-101") return;
        this.removeEventListener("keydown", eh)
        if (!global._disableEnter && key === global.KEY_ENTER && !global._gameStart) document.getElementById("startButton").click();
    })
}

util._retrieveFromLocalStorage("nameInput")
util._retrieveFromLocalStorage("tokenInput")

RememberScriptingIsBannable()