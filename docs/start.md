
## NAME
start -- Creates a new project
  
## SYNOPSIS
    ionic start <name> <template>
  
## DESCRIPTION
Creates a new project


Input | Description
----- | ----------
`name` | directory and name for the new project
`template` | Starter templates can either come from a named template (ex: blank, tabs, maps)


Option | Description
------ | ----------
`--type` | Type of project to start. The default is 'ionic-angular'. (ex: ionic-angular, ionic1)
`--appname`, `-a` | Human readable name for the app (Use quotes around the name
`--skip-npm` | Skip npm package installation
`--list`, `-l` | List starter templates available
`--cloud-app-id` | An existing Ionic.io app ID to link with
`--skip-link` | Do not link app to an Ionic Account

## EXAMPLES
    ionic start mynewapp blank 
    ionic start mynewapp tabs --type=ionic-angular 
    ionic start mynewapp blank --type=ionic1 
