import { test } from "node:test";
import assert from "node:assert/strict";
import { webauthnCodec } from "./webauthn.js";

test("passkey ids round-trip through base64url", () => {
	const original = new Uint8Array([0, 255, 16, 32, 64]).buffer;
	const encoded = webauthnCodec.encode(original);
	assert.equal(encoded.includes("+"), false);
	assert.equal(encoded.includes("/"), false);
	assert.equal(encoded.includes("="), false);
	const decoded = new Uint8Array(webauthnCodec.decode(encoded));
	assert.deepEqual([...decoded], [0, 255, 16, 32, 64]);
});
