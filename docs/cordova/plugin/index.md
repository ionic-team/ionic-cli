---
layout: fluid/docs_base
category: cli
id: cli-cordova-plugin
command_name: cordova plugin
title: cordova plugin
header_sub_title: Ionic CLI
---

# `$ cordova plugin`

Manage Cordova plugins
## Synopsis

```bash
$ ionic cordova plugin [action] [plugin]
```
  
## Details


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
