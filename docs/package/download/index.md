---
layout: fluid/docs_base
category: cli
id: cli-package-download
command_name: package download
title: package download
header_sub_title: Ionic CLI
---

# `$ ionic package download`

Download your packaged app
## Synopsis

```bash
$ ionic package download [id]
```
  
## Details


Input | Description
----- | ----------
`id` | The build ID to download. Defaults to the latest build


Option | Description
------ | ----------
`--destination`, `-d` | The download destination directory

## Examples

```bash
$ ionic package download 
$ ionic package download 15
$ ionic package download -d my_builds
```
