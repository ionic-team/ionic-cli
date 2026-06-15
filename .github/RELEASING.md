# Releasing the Ionic CLI

This runbook describes how the Ionic CLI is published and, specifically, **how
to cut a major release** (e.g. `8.0.0`). It reflects the repository as of the
`major-x` branch.

## 1. How publishing works today

The CLI is a **Lerna monorepo** with `independent` versioning
([`lerna.json`](../lerna.json) → `"version": "independent"`). 
Each `@ionic/*`
package is versioned on its own based on the commits that touched it.

Release is **conventional-commit driven and automatic**:

- [`.github/workflows/cd.yml`](workflows/cd.yml) runs **only on push to the
  `stable` branch**.
- It runs `npm run publish:ci`, defined in [`package.json`](../package.json):

  ```jsonc
  "publish:ci": "lerna version -m 'chore(release): publish [skip ci]' --exact --conventional-commits --yes --create-release github && lerna exec --no-private --since HEAD~ -- npm publish --provenance"
  ```

  - `lerna version --conventional-commits` computes each package's next version
    **from commit messages**, tags, and pushes the release commit.
  - `--create-release github` makes Lerna create the **GitHub Release** for each
    tag (see **3** — requires Lerna 5 and a `GH_TOKEN`).
  - `lerna exec ... npm publish --provenance` publishes the changed packages to
    npm.
- `lerna.json` pins `"allowBranch": "stable"`, so `lerna version` refuses to run
  from any other branch.
- After publishing, `cd.yml` builds and pushes a Docker image to GHCR.

> **Key consequence:** the version bump is derived from commit messages, **not**
> from `BREAKING.md`. `BREAKING.md` is human documentation only. To land
> `@ionic/cli` on `8.0.0`, the branch history must contain **breaking-change
> commits** — a `feat!:` / `fix!:` subject or a `BREAKING CHANGE:` footer — for
> the `@ionic/cli` package.

## 2. Cutting the v8 major

### 2a. Make sure the major bump will be computed

Because versioning is conventional-commit driven:

- The command-removal PRs (tracked separately) **must** use breaking-change
  commit syntax so Lerna computes a major bump for the affected package(s):

  ```
  feat(commands)!: remove deprecated Appflow/Enterprise/Cordova commands

  BREAKING CHANGE: The config, cordova, enterprise, git, init, link,
  live-update, login, logout, repair, signup, and ssh commands have been
  removed. See BREAKING.md.
  ```

- `independent` versioning means **only the packages whose commits include the
  breaking change get the major bump**. Confirm the removals live in the package
  that owns the command surface (typically `@ionic/cli`) so `@ionic/cli` is the
  one that reaches `8.0.0`. Utility `@ionic/*` packages bump independently based
  on their own commits.

### 2b. Path to publish from `major-8.0`

`cd.yml` only publishes from `stable`. The `major-8.0` work branch is **not**
auto-published. Recommended path:

1. Land all removal PRs (with breaking-change commits) onto `major-8.0`.
2. Merge / rebase `major-8.0` → `develop`.
3. Follow the normal `develop` → `stable` promotion. The push to `stable`
   triggers `cd.yml`, which computes the major bump, tags, publishes to npm, and
   creates the GitHub Releases.

### 2c. Optional: ship a v8 release candidate first

Use a prerelease on a `next` dist-tag before GA so consumers can test:

```bash
# Dry, local prerelease (already defined, never pushes):
npm run publish:testing   # publishes a `testing` prerelease with --no-push

# A real RC under the `next` tag (run from an allowed branch):
lerna publish premajor --preid rc --dist-tag next --conventional-commits
```

> To cut an RC directly from `major-8.0`, temporarily relax `allowBranch` in
> `lerna.json` (e.g. `["stable", "major-8.0"]`) or run the prerelease from
> `stable`. Decide this deliberately — don't leave `major-8.0` permanently
> publishable.

## 3. GitHub Release creation (Lerna 5)

