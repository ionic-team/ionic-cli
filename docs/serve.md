
## NAME
serve -- Start a local development server for app dev/testing
  
## SYNOPSIS
    ionic serve 
  
## DESCRIPTION
Start a local development server for app dev/testing





Option | Description
------ | ----------
`--consolelogs`, `-c` | Print app console logs to Ionic CLI
`--serverlogs`, `-s` | Print dev server logs to Ionic CLI
`--port`, `-p` | Dev server HTTP port
`--livereload-port`, `-r` | Live Reload port
`--nobrowser`, `-b` | Disable launching a browser
`--nolivereload`, `-d` | Do not start live reload
`--noproxy`, `-x` | Do not add proxies
`--address` | Use specific address or return with failure
`--browser`, `-w` | Specifies the browser to use (safari, firefox, chrome)
`--browseroption`, `-o` | Specifies a path to open to (/#/tab/dash)
`--lab`, `-l` | Test your apps on multiple platform types in the browser
`--platform`, `-t` | Start serve with a specific platform (ios/android)
`--qrcode` | Print a QR code for Ionic View instead of network broadcasting

## EXAMPLES
    ionic serve --lab --consolelogs -s 
