---
layout: fluid/docs_base
category: cli
id: cli-cordova-run
command_name: cordova run
title: cordova run
header_sub_title: Ionic CLI
---

# `$ ionic cordova run`

Run an Ionic project on a connected device
## Synopsis

```bash
$ ionic cordova run <platform>
```
  
## Details


Input | Description
----- | ----------
`platform` | The platform to run: ios, android


Option | Description
------ | ----------
`--livereload`, `-l` | Live reload app dev files from the device
`--address` | Use specific address (livereload req.)
`--consolelogs`, `-c` | Print app console logs to Ionic CLI
`--serverlogs`, `-s` | Print dev server logs to Ionic CLI
`--port`, `-p` | Dev server HTTP port
`--livereload-port`, `-r` | Live Reload port
`--prod` | Create a prod build with app-scripts
`--list` | List all available Cordova run targets
`--debug` | Create a Cordova debug build
`--release` | Create a Cordova release build
`--device` | Deploy Cordova build to a device
`--emulator` | Deploy Cordova build to an emulator
`--target` | Deploy Cordova build to a device (use --list to see all)
`--buildConfig` | Use the specified Cordova build configuration

## Examples

```bash
$ ionic cordova run ios --livereload -c -s
```
