const TOKEN_KEY = "cpl_admin_token";
const USER_KEY = "cpl_admin_user";

export const authToken = {
	get: () => sessionStorage.getItem(TOKEN_KEY),
	getUser: () => sessionStorage.getItem(USER_KEY),
	set(token, username) {
		sessionStorage.setItem(TOKEN_KEY, token);
		sessionStorage.setItem(USER_KEY, username);
	},
	clear() {
		sessionStorage.removeItem(TOKEN_KEY);
		sessionStorage.removeItem(USER_KEY);
	},
};
