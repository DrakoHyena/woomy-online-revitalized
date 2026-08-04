const oneVsOne = {}

oneVsOne.initNpcs = function() {


}

oneVsOne.runNpcs = function() {

}

let activity = [];
let layerNum = 1;
oneVsOne.runTick = function(args) {
    // Get players
    let players = [];
    args.entities.forEach(entity => {
        if (entity.socket) players.push(entity)
    })

    // MATCHMAKING //
    // Update "activity"
    for (let player of players) {
        const id = player.socket.id;
        if (activity[id]) {
            activity[id].ticksSpentWaiting++;
        } else {
            activity[id] = { isFighting: false, ticksSpentWaiting: -200, wins: 0, losses: 0 }
        }
    }

    // Process waiting people
    let fighter1 = undefined;
    let fighter2 = undefined;
    for (let player of players) {
        let activityEntry = activity[player.socket.id];
        if (activityEntry.isFighting) continue;
        const waitTime = activityEntry.ticksSpentWaiting

        // messages
        if (waitTime % 200 === 0) {
            if (waitTime < 0) {
                player.sendMessage(`Waiting around... (${Math.abs(waitTime)} ticks left)`)
                continue;
            }
            player.sendMessage(`Searching for a match... (${waitTime} ticks elapsed) | ${activityEntry.wins}-${activityEntry.losses} (${activityEntry.wins / (activityEntry.losses + activityEntry.wins) * 100 | 0}%)`)
        }
        if (waitTime < 0) continue

        // fighters
        if (fighter1 === undefined) {
            fighter1 = player
        } else if (activity[fighter1.socket.id].ticksSpentWaiting < waitTime) {
            fighter2 = fighter1
            fighter1 = player
        } else if (fighter2 === undefined) {
            fighter2 = player;
        } else if (activity[fighter2.socket.id].ticksSpentWaiting < waitTime) {
            fighter2 = player;
        }
    }
    if (fighter1 === undefined || fighter2 === undefined) return;

    // FIGHTING //
    let newLayer = layerNum++;
    setUpFighter(fighter1)
    setUpFighter(fighter2)
    function setUpFighter(fighter) {
        const activityEntry = activity[fighter.socket.id];
        activityEntry.isFighting = true;
        fighter.sendMessage("Match found! Prepare yourself!")
        fighter.define(Class.genericTank);
        fighter.upgradeTank(Class.basic);
        fighter.roomLayer = newLayer;
        fighter.skill.score = 59_212;
        fighter.sendMessage("Set up your build then kill your opponent within 2 minutes")
    }

    let matchEnded = false;
    function endMatch(winner, loser) {
        if (matchEnded === true) return;
        matchEnded = true;

        let winnerActivity = activity[winner.socket.id];
        let loserActivity = activity[loser.socket.id];
        winnerActivity.isFighting = false;
        winnerActivity.ticksSpentWaiting = 0
        loserActivity.isFighting = false;
        loserActivity.ticksSpentWaiting = -1000

        if (!winner.isDead()) winner.kill()

        winner.sendMessage("You won!")
        loser.sendMessage("You Lost.")
        args.sockets.broadcast(`[WINNER 👑] ${winner.name} (${++winnerActivity.wins}-${winnerActivity.losses} | ${winnerActivity.wins / (winnerActivity.losses + winnerActivity.wins) * 100 | 0}%) VS [LOSER 🥀] ${loser.name} (${loserActivity.wins}-${++loserActivity.losses} | ${loserActivity.wins / (loserActivity.losses + loserActivity.wins) * 100 | 0}%)`)
    }
    let setupTime = 7 * 1000
    let matchTime = 120 * 1000
    let matchInterval = setInterval(() => {
        if (!fighter1.onDead || !fighter2.onDead) {
            fighter1.onDead = function() {
                setTimeout(() => { endMatch(fighter2, fighter1) }, 3000)
                clearInterval(matchInterval)
            }
            fighter2.onDead = function() {
                setTimeout(() => { endMatch(fighter1, fighter2) }, 3000)
                clearInterval(matchInterval)
            }
        }

        if (setupTime > 0) {
            setupTime -= 100;
            fighter1.x = 0;
            fighter2.x = 3000;
            fighter1.y = 3000 / 2;
            fighter2.y = 3000 / 2;
            return;
        }

        if (matchTime === 120 * 1000) {
            fighter1.sendMessage("Fight!")
            fighter2.sendMessage("Fight!")
        }
        matchTime -= 100;
        if (matchTime === 0) {
            fighter1.sendMessage("Time is up! Health drain activated...")
            fighter2.sendMessage("Time is up! Health drain activated...")
        }
        if (matchTime < 0) {
            if (fighter1.shield.amount > 1) {
                fighter1.shield.amount /= 1.1;
                fighter1.shield.amount -= 3;
            } else if (fighter1.health.amount > 1) {
                fighter1.health.amount /= 1.1;
                fighter1.health.amount -= 3;
            }
            if (fighter2.shield.amount > 1) {
                fighter2.shield.amount /= 1.1;
                fighter2.shield.amount -= 3;
            } else if (fighter2.health.amount > 1) {
                fighter2.health.amount /= 1.1;
                fighter2.health.amount -= 3;
            }
        }
    }, 100)

}

// Must be false or func that returns # added to view
oneVsOne.viewPacket = false;

export { oneVsOne }
