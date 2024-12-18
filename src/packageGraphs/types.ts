import { PackageGraph } from "./PackageGraph";

/**
 * A function that should return a Package Graph for the current package in the working directory
 *
 * @param pkgDir - the directory where the top-level package is
 * @param recurse - if we should get all dependencies of the direct dependencies as well
 */
export type GetPackagesGraphFn = (recurse: boolean) => Promise<PackageGraph>;
