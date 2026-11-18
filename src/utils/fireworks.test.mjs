import test from "node:test";
import assert from "node:assert/strict";
import { explode, rocketLaunch, stepRocket, stepSpark } from "./fireworks.js";

test("a rocket climbs from the bottom of the page and bursts in the sky", () => {
	const launch = rocketLaunch({ width: 1000, height: 800, index: 0 });
	assert.equal(launch.y, 800);
	assert.ok(launch.targetY < 800 * 0.5);
	assert.ok(launch.x > 0 && launch.x < 1000);
	let rocket = launch;
	let frames = 0;
	while (!rocket.done && frames < 200) {
		rocket = stepRocket(rocket);
		frames += 1;
	}
	assert.equal(rocket.done, true);
	assert.ok(rocket.y <= launch.targetY);
});

test("a burst throws sparks outward and they fall", () => {
	const rocket = { x: 400, targetY: 160, colour: "#f5b82e" };
	const sparks = explode(rocket);
	assert.equal(sparks.length, 36);
	assert.ok(sparks.every((spark) => spark.x === 400 && spark.y === 160 && spark.life === 1));
	const risen = sparks.find((spark) => spark.vy < 0);
	const fallen = stepSpark(stepSpark(stepSpark(risen)));
	assert.ok(fallen.vy > risen.vy);
	assert.ok(fallen.life < risen.life);
});
