module.exports = {
	// Run TypeScript check on whole project
	"*.ts": () => "tsc --noEmit",
	// Run ESLint on TS files
	"*.ts": "eslint --fix",
	// Run Prettier everywhere
	"*": "prettier --write --ignore-unknown",
};
