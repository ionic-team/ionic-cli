---
layout: fluid/docs_cli_base
category: cli
id: cli-cordova-plugin
command_name: cordova plugin
title: cordova plugin Command
header_sub_title: Ionic CLI
---

# cordova plugin Command


## Name

cordova plugin -- Manage Cordova plugins
  
## Synopsis

```bash
$ ionic cordova plugin [action] [plugin]
```
  
## Description

Manage Cordova plugins


Input | Description
----- | ----------
`action` | add or remove a plugin; list or save all project plugins
`plugin` | The name of the plugin (corresponds to add and remove)


Option | Description
------ | ----------
`--force` | Forve overwrite the plugin if it exists (corresponds to add)

## Examples

```bash
$ ionic cordova plugin add cordova-plugin-inappbrowser@latest
$ ionic cordova plugin list
```
