import { test } from "node:test";
import assert from "node:assert/strict";
import { poseAt } from "./carromLoaderMotion.js";

const pockets = [
	{ x: 25, y: 25, name: "TL" },
	{ x: 175, y: 25, name: "TR" },
	{ x: 175, y: 175, name: "BR" },
	{ x: 25, y: 175, name: "BL" },
];

const nearestPocket = (point) => {
	let best = null;
	let bestDistance = Infinity;
	for (const pocket of pockets) {
		const distance = Math.hypot(point.x - pocket.x, point.y - pocket.y);
		if (distance < bestDistance) {
			best = pocket.name;
			bestDistance = distance;
		}
	}
	return bestDistance < 36 ? best : null;
};

const onBaseline = (point) =>
	(Math.abs(point.y - 151) < 12 && point.x > 64 && point.x < 136) ||
	(Math.abs(point.y - 49) < 12 && point.x > 64 && point.x < 136) ||
	(Math.abs(point.x - 49) < 12 && point.y > 64 && point.y < 136) ||
	(Math.abs(point.x - 151) < 12 && point.y > 64 && point.y < 136);

test("the striker begins on a baseline beside the queen", () => {
	const pose = poseAt(0);
	assert.ok(onBaseline(pose.striker));
	assert.equal(pose.queen.x, 100);
	assert.equal(pose.queen.y, 100);
});

test("each shot pockets a different corner", () => {
	const landed = [1500, 3900, 6300, 8700].map((time) => nearestPocket(poseAt(time).queen));
	assert.deepEqual(landed.every(Boolean), true);
	for (let index = 1; index < landed.length; index += 1) {
		assert.notEqual(landed[index], landed[index - 1]);
	}
});

test("the striker stays off the queen's path into the pocket", () => {
	const pose = poseAt(1500);
	const queenRun = Math.hypot(pose.queen.x - 100, pose.queen.y - 100);
	const strikerRun = Math.hypot(pose.striker.x - pose.queen.x, pose.striker.y - pose.queen.y);
	assert.ok(queenRun > 40);
	assert.ok(strikerRun > 24);
});
