import assert from "node:assert/strict";
import test from "node:test";
import {
	SESSION_EXPIRED_MESSAGE,
	isGone,
	mfaExpiredMessage,
	sessionExpiredMessage,
	MFA_EXPIRED_MESSAGE,
} from "./signInNotice.js";

test("an idle timeout keeps the server's own sentence", () => {
	const text = "This session expired after 5 minutes without activity. Sign in again.";
	assert.equal(sessionExpiredMessage(text), text);
});

test("any other 401 gets the plain session message, not the token wording", () => {
	assert.equal(sessionExpiredMessage("Invalid or expired bearer token."), SESSION_EXPIRED_MESSAGE);
	assert.equal(sessionExpiredMessage(undefined), SESSION_EXPIRED_MESSAGE);
});

test("only a 410 counts as a sign-in token that has run out", () => {
	assert.equal(isGone({ httpStatus: 410 }), true);
	assert.equal(isGone({ httpStatus: 400 }), false);
	assert.equal(isGone({ httpStatus: 401 }), false);
	assert.equal(isGone(null), false);
});

test("an expired MFA check uses the server's sentence, and the default when it is empty", () => {
	assert.equal(mfaExpiredMessage({ message: "That sign-in expired. Sign in again." }), "That sign-in expired. Sign in again.");
	assert.equal(mfaExpiredMessage({ message: "  " }), MFA_EXPIRED_MESSAGE);
	assert.equal(mfaExpiredMessage(undefined), MFA_EXPIRED_MESSAGE);
});
