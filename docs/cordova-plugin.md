
## NAME
cordova:plugin -- Manage cordova plugins
  
## SYNOPSIS
    ionic cordova:plugin <action> [plugin]
  
## DESCRIPTION
Manage cordova plugins


Input | Description
----- | ----------
`action` | add or remove a plugin; list all project plugins
`plugin` | the plugin that you would like to add or remove


Option | Description
------ | ----------
`--nosave`, `-e` | Do not update the config.xml (add, remove)
`--force` | Update the plugin even if the same file already exists (add)

## EXAMPLES
    ionic cordova:plugin add cordova-plugin-inappbrowser@latest 
    ionic cordova:plugin list 
