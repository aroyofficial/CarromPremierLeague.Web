import assert from "node:assert/strict";
import test from "node:test";
import { appRedirect, correctedQuery, galleryChoice, matchingId, positiveId } from "./queryState.js";

const known = (path) => ["/", "/gallery", "/fixtures", "/admin", "/admin/teams"].includes(path);

test("positiveId accepts only a positive whole number", () => {
	assert.equal(positiveId("3"), 3);
	assert.equal(positiveId(" 12 "), 12);
	assert.equal(positiveId(4), 4);
	for (const value of ["", "0", "-1", "1.5", "1abc", "01", "1e2", null, undefined, true, ["1"], "1,2"]) {
		assert.equal(positiveId(value), null, JSON.stringify(value));
	}
});

test("matchingId requires the id to be in the loaded set", () => {
	assert.equal(matchingId("2", [1, 2, 3]), 2);
	assert.equal(matchingId("9", [1, 2, 3]), null);
	assert.equal(matchingId("abc", [1, 2, 3]), null);
});

test("gallery keeps a photo only when it belongs to the season in the URL", () => {
	assert.deepEqual(galleryChoice("2", "10", [1, 2], [2, 3]), { seasonId: 2, photoId: 10 });
	assert.deepEqual(galleryChoice("2", "10", [1, 2], [3]), { seasonId: 2, photoId: null });
	assert.deepEqual(galleryChoice("2", "10", [1, 2], [1]), { seasonId: 2, photoId: null });
	assert.deepEqual(galleryChoice("2", "10", [1, 2], null), { seasonId: 2, photoId: null });
	assert.deepEqual(galleryChoice("9", "10", [1, 2], [2]), { seasonId: 2, photoId: 10 });
	assert.deepEqual(galleryChoice(undefined, "10", [1, 2], [2]), { seasonId: 2, photoId: 10 });
	assert.deepEqual(galleryChoice("nope", "missing", [1, 2], null), { seasonId: 1, photoId: null });
});

test("correctedQuery rewrites only values that disagree", () => {
	assert.equal(correctedQuery({ season: "2" }, { season: 2 }), null);
	assert.deepEqual(correctedQuery({ season: "9", photo: "4" }, { season: 2, photo: null }), { season: "2" });
	assert.equal(correctedQuery({ season: "2" }, {}), null);
});

test("login redirect stays inside a real route", () => {
	assert.equal(appRedirect("/admin/teams", known), "/admin/teams");
	assert.equal(appRedirect("/fixtures?season=3", known), "/fixtures?season=3");
	assert.equal(appRedirect("/gallery#top", known), "/gallery#top");
	for (const value of [
		"https://evil.test",
		"//evil.test",
		"/\\evil.test",
		"/%2F%2Fevil.test",
		"/login",
		"/login?redirect=/admin",
		"/does-not-exist",
		"/not-found",
		["/admin"],
		"",
		null,
	]) {
		assert.equal(appRedirect(value, known), null, JSON.stringify(value));
	}
});
