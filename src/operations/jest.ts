import { readFileSync } from "fs";

export interface EsmPackagesFile {
	description: string;
	/**
	 * Package names that are esm modules
	 */
	packages: string[];
}

/**
 * You can use this function to get get a transformIgnore pattern for jest that excludes node_modules
 * from a file where we have written all esm files that were detected.
 *
 * This is specifically designed for a "post-install" script that scans on install and overwrites the file
 * if there are new esm module types - thereby reducing the cost of tests to just a file read instead of a
 * tree scan.
 *
 * @param options
 * @returns
 */
export function getJestNodeModulesTransformIgnore(options: {
	/**
	 * The file location where we have written the esm module info to
	 *
	 * default (esm-modules.json)
	 */
	file: string;
	/**
	 * Extra packages for an exception for node modules
	 */
	extraExceptions?: string[];
}) {
	const { file, extraExceptions = [] } = options;
	const modules = getModulesFromFile(file);
	// Dedup
	const modSet = new Set<string>([...modules, ...extraExceptions]);
	return createNodeModulesTransformIgnore(Array.from(modSet));
}

function getModulesFromFile(file: string) {
	try {
		const esmModules = JSON.parse(
			readFileSync(file).toString(),
		) as EsmPackagesFile;
		if (!esmModules.packages || !Array.isArray(esmModules.packages)) {
			throw new Error(
				"Esm packages file object is missing the expected packages field!",
			);
		}
		return esmModules.packages;
	} catch (err) {
		console.error(`Malformed esm modules file: ${file}`);
		throw err;
	}
}

/**
 * Given a set of package names, this constructs a node_modules ignore string that exempts the
 * targeted modules from jest transform.
 *
 * It should be used with the transformIgnore configuration.
 * @param packageExceptions
 * @returns
 */
export function createNodeModulesTransformIgnore(packageExceptions: string[]) {
	return `node_modules/(?!${packageExceptions.map((p) => `${p}/`).join("|")})`;
}
