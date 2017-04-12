
## NAME
start -- Create a new project
  
## SYNOPSIS
    ionic start <name> <template>
  
## DESCRIPTION
Create a new project


Input | Description
----- | ----------
`name` | The name of your project directory
`template` | The starter template to use (e.g. blank, tabs; use --list to see all)


Option | Description
------ | ----------
`--type` | Type of project to start (e.g. ionic-angular, ionic1)
`--app-name`, `-n` | Human-readable name (use quotes around the name)
`--skip-npm` | Skip npm package installation
`--list`, `-l` | List starter templates available
`--skip-link` | Do not link app to an Ionic Account

## EXAMPLES
    ionic start mynewapp blank 
    ionic start mynewapp tabs --type ionic-angular 
    ionic start mynewapp blank --type ionic1 
