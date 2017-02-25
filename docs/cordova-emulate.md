
## NAME
      cordova:emulate -- Emulate an Ionic project on a simulator or emulator
  
## SYNOPSIS
      ionic cordova:emulate <platform>
  
## DESCRIPTION
      Emulate an Ionic project on a simulator or emulator

      platform ................. the platform to emulate: [1mios[22m, [1mandroid[22m
      --livereload, -l ......... Live reload app dev files from the device
      --address ................ Use specific address (livereload req.)
      --consolelogs, -c ........ Print app console logs to Ionic CLI
      --serverlogs, -s ......... Print dev server logs to Ionic CLI
      --port, -p ............... Dev server HTTP port (8100 default)
      --livereload-port, -r .... Live Reload port (35729 default)
      --prod ................... Create a prod build with app-scripts
      --list ................... List all available cordova run targets
      --debug .................. Create a cordova debug build
      --release ................ Create a cordova release build
      --device ................. Deploy cordova build to a device
      --target ................. Deploy cordova build to a device. Options available with --list.

## EXAMPLES
      $ ionic cordova:emulate ios --livereload -c -s 
