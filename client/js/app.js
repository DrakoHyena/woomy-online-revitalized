import { global, resizeEvent } from "./global.js";
import { util, getWOSocketId } from "/js/util.js"
import { rewardManager } from "/js/achievements.js"
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


    global.gameLoopSecond = function () {
        let time = 0;
        let i = 0;
        let func = function () {
            global._bandwidth._out = global._bandwidth._outbound;
            global._bandwidth._in = global._bandwidth._inbound;
            global._bandwidth._outbound = 0;
            global._bandwidth._inbound = 0;

            if (!global._gameStart || global.gameDrawDead || global._disconnected) {
                return time = 0
            } else {

            };
            if (rewardManager._statistics[5] < ++time) rewardManager.increaseStatistic(5, time, true);
            switch (time) {
                case 1800:
                    rewardManager.unlockAchievement("hope_you_are_having_fun");
                    break;
                case 3600:
                    rewardManager.unlockAchievement("i_mean_you_must_be_right");
                    break;
                case 7200:
                    rewardManager.unlockAchievement("hopefully_you_have_the_score_to_back_this_up");
                    break;
                case 14400:
                    rewardManager.unlockAchievement("no_way_you_didnt_go_afk");
                    break;
            }

            rewardManager.increaseStatistic(7, 1);
            switch (rewardManager._statistics[7]) {
                case 1800:
                    rewardManager.unlockAchievement("hourly_enjoyer");
                    break;
                case 14400:
                    rewardManager.unlockAchievement("fhourly_enjoyer");
                    break;
                case 36000:
                    rewardManager.unlockAchievement("okay_that_was_fun");
                    break;
                case 86400:
                    rewardManager.unlockAchievement("uh_are_you_okay");
                    break;
                case 259200:
                    rewardManager.unlockAchievement("you_need_something_else_to_do");
                    break;
                case 604800:
                    rewardManager.unlockAchievement("wake_up_wake_up_wake_up");
                    break;
            }

            if (time % 3 === 0) {
                if (_gui._skills[0].cap !== 0 && _gui._skills[0].amount === _gui._skills[0].cap) rewardManager.unlockAchievement("shielded_from_your_bs");
                if (_gui._skills[1].cap !== 0 && _gui._skills[1].amount === _gui._skills[1].cap) rewardManager.unlockAchievement("selfrepairing");
                if (_gui._skills[2].cap !== 0 && _gui._skills[2].amount === _gui._skills[2].cap) rewardManager.unlockAchievement("2fast4u");
                if (_gui._skills[3].cap !== 0 && _gui._skills[3].amount === _gui._skills[3].cap) rewardManager.unlockAchievement("ratatatatatatatata");
                if (_gui._skills[4].cap !== 0 && _gui._skills[4].amount === _gui._skills[4].cap) rewardManager.unlockAchievement("more_dangerous_than_it_looks");
                if (_gui._skills[5].cap !== 0 && _gui._skills[5].amount === _gui._skills[5].cap) rewardManager.unlockAchievement("theres_no_stopping_it");
                if (_gui._skills[6].cap !== 0 && _gui._skills[6].amount === _gui._skills[6].cap) rewardManager.unlockAchievement("indestructible_ii");
                if (_gui._skills[7].cap !== 0 && _gui._skills[7].amount === _gui._skills[7].cap) rewardManager.unlockAchievement("mach_4");
                if (_gui._skills[8].cap !== 0 && _gui._skills[8].amount === _gui._skills[8].cap) rewardManager.unlockAchievement("dont_touch_me");
                if (_gui._skills[9].cap !== 0 && _gui._skills[9].amount === _gui._skills[9].cap) rewardManager.unlockAchievement("indestructible");

                if (rewardManager._statistics[8] > 199) rewardManager.unlockAchievement("nuisance_exterminator");
                if (rewardManager._statistics[8] > 0) rewardManager.unlockAchievement("they_seek");

                if (rewardManager._statistics[10] > 99) rewardManager.unlockAchievement("drones_are_life");

                let max = _gui._leaderboard._display.length ? _gui._leaderboard._display[0].score : false;
                if (!global._died && time > 30 && Math.min(1, _gui._skill.getScore() / max) === 1) rewardManager.unlockAchievement("the_leader");
            }
        }
        setInterval(func, 1000);
    }();
}

util._retrieveFromLocalStorage("nameInput")
util._retrieveFromLocalStorage("tokenInput")

RememberScriptingIsBannable()