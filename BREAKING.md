# Breaking Changes

This is a comprehensive list of the breaking changes introduced in the major
version releases of the Ionic CLI.

## Versions

- [Version 8.x](#version-8x)

> Older majors are archived under [`BREAKING_ARCHIVE/`](BREAKING_ARCHIVE) (e.g.
> `BREAKING_ARCHIVE/v7.md`). When the next major begins, move the section below
> into `BREAKING_ARCHIVE/v8.md` and start a fresh `Version 9.x` section here.

## Version 8.x

In version 8, the Ionic CLI is focused on the **Framework and Capacitor**
workflows. The Appflow, Enterprise, and Cordova commands have been removed.

- [Removed Commands](#removed-commands)

### Removed Commands

The following commands have been removed. Each entry records **what was
removed**, **why**, and the **migration path / alternative**.

> **Note:** The removal PRs are authored and coordinated separately. The entries
> below are seeded placeholders — each removal PR should fill in the specifics
> (the exact `diff`, the reason, and the migration link) for the command it
> removes.

#### `config`

- **What:** The `config` command (and its `config get` / `config set` /
  `config unset` subcommands) has been removed. _<TODO: confirm exact surface
  removed in the removal PR.>_
- **Why:** _<TODO: rationale — CLI configuration scope reduced for the
  Framework/Capacitor-focused CLI.>_
- **Migration:** _<TODO: alternative / link.>_

#### `cordova`

- **What:** The `cordova` command group has been removed. _<TODO: confirm exact
  surface removed.>_
- **Why:** _<TODO: Cordova retirement in favor of Capacitor.>_
- **Migration:** Migrate to Capacitor. _<TODO: link to the Capacitor migration
  guide.>_

#### `enterprise`

- **What:** The `enterprise` command group has been removed. _<TODO: confirm
  exact surface removed.>_
- **Why:** _<TODO: Ionic Enterprise tooling retirement.>_
- **Migration:** _<TODO: point Enterprise users to current Appflow / Enterprise
  tooling.>_

#### `git`

- **What:** The `git` command group has been removed. _<TODO: confirm exact
  surface removed.>_
- **Why:** _<TODO: tied to Appflow remote workflows being retired from the
  CLI.>_
- **Migration:** _<TODO: alternative / link.>_

#### `init`

- **What:** The `init` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: rationale.>_
- **Migration:** _<TODO: alternative — e.g. `ionic start` / Capacitor init.>_

#### `integrations` (Enterprise portion only)

- **What:** The **Enterprise portion** of the `integrations` command has been
  removed. **The Capacitor integration is kept.** _<TODO: confirm exact
  subcommands/flags removed vs. retained.>_
- **Why:** _<TODO: Enterprise integration retirement; Capacitor remains a
  first-class workflow.>_
- **Migration:** Continue using `ionic integrations enable capacitor`. _<TODO:
  link.>_

#### `link`

- **What:** The `link` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: Appflow app-linking retirement.>_
- **Migration:** _<TODO: point Appflow users to current Appflow tooling.>_

#### `live-update`

- **What:** The `live-update` command group has been removed. _<TODO: confirm
  exact surface removed.>_
- **Why:** _<TODO: Appflow Live Updates retirement from the CLI.>_
- **Migration:** _<TODO: point users to current Appflow Live Updates tooling.>_

#### `login`

- **What:** The `login` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: Ionic account auth no longer needed by the CLI.>_
- **Migration:** _<TODO: alternative / link.>_

#### `logout`

- **What:** The `logout` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: counterpart to `login` removal.>_
- **Migration:** _<TODO: alternative / link.>_

#### `repair`

- **What:** The `repair` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: rationale.>_
- **Migration:** _<TODO: alternative / link.>_

#### `signup`

- **What:** The `signup` command has been removed. _<TODO: confirm exact surface
  removed.>_
- **Why:** _<TODO: Ionic account flows removed from the CLI.>_
- **Migration:** _<TODO: alternative / link.>_

#### `ssh`

- **What:** The `ssh` command group (and its subcommands) has been removed.
  _<TODO: confirm exact surface removed.>_
- **Why:** _<TODO: Appflow SSH key management retirement from the CLI.>_
- **Migration:** _<TODO: point Appflow users to current Appflow tooling.>_
