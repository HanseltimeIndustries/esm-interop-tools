const nodeLinkedYarnBerry = {
	alias: "yarn node linked",
	packageManager: "yarn-berry",
	options: {
		yarnrc: {
			nodeLinker: "node-modules",
		},
	},
};

const nonPlugNPlayPackageManagers = [
	"npm",
	"pnpm",
	"yarn-v1",
	nodeLinkedYarnBerry,
];

const baseEntry = {
	additionalFiles: [["fixtures/", "./"]],
	fileTests: {
		testMatch: "**/*.ts",
		runWith: ["node", "tsx", "ts-node"],
		transforms: {
			typescript: {
				config: {
					compilerOptions: {
						esModuleInterop: true,
					},
				},
				tsNode: {
					version: "^10.9.2",
				},
			}, // Use the defaults, but we do want typescript transformation
		},
	},
	binTests: {}, // Just run default --help tests for now
	moduleTypes: ["commonjs", "esm"],
	timeout: 3000, // ts-node on yarn-berry takes about 2s (kinda pretty high compared to all the others)
};

// Yarn plug'n'play does not play well with local installs and ts-node.  We'll wait for pkgtest to find a fix
const nonPlugNPlayEntry = {
	...baseEntry,
	packageManagers: nonPlugNPlayPackageManagers,
};

const plugNPlayEntry = {
	...baseEntry,
	packageManagers: ["yarn-berry"],
	fileTests: {
		...baseEntry.fileTests,
		// Disable ts-node since it doesn't really work well with esm
		runWith: ["tsx", "node"],
	},
};

module.exports = {
	rootDir: "pkgtest",
	locks: true,
	matchIgnore: ["fixtures/**"],
	entries: [plugNPlayEntry, nonPlugNPlayEntry],
};
