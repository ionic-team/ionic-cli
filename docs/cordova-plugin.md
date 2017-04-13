
## NAME
cordova plugin -- Manage Cordova plugins
  
## SYNOPSIS
    cordova plugin <action> [plugin]
  
## DESCRIPTION
Manage Cordova plugins


Input | Description
----- | ----------
`action` | add or remove a plugin; list all project plugins
`plugin` | The name of the plugin (corresponds to add and remove)


Option | Description
------ | ----------
`--nosave`, `-e` | Do not update config.xml (corresponds to add and remove)
`--force` | Forve overwrite the plugin if it exists (corresponds to add)

## EXAMPLES
    cordova plugin add cordova-plugin-inappbrowser@latest
    cordova plugin list
