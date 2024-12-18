import { execSync } from "child_process"
import { PackageGraph, PackageInfoKey } from "./PackageGraph"
import { existsSync, readFileSync } from "fs"
import { dirname, join } from "path"

/**
 * Gets the first package.json that can be found
 */
function getRootPackageJson(start: string, curDir?: string) {
    const dir = curDir ?? start
    const testPath = join(dir, 'package.json')
    if (existsSync(testPath)) {
        return testPath
    }
    const oneUp = dirname(dir)

    if (!oneUp) {
        throw new Error(`Could not find package.json traveling up from start dir at ${start}`)
    }
    return getRootPackageJson(start, oneUp)
}

/**
 * Retrieves the dependencies for a package in a PackageGraph
 * @param pkgDir - the directory where the top-level package is
 * @param recurse - get all the packages through all immediate dependencies
 * @returns 
 */
export async function getYarnInfoPackageGraph(pkgDir: string, recurse: boolean): Promise<PackageGraph> {
    const query = execSync(`yarn info ${recurse ? '-R' : ''} --json`, {
        cwd: pkgDir,
        stdio: 'pipe',
    })

    // Get the current package name so we can determine the root
    const rootPkgJsonPath = getRootPackageJson(pkgDir)
    let rootPkgName = ''
    try {
        rootPkgName = JSON.parse(readFileSync(rootPkgJsonPath).toString()).name
    } catch (e) {
        console.error('Error retrieving root package name!')
        throw e
    }

    const packageGraph = new PackageGraph(pkgDir)
    // Since the info shows multiple versions we keep a dedup set of the serialized key to avoid longer times
    const dedupSet = new Set<string>()

    return query.toString().split('\n').reduce((pkgGraph, q) => {
        // Make sure we have an actual value
        if (!!q.trim()) {
            const pkgInfo = JSON.parse(q) as YamlInfoDeps
            const {
                name,
                version,
                isPatch
            } = parsePackage(pkgInfo.value)
            const nameKey = packageGraph.keySerializer({
                name,
                version,
            })
            if (!dedupSet.has(nameKey)) {
                dedupSet.add(nameKey)
                // List of package names as dependencies
                let deps: PackageInfoKey[]
                if (recurse) {
                    deps = pkgInfo.children?.Dependencies?.map((deps) => {
                        const info = parsePackage(deps.locator)
                        return {
                            name: info.name,
                            version: info.version,
                        }
                    }) ?? []
                } else {
                    // We don't actually set up the dependencies because that would make the graph incomplete
                    deps = []
                }
                packageGraph.addDownstreamNode({
                    self: {
                        name,
                        version,
                    },
                    value: {
                        name,
                        version,
                        isPatch,
                        isRoot: name === rootPkgName,
                    },
                    to: deps ?? [],
                })
            }
        }
        return pkgGraph
    }, packageGraph)
}

function parsePackage(pkgAndVersion: string): {
    name: string
    version: string
    isPatch: boolean
} {
    const versionIdx = pkgAndVersion.indexOf('@', 1)
    if (versionIdx < 0) {
        throw new Error(`could not find version from name: ${pkgAndVersion}`)
    }
    let version = pkgAndVersion.substring(versionIdx + 1)
    // Parse out virtual versions since those are just file directors used by yarn
    if (version.startsWith('virtual:')) {
        const hashIdx = version.lastIndexOf('#')
        if (hashIdx < 1) {
            throw new Error(`could not find the expected # for virtual locator information`)
        }
        version = version.substring(hashIdx + 1)
    }
    return {
        name: pkgAndVersion.substring(0, versionIdx),
        version,
        isPatch: version.includes('patch')
    }
}

interface YamlInfoDeps {
    value: string
    children?: {
        Instances: number
        Version: string
        Dependencies?: {
            descriptor: string
            locator: string
        }[]
    }
}