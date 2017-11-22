# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="3.19.0"></a>
# [3.19.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.18.0...ionic@3.19.0) (2017-11-22)


### Bug Fixes

* convert to error stack string before displaying ([3433fdf](https://github.com/ionic-team/ionic-cli/commit/3433fdf))
* **bin:** clean up this strange file ([b5ece73](https://github.com/ionic-team/ionic-cli/commit/b5ece73))
* **link:** clearer words when app already linked ([aa47958](https://github.com/ionic-team/ionic-cli/commit/aa47958))
* print message from brutal error ([5956c74](https://github.com/ionic-team/ionic-cli/commit/5956c74))
* **ssh:** fix parsing of ssh config w/o host directives ([cf4e03f](https://github.com/ionic-team/ionic-cli/commit/cf4e03f))
* **start:** fix some logic issues ([195e089](https://github.com/ionic-team/ionic-cli/commit/195e089))


### Features

* **start:** add prompt during start to add cordova ([62c6c3f](https://github.com/ionic-team/ionic-cli/commit/62c6c3f))
* **start:** personalize cordova files, --bundle-id flag ([45488dd](https://github.com/ionic-team/ionic-cli/commit/45488dd))




<a name="3.18.0"></a>
# [3.18.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.17.0...ionic@3.18.0) (2017-11-09)


### Bug Fixes

* **cordova:** run ionic build before prepare ([932b2ee](https://github.com/ionic-team/ionic-cli/commit/932b2ee))
* **start:** set proper app name ([e2f7167](https://github.com/ionic-team/ionic-cli/commit/e2f7167))


### Features

* **start:** --cordova flag to include cordova integration ([fe31173](https://github.com/ionic-team/ionic-cli/commit/fe31173))
* **start:** custom starters by repo URL ([f54e78b](https://github.com/ionic-team/ionic-cli/commit/f54e78b))




<a name="3.17.0"></a>
# [3.17.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.16.0...ionic@3.17.0) (2017-11-07)


### Bug Fixes

* **login:** show message about failed login for pro ([ee4e14d](https://github.com/ionic-team/ionic-cli/commit/ee4e14d))
* **start:** only error re: git if --pro-id is used ([6f9c6db](https://github.com/ionic-team/ionic-cli/commit/6f9c6db))
* **start:** support not having a manifest ([2ae44d2](https://github.com/ionic-team/ionic-cli/commit/2ae44d2))


### Features

* **integrations:** cordova and gulp integration ([3137c76](https://github.com/ionic-team/ionic-cli/commit/3137c76))
* **start:** custom starters ([1c5a527](https://github.com/ionic-team/ionic-cli/commit/1c5a527))
* **start:** starter manifest integration ([6557396](https://github.com/ionic-team/ionic-cli/commit/6557396))
* **start:** use new starters ([9032f3d](https://github.com/ionic-team/ionic-cli/commit/9032f3d))




<a name="3.16.0"></a>
# [3.16.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.15.2...ionic@3.16.0) (2017-11-01)


### Features

* **devapp:** broadcast app to trusted interfaces ([fb4e38e](https://github.com/ionic-team/ionic-cli/commit/fb4e38e))
* **serve:** add --local flag ([6b68088](https://github.com/ionic-team/ionic-cli/commit/6b68088))




<a name="3.15.2"></a>
## [3.15.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.15.1...ionic@3.15.2) (2017-10-26)


### Bug Fixes

* **serve:** livereload defaults ([16f7d69](https://github.com/ionic-team/ionic-cli/commit/16f7d69))




<a name="3.15.1"></a>
## [3.15.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.15.0...ionic@3.15.1) (2017-10-25)




**Note:** Version bump only for package ionic

<a name="3.15.0"></a>
# [3.15.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.14.0...ionic@3.15.0) (2017-10-25)


### Features

* **info:** show ANDROID_HOME environment variable ([7975cd8](https://github.com/ionic-team/ionic-cli/commit/7975cd8))
* **info:** show proxy environment variables ([9103d09](https://github.com/ionic-team/ionic-cli/commit/9103d09))




<a name="3.14.0"></a>
# [3.14.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.13.2...ionic@3.14.0) (2017-10-23)


### Bug Fixes

* don't use local installation for old cli versions ([fc5db21](https://github.com/ionic-team/ionic-cli/commit/fc5db21))
* **cordova:** platforms.json also unreliable, using platforms/ ([04238f4](https://github.com/ionic-team/ionic-cli/commit/04238f4))
* **cordova:** show output in real time for all cordova commands ([0f91220](https://github.com/ionic-team/ionic-cli/commit/0f91220))


### Features

* **doctor:** list command ([a38be99](https://github.com/ionic-team/ionic-cli/commit/a38be99))
* **doctor:** reveal doctor commands ([fbd52a8](https://github.com/ionic-team/ionic-cli/commit/fbd52a8))




<a name="3.13.2"></a>
## [3.13.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.13.1...ionic@3.13.2) (2017-10-18)


### Bug Fixes

* **package:** resources being excluded with archiverjs ([9387094](https://github.com/ionic-team/ionic-cli/commit/9387094))




<a name="3.13.1"></a>
## [3.13.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.13.0...ionic@3.13.1) (2017-10-16)


### Bug Fixes

* **cordova:** pass-thru for vanilla "prepare" invocation ([ac16ef4](https://github.com/ionic-team/ionic-cli/commit/ac16ef4))




<a name="3.13.0"></a>
# [3.13.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.13.0) (2017-10-10)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **build:** drop arguments ([b4cde2a](https://github.com/ionic-team/ionic-cli/commit/b4cde2a))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **cordova:** fix after_prepare being executed twice ([31225b9](https://github.com/ionic-team/ionic-cli/commit/31225b9))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **cordova:** fix various platform weirdness (use platforms.json) ([2c2478f](https://github.com/ionic-team/ionic-cli/commit/2c2478f))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** more robust error handling for serve, shutdown functions ([a2ba645](https://github.com/ionic-team/ionic-cli/commit/a2ba645))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **devapp:** "handle" error event ([45e565a](https://github.com/ionic-team/ionic-cli/commit/45e565a))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **ssh:** prompt for login before setup begins ([4d2f3b6](https://github.com/ionic-team/ionic-cli/commit/4d2f3b6))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **config:** add interactive config value ([a783d54](https://github.com/ionic-team/ionic-cli/commit/a783d54))
* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssh:** allow generation of non-rsa keys ([4f9c648](https://github.com/ionic-team/ionic-cli/commit/4f9c648))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.12.0"></a>
# [3.12.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.12.0) (2017-09-21)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **devapp:** "handle" error event ([45e565a](https://github.com/ionic-team/ionic-cli/commit/45e565a))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **ssh:** prompt for login before setup begins ([4d2f3b6](https://github.com/ionic-team/ionic-cli/commit/4d2f3b6))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **config:** add interactive config value ([a783d54](https://github.com/ionic-team/ionic-cli/commit/a783d54))
* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssh:** allow generation of non-rsa keys ([4f9c648](https://github.com/ionic-team/ionic-cli/commit/4f9c648))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.11.0"></a>
# [3.11.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.11.0) (2017-09-21)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **devapp:** "handle" error event ([45e565a](https://github.com/ionic-team/ionic-cli/commit/45e565a))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.10.3"></a>
## [3.10.3](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.10.3) (2017-09-13)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **devapp:** "handle" error event ([45e565a](https://github.com/ionic-team/ionic-cli/commit/45e565a))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.10.2"></a>
## [3.10.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.10.2) (2017-09-13)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.10.1"></a>
## [3.10.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.10.1) (2017-09-12)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.10.0"></a>
# [3.10.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.2...ionic@3.10.0) (2017-09-12)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** generate resources upon platform add ([c8b4d11](https://github.com/ionic-team/ionic-cli/commit/c8b4d11))
* **cordova:** show all output for prepare ([ca6e0ef](https://github.com/ionic-team/ionic-cli/commit/ca6e0ef))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **upload:** accept app-script args for builds during upload ([dd5a3a8](https://github.com/ionic-team/ionic-cli/commit/dd5a3a8))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **cordova:** compile accepts cordova build args ([3df280b](https://github.com/ionic-team/ionic-cli/commit/3df280b))
* **cordova:** ionic cordova requirements ([c0696f3](https://github.com/ionic-team/ionic-cli/commit/c0696f3))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **serve:** adds devapp support ([10f34cf](https://github.com/ionic-team/ionic-cli/commit/10f34cf))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="3.9.2"></a>
## [3.9.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.1...ionic@3.9.2) (2017-08-17)


### Bug Fixes

* **resources:** make `--force` flag actually regenerate images ([30d2e5a](https://github.com/ionic-team/ionic-cli/commit/30d2e5a))
* **resources:** reload config.xml after save ([cb85488](https://github.com/ionic-team/ionic-cli/commit/cb85488))




<a name="3.9.1"></a>
## [3.9.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.9.0...ionic@3.9.1) (2017-08-16)


### Bug Fixes

* **plugins:** detect all deprecated plugins ([e32f9c1](https://github.com/ionic-team/ionic-cli/commit/e32f9c1))
* **resources:** detect resources/<platform> dirs upon platform add ([ea07da9](https://github.com/ionic-team/ionic-cli/commit/ea07da9))




<a name="3.9.0"></a>
# [3.9.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.8.1...ionic@3.9.0) (2017-08-16)


### Bug Fixes

* **cordova:** infer --livereload from -c or -s ([0a5ce80](https://github.com/ionic-team/ionic-cli/commit/0a5ce80))


### Features

* **docs:** add --browser/-w option to `ionic docs` ([ca74bdc](https://github.com/ionic-team/ionic-cli/commit/ca74bdc))
* **sourcemaps:** sync sourcemaps with Pro ([f7a37c3](https://github.com/ionic-team/ionic-cli/commit/f7a37c3))




<a name="3.8.1"></a>
## [3.8.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.8.0...ionic@3.8.1) (2017-08-15)


### Bug Fixes

* **cordova:** fix cordova serve issue with cordova.js mock ([f08f22b](https://github.com/ionic-team/ionic-cli/commit/f08f22b))




<a name="3.8.0"></a>
# [3.8.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.7.0...ionic@3.8.0) (2017-08-14)


### Bug Fixes

* **cordova:** do not error on prepare with no platforms ([422c95f](https://github.com/ionic-team/ionic-cli/commit/422c95f))
* show helpful message for invocation of `ionic build` with argument ([02f2574](https://github.com/ionic-team/ionic-cli/commit/02f2574))
* show helpful message for invocation of `ionic share` ([fb0d15d](https://github.com/ionic-team/ionic-cli/commit/fb0d15d))
* show helpful message for invocations of `ionic state` ([d04eb80](https://github.com/ionic-team/ionic-cli/commit/d04eb80))
* **serve:** multitude of serve fixes ([d7fe31d](https://github.com/ionic-team/ionic-cli/commit/d7fe31d))
* **serve:** only show ip prompt if external ip is needed ([89853ca](https://github.com/ionic-team/ionic-cli/commit/89853ca))
* **ssh:** if key exists during generate, ask to overwrite ([59bc4fd](https://github.com/ionic-team/ionic-cli/commit/59bc4fd))


### Features

* **config:** --json and --force options for `config set` ([024ef43](https://github.com/ionic-team/ionic-cli/commit/024ef43))




<a name="3.7.0"></a>
# [3.7.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.6.0...ionic@3.7.0) (2017-08-03)


### Bug Fixes

* **serve:** allow binding of localhost ([e8a74d0](https://github.com/ionic-team/ionic-cli/commit/e8a74d0))
* wrap process.kill for windows ([fa30400](https://github.com/ionic-team/ionic-cli/commit/fa30400))
* **start:** disable yarn dedupe during start ([dd5c35f](https://github.com/ionic-team/ionic-cli/commit/dd5c35f))


### Features

* **build:** `ionic build` command ([3ad304c](https://github.com/ionic-team/ionic-cli/commit/3ad304c))
* **ssh:** provide manual flow for existing ssh keys ([2496ae3](https://github.com/ionic-team/ionic-cli/commit/2496ae3))
* **start:** prompt user about cordova integration ([c194bbc](https://github.com/ionic-team/ionic-cli/commit/c194bbc))
* --json for parseable commands ([f673af1](https://github.com/ionic-team/ionic-cli/commit/f673af1))




<a name="3.6.0"></a>
# [3.6.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.5.0...ionic@3.6.0) (2017-07-27)


### Bug Fixes

* **ionic1:** Fix refresh issue on devices ([3717032](https://github.com/ionic-team/ionic-cli/commit/3717032))
* **login:** show helpful message for people using --email and --password ([d4537e5](https://github.com/ionic-team/ionic-cli/commit/d4537e5))
* **plugins:** remove "Your plugins may be out of date" ([18371e1](https://github.com/ionic-team/ionic-cli/commit/18371e1))
* **timeouts:** rip out timeouts ([22dcd2f](https://github.com/ionic-team/ionic-cli/commit/22dcd2f))


### Features

* ionic pro ([36dc2f7](https://github.com/ionic-team/ionic-cli/commit/36dc2f7))
* **generators:** add examples for module and constants ([8d4975c](https://github.com/ionic-team/ionic-cli/commit/8d4975c))
* **generators:** add module options ([6c85a8e](https://github.com/ionic-team/ionic-cli/commit/6c85a8e))
* **generators:** add option for creating a constants file ([db7b983](https://github.com/ionic-team/ionic-cli/commit/db7b983))
* **info:** add android sdk tools version ([3cc46cf](https://github.com/ionic-team/ionic-cli/commit/3cc46cf))




<a name="3.5.0"></a>
# [3.5.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.4.0...ionic@3.5.0) (2017-07-11)


### Bug Fixes

* **generate:** error on unknown generator ([fb20896](https://github.com/ionic-team/ionic-cli/commit/fb20896))
* **hooks:** show execution of npm script hooks ([e838a5d](https://github.com/ionic-team/ionic-cli/commit/e838a5d))
* **link:** disable interpretation of scientific notation ([3874ca6](https://github.com/ionic-team/ionic-cli/commit/3874ca6))
* **start:** substitute invalid package.json name for MyApp ([ce6c129](https://github.com/ionic-team/ionic-cli/commit/ce6c129))
* **version:** quickfix for control chars in version ([cb448db](https://github.com/ionic-team/ionic-cli/commit/cb448db))


### Features

* automatically detect CI and switch to non-interactive mode ([113b254](https://github.com/ionic-team/ionic-cli/commit/113b254))
* **cloud:** add options for snapshot metadata ([75099e6](https://github.com/ionic-team/ionic-cli/commit/75099e6))




<a name="3.4.0"></a>
# [3.4.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.3.0...ionic@3.4.0) (2017-06-12)


### Bug Fixes

* **ionic1:** logger not logging changed files ([1b51529](https://github.com/ionic-team/ionic-cli/commit/1b51529))
* **serve:** running ionic serve in background ([883c21e](https://github.com/ionic-team/ionic-cli/commit/883c21e))
* **start:** save project name in package.json, not human-readable ([02b6c45](https://github.com/ionic-team/ionic-cli/commit/02b6c45))


### Features

* **hooks:** call npm script hooks ([e34fc34](https://github.com/ionic-team/ionic-cli/commit/e34fc34))
* **info:** show npm version ([044fcd7](https://github.com/ionic-team/ionic-cli/commit/044fcd7))
* **start:** add gulp plugin to new Ionic 1 apps by default ([de32fbb](https://github.com/ionic-team/ionic-cli/commit/de32fbb))




<a name="3.3.0"></a>
# [3.3.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.2.0...ionic@3.3.0) (2017-05-31)


### Bug Fixes

* **cordova:** more arg parsing fixes... ([4a75255](https://github.com/ionic-team/ionic-cli/commit/4a75255))
* **git:** no gpg signing ([5f40324](https://github.com/ionic-team/ionic-cli/commit/5f40324))
* **proxy:** use env load to ensure shared reference ([8552826](https://github.com/ionic-team/ionic-cli/commit/8552826))




<a name="3.2.0"></a>
# [3.2.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.2...ionic@3.2.0) (2017-05-23)


### Bug Fixes

* **cordova:** interpret --save as boolean ([7d7ca56](https://github.com/ionic-team/ionic-cli/commit/7d7ca56))
* **start:** validate prompted name ([221702c](https://github.com/ionic-team/ionic-cli/commit/221702c))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))
* **flags:** persistent "cli flags" ([72a9b45](https://github.com/ionic-team/ionic-cli/commit/72a9b45))
* **logging:** disable interval spinner for non-interactive mode ([9e4ed33](https://github.com/ionic-team/ionic-cli/commit/9e4ed33))
* **login:** automatic login via IONIC_EMAIL/IONIC_PASSWORD ([d8d26e4](https://github.com/ionic-team/ionic-cli/commit/d8d26e4))
* **start:** auto git setup, if available ([7f218f1](https://github.com/ionic-team/ionic-cli/commit/7f218f1))




<a name="3.1.2"></a>
## [3.1.2](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.1...ionic@3.1.2) (2017-05-17)


### Bug Fixes

* **cordova:** do not include cordova integration by default ([a2de983](https://github.com/ionic-team/ionic-cli/commit/a2de983))




<a name="3.1.1"></a>
## [3.1.1](https://github.com/ionic-team/ionic-cli/compare/ionic@3.1.0...ionic@3.1.1) (2017-05-16)




<a name="3.1.0"></a>
# [3.1.0](https://github.com/ionic-team/ionic-cli/compare/ionic@3.0.0...ionic@3.1.0) (2017-05-16)


### Bug Fixes

* **login:** just warn user about active session (fixes https://github.com/ionic-team/ionic-cli/issues/2299) ([eb5a614](https://github.com/ionic-team/ionic-cli/commit/eb5a614))
* **start:** increase download timeout to 3 minutes (fixes https://github.com/ionic-team/ionic-cli/issues/2256) ([001e53a](https://github.com/ionic-team/ionic-cli/commit/001e53a))
