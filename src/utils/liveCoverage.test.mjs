import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { areas } from "./realtimeRules.js";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");

const FETCHES = /adminApi\.|[a-z]Service\.|Store\.fetch|Store\.load|\bapi\.get\(/;
const LIVE = /\buse(Admin)?Live\(/;

// Files that fetch but are not screens kept current by a notice. Each needs a reason.
const exempt = {
	"App.vue": "Refreshes the shared stores itself on every notice through watchLive.",
	"views/Login.vue": "Sign-in flow; it shows nothing another session can change.",
	"views/Rules.vue": "Reads the settings store, which App.vue refreshes on a settings notice.",
	"views/admin/AdminLayout.vue": "Reads the profile and settings stores, which App.vue refreshes.",
	"components/MatchCard.vue": "The live scorer is the writer; its parent screen refetches the match it is given.",
	"components/striker/StrikerChat.vue": "A chat transcript; its writes notify the screens that show the data.",
	"components/admin/AdminCreateDialog.vue": "A create form; the users list behind it is live.",
	"components/admin/ActivateAccount.vue": "A one-time password set-up flow.",
	"components/admin/ChangePasswordDialog.vue": "A password change form.",
	"components/admin/LoginChallenge.vue": "A sign-in challenge flow.",
	"components/admin/AuthenticatorSetupDialog.vue": "An authenticator enrolment flow; the security panel behind it is live.",
	"components/admin/ImageUploadField.vue": "An upload control; the screen that owns it is live.",
};

const vueFiles = (dir) =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return vueFiles(path);
		return entry.name.endsWith(".vue") ? [path] : [];
	});

const files = vueFiles(src).map((path) => ({
	name: relative(src, path).split("\\").join("/"),
	text: readFileSync(path, "utf8"),
}));

test("every screen that fetches data refreshes on a realtime notice", () => {
	const missing = files
		.filter((file) => FETCHES.test(file.text) && !LIVE.test(file.text) && !exempt[file.name])
		.map((file) => file.name);
	assert.deepEqual(missing, [], `Add useLive or useAdminLive, or an exemption with a reason: ${missing.join(", ")}`);
});

test("every exemption still names a file that exists and still fetches", () => {
	for (const name of Object.keys(exempt)) {
		const file = files.find((item) => item.name === name);
		assert.ok(file, `${name} no longer exists; drop its exemption`);
		assert.ok(FETCHES.test(file.text), `${name} no longer fetches; drop its exemption`);
		assert.ok(!LIVE.test(file.text), `${name} is live now; drop its exemption`);
	}
});

test("every live screen names a known areas list", () => {
	for (const file of files.filter((item) => LIVE.test(item.text))) {
		const used = [...file.text.matchAll(/areas:\s*areas\.(\w+)/g)].map((match) => match[1]);
		assert.ok(used.length, `${file.name} calls useLive without areas from realtimeRules`);
		for (const key of used) assert.ok(areas[key], `${file.name} uses unknown areas.${key}`);
	}
});
