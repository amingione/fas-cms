# Yarn Commands

Cheat sheet of native Yarn commands (from `yarn --help` on Yarn 4.5.3) plus this repo's package scripts.

## Native commands

### General commands

- `yarn add` - add dependencies to the project
- `yarn bin` - get the path to a binary script
- `yarn cache clean` - remove the shared cache files
- `yarn config` - display the current configuration
- `yarn config get` - read a configuration settings
- `yarn config set` - change a configuration settings
- `yarn config unset` - unset a configuration setting
- `yarn dedupe` - deduplicate dependencies with overlapping ranges
- `yarn dlx` - run a package in a temporary environment
- `yarn exec` - execute a shell script
- `yarn explain` - explain an error code
- `yarn explain peer-requirements` - explain a set of peer requirements
- `yarn info` - see information related to packages
- `yarn init` - create a new package
- `yarn install` - install the project dependencies
- `yarn link` - connect the local project to another one
- `yarn node` - run node with the hook already setup
- `yarn npm audit` - perform a vulnerability audit against the installed packages
- `yarn pack` - generate a tarball from the active workspace
- `yarn patch` - prepare a package for patching
- `yarn patch-commit` - generate a patch out of a directory
- `yarn rebuild` - rebuild the project's native packages
- `yarn remove` - remove dependencies from the project
- `yarn run` - run a script defined in the package.json
- `yarn set resolution` - enforce a package resolution
- `yarn set version` - lock the Yarn version used by the project
- `yarn set version from sources` - build Yarn from master
- `yarn stage` - add all yarn files to your vcs
- `yarn unlink` - disconnect the local project from another one
- `yarn unplug` - force the unpacking of a list of packages
- `yarn up` - upgrade dependencies across the project
- `yarn why` - display the reason why a package is needed

### Constraints-related commands

- `yarn constraints` - check that the project constraints are met
- `yarn constraints query` - query the constraints fact database
- `yarn constraints source` - print the source code for the constraints

### Interactive commands

- `yarn search` - open the search interface
- `yarn upgrade-interactive` - open the upgrade interface

### Npm-related commands

- `yarn npm info` - show information about a package
- `yarn npm login` - store new login info to access the npm registry
- `yarn npm logout` - logout of the npm registry
- `yarn npm publish` - publish the active workspace to the npm registry
- `yarn npm tag add` - add a tag for a specific version
- `yarn npm tag list` - list all dist-tags of a package
- `yarn npm tag remove` - remove a tag from a package
- `yarn npm whoami` - display the name of the authenticated user

### Plugin-related commands

- `yarn plugin check` - find all third-party plugins that differ from their own spec
- `yarn plugin import` - download a plugin
- `yarn plugin import from sources` - build a plugin from sources
- `yarn plugin list` - list the available official plugins
- `yarn plugin remove` - remove a plugin
- `yarn plugin runtime` - list the active plugins

### Release-related commands

- `yarn version` - apply a new version to the current package
- `yarn version apply` - apply all the deferred version bumps at once
- `yarn version check` - check that all the relevant packages have been bumped

### Workspace-related commands

- `yarn workspace` - run a command within the specified workspace
- `yarn workspaces focus` - install a single workspace and its dependencies
- `yarn workspaces foreach` - run a command on all workspaces
- `yarn workspaces list` - list all available workspaces

## Project scripts (package.json)

Run with `yarn <script>` or `yarn run <script>`.

- `yarn dev` - `cross-env NODE_ENV=development NETLIFY_DEV=1 astro dev`
- `yarn build` - `cross-env NODE_ENV=production astro build`
- `yarn preview` - `cross-env NODE_ENV=production astro preview`
- `yarn lint` - `eslint "src/**/*.{js,ts,jsx,tsx}"`
- `yarn cleanup:deps` - `depcheck`
- `yarn cleanup:files` - `rimraf node_modules .astro dist build .cache .netlify .turbo .parcel-cache coverage`
- `yarn type-check` - `astro check`
- `yarn prepare` - `husky install`
- `yarn merchant:upload` - `tsx scripts/merchant/upload-google-merchant-feed.ts`
- `yarn stripe:sync` - `tsx scripts/stripe/sync-products.ts`

Note: use `yarn add -D baseline-browser-mapping@latest` instead of `npm i` here, since npm can hit a peer-dep conflict with the legacy `@astrojs/image` package.
