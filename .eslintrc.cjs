/** @type {import('eslint').ESLint.ConfigData} */
module.exports = {
	root: true,
	parser: "@typescript-eslint/parser",
	extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "prettier"],
	plugins: ["@typescript-eslint"],
	ignorePatterns: ["*.cjs"],
	parserOptions: { sourceType: "module" },
	env: {
		es2020: true,
		node: true,
	},
};
