---
layout: fluid/docs_base
category: cli
id: cli-serve
command_name: serve
title: serve
header_sub_title: Ionic CLI
---

# `$ serve`

Start a local development server for app dev/testing
## Synopsis

```bash
$ ionic serve 
```
  
## Details





Option | Description
------ | ----------
`--consolelogs`, `-c` | Print app console logs to Ionic CLI
`--serverlogs`, `-s` | Print dev server logs to Ionic CLI
`--port`, `-p` | Dev server HTTP port
`--livereload-port`, `-r` | Live Reload port
`--nobrowser`, `-b` | Disable launching a browser
`--nolivereload`, `-d` | Do not start live reload
`--noproxy`, `-x` | Do not add proxies
`--address` | Network address for server
`--browser`, `-w` | Specifies the browser to use (safari, firefox, chrome)
`--browseroption`, `-o` | Specifies a path to open to (/#/tab/dash)
`--lab`, `-l` | Test your apps on multiple platform types in the browser
`--nogulp` | Disable gulp
`--nosass` | Disable sass
`--platform`, `-t` | Start serve with a specific platform (ios/android)

## Examples

```bash
$ ionic serve --lab --consolelogs -s
```
