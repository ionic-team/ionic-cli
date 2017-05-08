---
layout: fluid/docs_cli_base
category: cli
id: cli-cordova-platform
command_name: cordova platform
title: cordova platform Command
header_sub_title: Ionic CLI
---

# cordova platform Command


## Name

cordova platform -- Add or remove a platform target for building an Ionic app
  
## Synopsis

```bash
$ ionic cordova platform [action] [platform]
```
  
## Description

Add or remove a platform target for building an Ionic app


Input | Description
----- | ----------
`action` | add, remove, or update a platform; list, check, or save all project platforms
`platform` | The platform that you would like to add (e.g. ios, android)


Option | Description
------ | ----------
`--noresources`, `-r` | Do not add default Ionic icons and splash screen resources (corresponds to add)

## Examples

```bash
$ ionic cordova platform add android
```
