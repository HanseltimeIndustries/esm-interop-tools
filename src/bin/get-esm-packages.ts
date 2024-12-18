import { program, Option } from 'commander'
import { EsmPackagesFile, getESMPackages } from '../operations'
import { getYarnInfoPackageGraph, PackageGraph } from '../packageGraphs'
import { writeFileSync } from 'fs'

program.addOption(
    new Option('-p, --pkgManager <pkgManager>', 'The package manager that you are running under - will be used to resolve modules').choices(['yarnv2+']).makeOptionMandatory()
)
.addOption(
    new Option('-o, --output <output>', 'How to output the package info').choices(['json', 'console', 'none']).default('console', 'writes each package to the a line')
)
.option('--cwd <cwd>')
.option('-r, --recurse', 'get all dependencies and not just direct ones', false)
.option('-f, --file <file>', 'the file to output json to')
.option('-q, --quiet', 'if we should not output any values', false)

const options = program.parse(process.argv).opts<CliOpts>()

interface CliOpts {
    pkgManager: 'yarnv2+' | 'npm'
    cwd?: string
    recurse: boolean
    output: 'console' | 'json'
    file?: string
    quiet: boolean
}

async function main(options: CliOpts) {
    const { pkgManager, cwd = process.cwd(), recurse, output, file, quiet } = options
    let packageGraph: PackageGraph
    switch(pkgManager) {
        case 'yarnv2+':
            packageGraph = await getYarnInfoPackageGraph(cwd, recurse)
            break
        default:
            throw new Error('Unimplemented package manager GetPackagesGraphFn mapping!')
    }
    packageGraph.validate()

    const packages = await getESMPackages(packageGraph)

    if (!quiet) {
        switch(output) {
            case 'json':
                console.log(JSON.stringify(packages))
                break
            case 'console':
                console.log(packages.join('\n'))
        }
    }

    if (file) {
        writeESMModuleOutput(packages, file)
    }
}

export function writeESMModuleOutput(packages: string[], file: string) {
    writeFileSync(file, JSON.stringify({
        description: `This is a programmatically created file via ${process.argv.join(' ')}`,
		packages: packages.sort(),
    } as EsmPackagesFile, null, 4))
}

void main(options).then(() => {
    process.exit()
}).catch((err) => {
    console.error(err)
    process.exit(5)
})
