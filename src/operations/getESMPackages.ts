import { readFile } from "fs/promises";
import resolvePackagePath from "resolve-package-path";
import {
	PackageGraph,
	PackageInfo,
	Node,
	PackageInfoKey,
} from "../packageGraphs";
import { join } from "path";

function resolvePkgPath(
	pkgDir: string,
	pkgName: string,
	options: {
		optionalDepsFromParent?: {
			[dep: string]: string;
		};
		// If this was a patch, we probably can't find a package.json (or at least, I didn't solve this)
		isPatch: boolean;
		isRoot: boolean;
	},
) {
	const { optionalDepsFromParent, isPatch, isRoot } = options;
	const path = resolvePackagePath(pkgName, pkgDir);
	if (!path && !optionalDepsFromParent?.[pkgName] && !isPatch) {
		if (isRoot) {
			// Accounts for an unresolvable root project since we're in it
			return join(pkgDir, "package.json");
		}
		throw new Error(
			`Non-optional dependency could not be found: ${pkgName} when looking from ${pkgDir}`,
		);
	}
	return path;
}
// options: {
//     /**
//      * Depending on the integrity of your packages, you may get failures due to some packages saying
//      */
//     ignorePackages: string[]
// }
interface VisitReturn {
	/**
	 * The resolved path of the package.json that's requesting this. This is specifically for multi-version resolutions
	 */
	parentPkgPath?: string;
	optionalDependencies?: {
		[dep: string]: string;
	};
}

/**
 * Returns the esm packages from a PackageGraph - Assumes we can read package.json (may not work with yarn plug'n'play)
 * @param pkgGraph
 * @returns
 */
export async function getESMPackages(pkgGraph: PackageGraph) {
	const packagePathMap: {
		[pkgName: string]: {
			packageJsonPath: string;
			isModule: boolean;
		};
	} = {};
	// We need to resolve the packageJsons and are fine with optional dependencies missing since we can't tell if we need them
	async function resolvePackageJsons(
		currentNode: Node<PackageInfo, PackageInfoKey>,
		previousOptions?: VisitReturn,
	): Promise<[VisitReturn, boolean]> {
		// Look up the package.json
		const jsonPath = resolvePkgPath(
			previousOptions?.parentPkgPath ?? pkgGraph.pkgDir,
			currentNode.value.name,
			{
				optionalDepsFromParent: previousOptions?.optionalDependencies,
				isPatch: currentNode.value.isPatch,
				isRoot: currentNode.value.isRoot,
			},
		);
		// If we didn't throw any resolution errors, then we can assume this was optional - we shouldn't resolve down that path
		if (!jsonPath) {
			return [{}, true];
		}
		const contents = await readFile(jsonPath);
		const json = JSON.parse(contents.toString());
		packagePathMap[currentNode.value.name] = {
			packageJsonPath: jsonPath,
			isModule: json.type === "module",
		};
		return [
			{
				optionalDependencies: json.optionalDependencies,
				parentPkgPath: jsonPath,
			},
			false,
		];
	}

	// Iterate the packages and resolve all non-optional packages and existing optionals
	await pkgGraph.topDownVisitAsync(resolvePackageJsons);

	return Object.keys(packagePathMap).reduce((mods, p) => {
		const info = packagePathMap[p];
		if (info.isModule) {
			mods.push(p);
		}
		return mods;
	}, [] as string[]);
}
