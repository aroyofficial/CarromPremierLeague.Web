// Messages the sign-in page shows when an admin's session, second-step check, or device approval runs out.
export const SESSION_EXPIRED_MESSAGE = "Your session has expired. Sign in again to continue.";
export const MFA_EXPIRED_MESSAGE = "Your sign-in check expired before it was finished. Sign in again to continue.";
export const DEVICE_REQUEST_EXPIRED_MESSAGE =
	"This sign-in request expired before another device answered. Sign in again to continue.";
export const WAIT_TIMEOUT_MESSAGE =
	"This sign-in request expired after 10 minutes without an answer. Sign in again to continue.";

// The API says "without activity" when the session timed out from inactivity. That text is clearer than the generic one.
const IDLE_PATTERN = /without activity/i;

/** The sign-in page's message for a session that the API rejected with 401. */
export const sessionExpiredMessage = (serverMessage) => {
	const text = String(serverMessage || "").trim();
	return IDLE_PATTERN.test(text) ? text : SESSION_EXPIRED_MESSAGE;
};

/** The API answers 410 Gone when a sign-in token or request has run out. */
export const isGone = (error) => error?.httpStatus === 410;

/** The server's own words for an MFA token that ran out ("That sign-in expired. Sign in again."), or the default. */
export const mfaExpiredMessage = (error) => String(error?.message || "").trim() || MFA_EXPIRED_MESSAGE;
