import test from "node:test";
import assert from "node:assert/strict";
import { explode, FADED_BURST, rocketLaunch, shellsToLaunch, stepRocket, stepSpark } from "./fireworks.js";

test("a rocket climbs from the bottom of the page and bursts in the sky", () => {
	const launch = rocketLaunch({ width: 1000, height: 800, index: 0 });
	assert.equal(launch.y, 800);
	assert.ok(launch.targetY >= 800 / 3 && launch.targetY <= 800 * (2 / 3));
	assert.ok(launch.x > 0 && launch.x < 1000);
	let rocket = launch;
	let frames = 0;
	while (!rocket.done && frames < 200) {
		rocket = stepRocket(rocket);
		frames += 1;
	}
	assert.equal(rocket.done, true);
	assert.ok(rocket.y <= launch.targetY);
	let climbing = launch;
	for (let i = 0; i < 12; i += 1) climbing = stepRocket(climbing);
	const sideToSide = climbing.trail.map((point) => point.x);
	assert.ok(Math.max(...sideToSide) - Math.min(...sideToSide) > 10);
	const widthOf = (points) => Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
	const third = Math.floor(climbing.trail.length / 3);
	assert.ok(widthOf(climbing.trail.slice(-third)) < widthOf(climbing.trail.slice(0, third)));
});

test("a burst throws sparks outward and they fall", () => {
	const rocket = { x: 400, targetY: 160, colour: "#f5b82e", reach: 96 };
	const sparks = explode(rocket);
	assert.equal(sparks.length, 42);
	assert.ok(sparks.every((spark) => spark.x === 400 && spark.y === 160 && spark.life === 1));
	assert.ok(sparks.every((spark) => spark.colour === "#f5b82e"));
	const risen = sparks.find((spark) => spark.vy < 0);
	const fallen = stepSpark(stepSpark(stepSpark(risen)));
	assert.ok(fallen.vy > risen.vy);
	assert.ok(fallen.life < risen.life);
	const level = sparks[0];
	let flown = level;
	for (let i = 0; i < 36; i += 1) flown = stepSpark(flown);
	assert.equal(flown.trail[0].x, level.originX);
	assert.equal(flown.trail[0].y, level.originY);
	assert.ok(flown.y > level.y + 4);
	assert.equal(flown.trail[flown.trail.length - 1].y, flown.y);
});

test("several shots still fire, and their bright phases do not stack", () => {
	let rockets = [];
	let sparks = [];
	let launched = 0;
	let maxBright = 0;
	for (let frame = 0; frame < 500; frame += 1) {
		if (shellsToLaunch({ rockets, sparks }) === 1) {
			rockets.push(rocketLaunch({ width: 1200, height: 800, index: launched }));
			launched += 1;
		}
		rockets = rockets.flatMap((rocket) => {
			const next = stepRocket(rocket);
			if (!next.done) return [next];
			sparks.push(...explode(next));
			return [];
		});
		sparks = sparks.flatMap((spark) => {
			const next = stepSpark(spark);
			return next.life > 0 ? [next] : [];
		});
		const bright = sparks.filter((spark) => spark.life > 0.55).length;
		if (bright > maxBright) maxBright = bright;
	}
	assert.ok(launched >= 2);
	assert.ok(maxBright <= 42);
});

test("the next shell waits until the burst on screen has faded", () => {
	assert.equal(shellsToLaunch(), 1);
	const climbing = rocketLaunch({ width: 1000, height: 800, index: 0 });
	assert.equal(shellsToLaunch({ rockets: [climbing] }), 0);
	const fresh = explode({ x: 400, y: 220, colour: "#f5b82e", reach: 96 });
	assert.equal(shellsToLaunch({ sparks: fresh }), 0);
	assert.equal(shellsToLaunch({ sparks: fresh.map((spark) => ({ ...spark, life: FADED_BURST })) }), 1);
	assert.equal(shellsToLaunch({ sparks: [{ life: FADED_BURST + 0.05 }] }), 0);
});

test("successive sky shots use different colours and different points in the sky", () => {
	const first = rocketLaunch({ width: 1000, height: 800, index: 0 });
	const second = rocketLaunch({ width: 1000, height: 800, index: 1 });
	assert.notEqual(first.colour, second.colour);
	assert.notEqual(first.x, second.x);
	assert.notEqual(first.targetY, second.targetY);
	assert.ok(Math.abs(first.x - second.x) > 120);
	const shots = [0, 1, 2, 3, 4, 5, 6, 7].map((index) => rocketLaunch({ width: 1000, height: 800, index }));
	assert.ok(shots.every((shot) => shot.targetY >= 800 / 3 && shot.targetY <= 800 * (2 / 3)));
	assert.ok(shots.some((shot) => shot.targetY > 800 * 0.5));
	assert.ok(shots.some((shot) => shot.targetY < 800 * 0.45));
});
