const path = require("path");
// const { getJestNodeModulesTransformIgnore } = require('@hanseltime/esm-interop-tools')

const testTSConfig = "tsconfig.test.json";

module.exports = {
	rootDir: path.resolve(__dirname, "src"),
	testTimeout: 15000,
	testEnvironment: "node",
	testPathIgnorePatterns: ["/node_modules/"],
	verbose: true,
	transform: {
		"\\.[jt]sx?$": [
			"jest-chain-transform",
			{
				transformers: [
					[
						"ts-jest",
						{
							tsconfig: testTSConfig,
						},
					],
					// TODO: add this back after publishing
					// Use the cliTransformer that should have been transpiled before this call
					// [
					//   path.join(__dirname, 'dist', 'cjs', 'cliTransformer.js'),
					//   {
					//     cliScripts: [
					//       // asyncCLIScript does not have the specific comment
					//       /.*src\/tests\/scripts\/asyncCLIScript.[jt]s/,
					//     ],
					//     ecmaVersion: getEcmaVersionFromTsConfig(testTSConfig)
					//   }
					// ]
				],
			},
		],
	},
	// transformIgnorePatterns: [
	//   getJestNodeModulesTransformIgnore({
	//     file: 'esm-packages.json'
	//   })
	// ],
};
