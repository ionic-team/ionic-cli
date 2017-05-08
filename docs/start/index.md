---
layout: fluid/docs_cli_base
category: cli
id: cli-start
command_name: start
title: start Command
header_sub_title: Ionic CLI
---

# start Command


## Name

start -- Create a new project
  
## Synopsis

```bash
$ ionic start <name> [template]
```
  
## Description

Create a new project


Input | Description
----- | ----------
`name` | The name of your project directory
`template` | The starter template to use (e.g. blank, tabs; use --list to see all)


Option | Description
------ | ----------
`--type` | Type of project to start (e.g. ionic-angular, ionic1)
`--app-name`, `-n` | Human-readable name (use quotes around the name)
`--list`, `-l` | List starter templates available
`--skip-deps` | Skip npm/yarn package installation of dependencies
`--yarn` | Opt-in to using yarn (instead of npm)
`--skip-link` | Do not link app to an Ionic Account

## Examples

```bash
$ ionic start 
$ ionic start mynewapp blank
$ ionic start mynewapp tabs --type ionic-angular
$ ionic start mynewapp blank --type ionic1
```
