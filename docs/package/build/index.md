---
layout: fluid/docs_base
category: cli
id: cli-package-build
command_name: package build
title: package build
header_sub_title: Ionic CLI
---

# `$ ionic package build`

Start a package build
## Synopsis

```bash
$ ionic package build <platform>
```
  
## Details


Input | Description
----- | ----------
`platform` | The platform to target: ios, android


Option | Description
------ | ----------
`--prod` | Mark this build as a production build
`--release` | Mark this build as a release build
`--profile`, `-p` | The security profile to use with this build
`--note` | Give the package snapshot a note

## Examples

```bash
$ ionic package build android
$ ionic package build ios --profile dev
$ ionic package build android --profile prod --release --prod
```
