
## NAME
build -- Build (prepare + compile) an Ionic project for a given platform
  
## SYNOPSIS
    ionic build <platform>
  
## DESCRIPTION
Build (prepare + compile) an Ionic project for a given platform


Input | Description
----- | ----------
`platform` | the platform that you would like to build: ios, android


Option | Description
------ | ----------
`--prod` | Build the application for production
`--debug` | Create a cordova debug build
`--release` | Create a cordova release build
`--device` | Deploy cordova build to a device
`--emulator` | Deploy cordova build to an emulator

## EXAMPLES
    ionic build ios 
