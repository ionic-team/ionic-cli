---
layout: fluid/docs_base
category: cli
id: cli-cordova-emulate
command_name: cordova emulate
title: cordova emulate
header_sub_title: Ionic CLI
---

# `$ ionic cordova emulate`

Emulate an Ionic project on a simulator or emulator
## Synopsis

```bash
$ ionic cordova emulate <platform>
```
  
## Details


Input | Description
----- | ----------
`platform` | The platform to emulate: ios, android


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
`--target` | Deploy Cordova build to a device (use --list to see all)

## Examples

```bash
$ ionic cordova emulate ios --livereload -c -s
```
