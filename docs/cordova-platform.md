
## NAME
cordova platform -- Add or remove a platform target for building an Ionic app
  
## SYNOPSIS
    ionic cordova platform <action> <platform>
  
## DESCRIPTION
Add or remove a platform target for building an Ionic app


Input | Description
----- | ----------
`action` | add, remove, or update a platform; list all project platforms
`platform` | The platform that you would like to add (e.g. ios, android)


Option | Description
------ | ----------
`--noresources`, `-r` | Do not add default Ionic icons and splash screen resources (corresponds to add)
`--nosave`, `-e` | Do not update the config.xml (corresponds to add, remove, update)

## EXAMPLES
    ionic cordova platform add android
