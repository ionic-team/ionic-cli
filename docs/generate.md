
## NAME
generate -- Generate pages and components
  
## SYNOPSIS
    ionic generate <generator> <name>
  
## DESCRIPTION
Generate pages and components

* generator ................ The generator that you would like to use
* name ..................... What name that you like for the file:
* --includeSpec ............ Create test spec basic to pages, components, directives, pipes and providers
* --skipScss ............... Do not create scss for components and pages
* --componentsDir .......... Project path where the component should be created
* --directivesDir .......... Project path where the directive should be created
* --pagesDir ............... Project path where the page should be created
* --pipesDir ............... Project path where the pipe should be created
* --providersDir ........... Project path where the provider should be created
* --templateDir ............ Project path for templates custom to pages, components, directives, pipes and providers

## EXAMPLES
    ionic generate page thingsList --skipScss --componentsDir="src/components" 
    ionic generate  (for interactive) 