The CLI was upgraded from Lerna **3.13.3 → 5.x** so that releases are created on
GitHub natively. This is wired via
`--create-release github` in `publish:ci` (**1**).

Requirements for `--create-release github` to work in CI:

- It must run together with `--conventional-commits` (it is).
- A **`GH_TOKEN`** must be present in the environment of the `lerna version`
  step. [`cd.yml`](workflows/cd.yml) provides it as `${{ github.token }}` — the
  built-in workflow token, which is sufficient because the workflow already
  grants `contents: write`. **No dedicated secret is required.**

## 4. Pre-publish validation (always, but especially after the Lerna upgrade)

These steps are **cross-platform** — every command is `npm`/`npx`-based and runs
identically in PowerShell, `cmd`, bash, and zsh (Windows and macOS). Use
**Node 18** (the version CI runs — see `cd.yml`/`ci.yml`); newer Node majors can
trip the bundled jest 26 worker on some platforms.

> **Order matters.** This is a `lerna bootstrap` monorepo: per-package
> devDependencies (including `@types/node`) are installed and hoisted by
> `npm run bootstrap`, **not** by `npm install`. You must run steps 0→1 before
> any `build`/`lint`/`test`. Running `npm run build` on a freshly-cleaned tree
> fails with `TS2688: Cannot find type definition file for 'node'` — that means
> bootstrap was skipped, not a real code error.

```bash
# 0. (optional) Pristine tree — npx rimraf is cross-platform, unlike rm -rf
npx rimraf node_modules "packages/@ionic/*/node_modules" "packages/cli-scripts/node_modules"

# 1. Install + bootstrap — REQUIRED before build/lint/test.
#    `npm install` only installs root devDeps (lerna, typescript);
#    `npm run bootstrap` installs+hoists every package's deps, then builds.
npm install
npm run bootstrap

# 2. Confirm the Lerna upgrade — expect 5.x, and `--create-release` in the help
npx lerna --version
npx lerna version --help        # look for: --create-release ... [choices: "gitlab","github"]

# 3. Lint / test  (bootstrap already built; re-run build explicitly if you like)
npm run lint
npm run test
#    Drift guard: a green build of @ionic/discover (no publisher.ts "broadcast"
#    TS2322) confirms the netmask@2.0.2 + @types/netmask@2.0.5 pins resolved.

# 4. Non-publishing version smoke test — exercises the Lerna 5 version path
#    WITHOUT publishing to npm or touching git. --allow-branch "*" overrides the
#    lerna.json `allowBranch: stable` guard for this one local run.
#    Single line + quoted "*" so it runs the same in PowerShell, cmd, bash, zsh.
npx lerna version --conventional-commits --no-push --no-git-tag-version --allow-branch "*" --yes
git checkout -- packages   # discard the version/CHANGELOG file writes lerna just made
```

> **`npm run publish:testing` is NOT a dry run — it publishes to npm.**
> `lerna publish` runs an `npm publish` (the `@ionic/*` packages under the
> `testing` dist-tag); `--no-push`/`--no-git-tag-version` only suppress *git*
> actions, not the registry publish. It also only runs from `stable` (the
> `allowBranch` guard). Use step 4 above for a safe local check. Run
> `publish:testing` only when you actually intend to push a `testing` prerelease
> to npm, with valid npm credentials.

The step-4 smoke test also reveals the **computed version bump** from the
branch's conventional commits. Note it will show a `patch`/`minor` bump until
the branch carries breaking-change commits (`feat!:` / `BREAKING CHANGE:`) —
those, not `BREAKING.md`, are what make `@ionic/cli` land on `8.0.0` (see §1).

> **Known platform note (pre-existing, unrelated to the release tooling):** on
> **Windows**, one test in `integrations/cordova` asserts POSIX (`/`) path
> separators and fails because `path.relative` returns `\` on Windows. It passes
> on macOS/Linux (and therefore in CI). It is not introduced by these changes,
> and the Cordova integration is slated for removal in v8.
