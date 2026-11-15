export const SIDEBAR_KEY = "cpl_admin_sidebar";
export const PHONE_MAX = 767.98;
export const WIDE_MIN = 1200;

export const isPhoneWidth = (width) => width <= PHONE_MAX;

export function initialSidebarExpanded(width, stored) {
	if (isPhoneWidth(width)) return false;
	if (stored === "expanded") return true;
	if (stored === "collapsed") return false;
	return width >= WIDE_MIN;
}

export function sidebarPreference(expanded) {
	return expanded ? "expanded" : "collapsed";
}
