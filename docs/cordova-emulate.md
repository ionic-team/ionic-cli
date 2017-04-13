
## NAME
cordova emulate -- Emulate an Ionic project on a simulator or emulator
  
## SYNOPSIS
    cordova emulate <platform>
  
## DESCRIPTION
Emulate an Ionic project on a simulator or emulator


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

## EXAMPLES
    cordova emulate ios --livereload -c -s
