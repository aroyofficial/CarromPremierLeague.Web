const TOKEN_KEY = "cpl_admin_token";
const USER_KEY = "cpl_admin_user";

const read = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);

export const authToken = {
	get: () => read(TOKEN_KEY),
	getUser: () => read(USER_KEY),
	set(token, username) {
		localStorage.setItem(TOKEN_KEY, token);
		localStorage.setItem(USER_KEY, username);
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(USER_KEY);
	},
	clear() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(USER_KEY);
	},
};
