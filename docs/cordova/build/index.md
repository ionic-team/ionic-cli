---
layout: fluid/docs_cli_base
category: cli
id: cli-cordova-build
command_name: cordova build
title: cordova build Command
header_sub_title: Ionic CLI
---

# cordova build Command


## Name

cordova build -- Build (prepare + compile) an Ionic project for a given platform
  
## Synopsis

```bash
$ ionic cordova build <platform>
```
  
## Description

Build (prepare + compile) an Ionic project for a given platform


Input | Description
----- | ----------
`platform` | The platform to build: ios, android


Option | Description
------ | ----------
`--prod` | Build the application for production
`--debug` | Create a Cordova debug build
`--release` | Create a Cordova release build
`--device` | Deploy Cordova build to a device
`--emulator` | Deploy Cordova build to an emulator
`--buildConfig` | Use the specified Cordova build configuration

## Examples

```bash
$ ionic cordova build ios
```
