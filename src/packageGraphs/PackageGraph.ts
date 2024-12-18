import { resolve } from "path";
import { Graph } from "./Graph";

export interface PackageInfo {
	name: string;
	version: string;
	// We need this because some patches will register as dependencies but won't be able to resolve things
	isPatch: boolean;
	// We need this because some trees will contain the base package which won't self-resolve
	isRoot: boolean;
}

export interface PackageInfoKey {
	name: string;
	version: string;
}

/**
 * A graph of package names and their dependencies
 */
export class PackageGraph extends Graph<PackageInfo, PackageInfoKey> {
	readonly pkgDir: string;
	constructor(pkgDir: string) {
		super((node: PackageInfoKey) => `${node.name}@${node.version}`);

		if (!pkgDir) {
			throw new Error("Must supply a pkgDir!");
		}
		this.pkgDir = resolve(pkgDir);
	}
}
