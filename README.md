# @hanseltime/esm-interop-tools

Have you run into the dreaded "Cannot require a module" error from the interoperability nightmare that is the ES Module cut over?
If not, you sweet child, leave this repo and keep your innocence and joy. If you are already jaded, then please, read on and maybe
benefit from what this repo has.

## Use Cases

### Knowing what you have

When one of these esm module failures pops up, it's often times not just 1 module.  You'll find yourself doing some dependency fix for 1, then 2, etc.
modules that got dragged into the dependency tree by an innocuous `yarn add` or `npm install`.

In those cases, there are some binary scripts that you can use to debug this:

```
yarn get-esm-packages --recurse --pkgManager yarnv2+
```

__TODO: This currently only supports yarn v2 non-plug'n'play.  If anyone would like to write a package Graph adapter, please feel free__

### Jest

If you're like me, you either have a massive repo of jest tests with mocks, or want to use jest because of it's rather comprehensive tooling.
However, one of the most comprehensive parts of jest (in my opinion) is its ability to do mock hoisting with a simple syntax.  Combine that with
typescript's use of imports and you get a relatively familiar way of declaring imports, then mocks, then tests.

If you've played with jest's [esm module suppport](https://jestjs.io/docs/ecmascript-modules), you may have come to realize that there are lots of
restrictions and nuances to working with the traditional jest transforms.  As of now, if you'd like to use jest with its main features, commonjs
transpilation is the best way to go.

Per [this lengthy discussion on transpiling third party libraries](https://stackoverflow.com/questions/58613492/how-to-resolve-cannot-use-import-statement-outside-a-module-from-jest-when-run?page=1&tab=scoredesc#tab-top),
you will need to:

1. Transpile .js files in third party libraries that are ESM modules with a correct setup (like ts-jest or babel-jest configured correctly)
2. Get jest to not ignore those node_modules entries

#### Looking up esm modules

I recommend that you keep a git-committed file that you write to on `install` of yarn/npm.  Once you have that set up, you can then
read in the same file in your jest config and use our programmatic API to construct a `node_modules` transformIgnore regex.

First: set up the install script:

```json
// For npm and yarn v1 projects
// package.json
{
    "scripts": {
        "postinstall": "npm run get-esm-packages -p npm --recurse --file esm-modules.json --quiet"
    }
}

```

```yaml
# For yarn v2+
# This assumes you've installed the after-install plugin: https://github.com/mhassan1/yarn-plugin-after-install

# For a single repo project:
afterInstall: yarn get-esm-packages -p yarnv2+ -r --file esm-packages.json --quiet

# For Monorepos - this allows you to update the esm-packages.json on new installs
afterInstall: yarn workspaces foreach --all -pt run get-esm-packages -p yarnv2+ -r --file esm-packages.json --quiet

# Installed plugin for after-install calls
plugins:
  - checksum: 0a2a35fbed2f33f0df1ceb1db51bf72554201f994eaecb86cbc62a295c3d05f7cc44fa8be8e64fc5e1c0bee4f529a17a0cc429ea9e3486ad467443291d5a8e3b
    path: .yarn/plugins/@yarnpkg/plugin-after-install.cjs
    spec: "https://raw.githubusercontent.com/mhassan1/yarn-plugin-after-install/refs/tags/v0.6.0/bundles/%40yarnpkg/plugin-after-install.js"
```

With the post install scripts set up, you can now modify your jest config file to do a lookup of the files.

```typescript
import { getJestNodeModulesTransformIgnore } from '@hanseltime/esm-interop-tools'

export default config = {

    transformIgnorePatterns: [
      getJestNodeModulesTransformIgnore({
        file: 'esm-packages.json'
      }),
      // Any other ignore patterns that you want
    ],
}
```
##### Doing it solo

As an exercise, if you really want to not use the higher level abstractions, you could use some of the composite
functions from the programmatic API to get the same transform information.

Note - this will make your tests run a fair bit slower since it does the dependency analysis every time you run tests.

```typescript
import { getYarnInfoPackageGraph, getESMPackages } from '@hanseltime/esm-interop-tools'

export default async () => {
    const packageGraph = await getYarnInfoPackageGraph(__dirname, true)
    packageGraph.validate()

    const packages = await getESMPackages(packageGraph)

    return {
        transformIgnorePatterns: [
            // This exempts all package paths in a large regex
            `node_modules/(?!${packages.map((p) => `${p}/`).join('|')})`
        ],
    }
}
```

# TODO: Unit/Integration testing

This tool has been tested via use in various projects, but would benefit from integration tests with a list of known dependendencies, etc.