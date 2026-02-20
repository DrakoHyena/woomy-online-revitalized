const playerState = {
	name: "",
	socketName: [],
	gameName: "",
	camera: {
		x: 0,
		y: 0,
		fov: 1,
	},
	gui: {
		minimap: [],
		leaderboard: {
			type: 0,
			title: "Leaderboard",
			entries: []
		},
		upgrades: [],
		skills: {
			points: 0
		},
		disconnect: {
			title: "Disconnected For An Unknown Reason",
			subtitle: "Try rejoining or joining a different room."
		}
	},
	entity: {
		id: -1,
		index: 0,
		name: "Loading Player...",
		x: 0,
		y: 0,
		size: 1,
		facing: 0,
		score: 0,
		layer: 0,
		color: 0,
		team: 0,
		maxHealth: 0,
		health: 0,
		maxShield: 0,
		shield: 0,
		alpha: 1,
		seeInvisible: 0,
		nameColor: "#FFFFFF",
		label: "Loading Player...",
		widthHeightRatio: [1, 1],
		hideName: 0,
		hideHealth: 0
	},
	entityId: -1,
	levelProgress: 0,
	level: 0
}

export { playerState }