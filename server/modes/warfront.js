const warfront = {}

const BLUE = -1;
const RED = -2;

let ent = undefined;

warfront.initNpcs = function({ Entity, Class, room }) {
    function spawnWarfront() {
        ent = new Entity({ x: room.width / 2, y: room.height / 2 });
        ent.define(Class.warfrontLine);
        ent.team = -1000;
        ent.onDead = spawnWarfront;
    }
    spawnWarfront();
}

warfront.runNpcs = function() {

}

const FRONT_SIZE = 300;
warfront.runTick = function(args) {
    let farthestBlue = 0;
    let farthestRed = args.room.width;
    args.entities.forEach(entity => {
        if (entity.type !== "tank") return;

        const diff = entity.x - ent.x
        if (entity.team === BLUE) {
            if (entity.x > farthestBlue) farthestBlue = entity.x

            if (diff > 0) {
                entity.velocity.x -= diff * .0025
                if (diff > FRONT_SIZE) entity.velocity.x -= Math.abs(entity.velocity.x * .5);
            }

            if (Math.abs(diff) > FRONT_SIZE) {
                if (entity.shield.amount > 1 && entity.shield.amount !== entity.shield.max) {
                    entity.shield.amount -= diff * .0001
                } else if (entity.health.amount !== entity.health.max) {
                    entity.health.amount -= diff * .0005
                }
            }

        } else if (entity.team === RED) {
            if (entity.x < farthestRed) farthestRed = entity.x;

            if (diff < 0) {
                entity.velocity.x -= diff * .0025
                if (diff < -FRONT_SIZE) entity.velocity.x += Math.abs(entity.velocity.x * .5);
            }

            if (Math.abs(diff) > FRONT_SIZE) {
                if (entity.shield.amount > 1 && entity.shield.amount !== entity.shield.max) {
                    entity.shield.amount += diff * .0001
                } else if (entity.health.amount !== entity.health.max) {
                    entity.health.amount += diff * .0005
                }
            }

        }
    })

    ent.x = (farthestBlue + farthestRed) / 2;
}

// Must be false or return # added to view
warfront.viewPacket = function({ flatten: flatten, visible: visible, playerContext: playerContext }) {
    flatten(ent.camera(ent.isTurret), visible, playerContext);
    return 1;
}

export { warfront }
