# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

<a name="1.18.0"></a>
# [1.18.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.17.0...@ionic/cli-utils@1.18.0) (2017-11-09)


### Bug Fixes

* **build:** perform sass task during build ([bb45db4](https://github.com/ionic-team/ionic-cli/commit/bb45db4))
* **doctor:** fix ENOENT error with config.xml ([7c9fd85](https://github.com/ionic-team/ionic-cli/commit/7c9fd85))


### Features

* **start:** --cordova flag to include cordova integration ([fe31173](https://github.com/ionic-team/ionic-cli/commit/fe31173))




<a name="1.17.0"></a>
# [1.17.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.16.0...@ionic/cli-utils@1.17.0) (2017-11-07)


### Bug Fixes

* **login:** show message about failed login for pro ([ee4e14d](https://github.com/ionic-team/ionic-cli/commit/ee4e14d))
* **serve:** devapp errors are now debug messages ([7afe944](https://github.com/ionic-team/ionic-cli/commit/7afe944))


### Features

* **integrations:** cordova and gulp integration ([3137c76](https://github.com/ionic-team/ionic-cli/commit/3137c76))
* **npm:** support npm rebuild cmd ([2350a57](https://github.com/ionic-team/ionic-cli/commit/2350a57))
* **start:** custom starters ([1c5a527](https://github.com/ionic-team/ionic-cli/commit/1c5a527))
* **start:** starter manifest integration ([6557396](https://github.com/ionic-team/ionic-cli/commit/6557396))
* **start:** use new starters ([9032f3d](https://github.com/ionic-team/ionic-cli/commit/9032f3d))




<a name="1.16.0"></a>
# [1.16.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.15.2...@ionic/cli-utils@1.16.0) (2017-11-01)


### Features

* **devapp:** broadcast app to trusted interfaces ([fb4e38e](https://github.com/ionic-team/ionic-cli/commit/fb4e38e))
* **serve:** add --local flag ([6b68088](https://github.com/ionic-team/ionic-cli/commit/6b68088))




<a name="1.15.2"></a>
## [1.15.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.15.1...@ionic/cli-utils@1.15.2) (2017-10-26)


### Bug Fixes

* **serve:** livereload defaults ([16f7d69](https://github.com/ionic-team/ionic-cli/commit/16f7d69))




<a name="1.15.1"></a>
## [1.15.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.15.0...@ionic/cli-utils@1.15.1) (2017-10-25)


### Bug Fixes

* **cordova:** proxy settings on by default ([19a3390](https://github.com/ionic-team/ionic-cli/commit/19a3390))
* **cordova:** recognize more browsers ([dcaaf97](https://github.com/ionic-team/ionic-cli/commit/dcaaf97))
* **doctor:** fix incorrect count ([b85fd11](https://github.com/ionic-team/ionic-cli/commit/b85fd11))




<a name="1.15.0"></a>
# [1.15.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.14.0...@ionic/cli-utils@1.15.0) (2017-10-25)


### Bug Fixes

* **cordova:** only return known platforms ([d2e2b26](https://github.com/ionic-team/ionic-cli/commit/d2e2b26))
* **doctor:** ignore bundle ID ailment if no cordova integration ([182205d](https://github.com/ionic-team/ionic-cli/commit/182205d))
* **ssh:** fix whitespace issues with ssh config ([bb4ee5d](https://github.com/ionic-team/ionic-cli/commit/bb4ee5d))


### Features

* **info:** show proxy environment variables ([9103d09](https://github.com/ionic-team/ionic-cli/commit/9103d09))
* **options:** environment variables for command-line opts ([7d39dee](https://github.com/ionic-team/ionic-cli/commit/7d39dee))




<a name="1.14.0"></a>
# [1.14.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.13.1...@ionic/cli-utils@1.14.0) (2017-10-23)


### Bug Fixes

* don't use local installation for old cli versions ([fc5db21](https://github.com/ionic-team/ionic-cli/commit/fc5db21))
* **cordova:** platforms.json also unreliable, using platforms/ ([04238f4](https://github.com/ionic-team/ionic-cli/commit/04238f4))
* **cordova:** show output in real time for all cordova commands ([0f91220](https://github.com/ionic-team/ionic-cli/commit/0f91220))
* **doctor:** cordova platform save doesn't save to package.json ([56d64e6](https://github.com/ionic-team/ionic-cli/commit/56d64e6))
* **doctor:** look for uncommitted changes, too ([53750b7](https://github.com/ionic-team/ionic-cli/commit/53750b7))
* **pagination:** fix state issue with query params ([5d73098](https://github.com/ionic-team/ionic-cli/commit/5d73098))


### Features

* **doctor:** detect absence of viewport-fit=cover ([7f983c0](https://github.com/ionic-team/ionic-cli/commit/7f983c0))
* **doctor:** detect default bundle ID ([2761fb9](https://github.com/ionic-team/ionic-cli/commit/2761fb9))
* **doctor:** ionic native ailments ([3581537](https://github.com/ionic-team/ionic-cli/commit/3581537))
* **doctor:** list command ([a38be99](https://github.com/ionic-team/ionic-cli/commit/a38be99))




<a name="1.13.1"></a>
## [1.13.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.13.0...@ionic/cli-utils@1.13.1) (2017-10-16)




**Note:** Version bump only for package @ionic/cli-utils

<a name="1.13.0"></a>
# [1.13.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.13.0) (2017-10-10)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **config:** no config option for this yet ([85e9f81](https://github.com/ionic-team/ionic-cli/commit/85e9f81))
* **config:** prepare configs during env generation ([d0a3072](https://github.com/ionic-team/ionic-cli/commit/d0a3072))
* **cordova:** fix after_prepare being executed twice ([31225b9](https://github.com/ionic-team/ionic-cli/commit/31225b9))
* **cordova:** fix various platform weirdness (use platforms.json) ([2c2478f](https://github.com/ionic-team/ionic-cli/commit/2c2478f))
* **cordova:** look for paths with backslashes, and replace ([9dfc78c](https://github.com/ionic-team/ionic-cli/commit/9dfc78c))
* **cordova:** more robust error handling for serve, shutdown functions ([a2ba645](https://github.com/ionic-team/ionic-cli/commit/a2ba645))
* **cordova:** pass --prod to app-scripts for cordova builds ([3453ed9](https://github.com/ionic-team/ionic-cli/commit/3453ed9))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** send options w/o intent to app-scripts ([0065658](https://github.com/ionic-team/ionic-cli/commit/0065658))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **serve:** do not merge watch patterns ([8664927](https://github.com/ionic-team/ionic-cli/commit/8664927))
* **serve:** find nearest port for dev logger ([9ecc62f](https://github.com/ionic-team/ionic-cli/commit/9ecc62f))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))
* **ssh:** ensure proper whitespace ([e232787](https://github.com/ionic-team/ionic-cli/commit/e232787))


### Features

* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **config:** add interactive config value ([a783d54](https://github.com/ionic-team/ionic-cli/commit/a783d54))
* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **resources:** generate iPhone X splash ([e38c1f0](https://github.com/ionic-team/ionic-cli/commit/e38c1f0))
* **resources:** generate new iOS 1024 marketing icon ([6c99b86](https://github.com/ionic-team/ionic-cli/commit/6c99b86))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssh:** allow generation of non-rsa keys ([4f9c648](https://github.com/ionic-team/ionic-cli/commit/4f9c648))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.12.0"></a>
# [1.12.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.12.0) (2017-09-21)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **config:** no config option for this yet ([85e9f81](https://github.com/ionic-team/ionic-cli/commit/85e9f81))
* **cordova:** pass --prod to app-scripts for cordova builds ([3453ed9](https://github.com/ionic-team/ionic-cli/commit/3453ed9))
* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** send options w/o intent to app-scripts ([0065658](https://github.com/ionic-team/ionic-cli/commit/0065658))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **serve:** do not merge watch patterns ([8664927](https://github.com/ionic-team/ionic-cli/commit/8664927))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **ssh:** ensure proper whitespace ([e232787](https://github.com/ionic-team/ionic-cli/commit/e232787))


### Features

* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **config:** add interactive config value ([a783d54](https://github.com/ionic-team/ionic-cli/commit/a783d54))
* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **resources:** generate iPhone X splash ([e38c1f0](https://github.com/ionic-team/ionic-cli/commit/e38c1f0))
* **resources:** generate new iOS 1024 marketing icon ([6c99b86](https://github.com/ionic-team/ionic-cli/commit/6c99b86))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssh:** allow generation of non-rsa keys ([4f9c648](https://github.com/ionic-team/ionic-cli/commit/4f9c648))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.11.0"></a>
# [1.11.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.11.0) (2017-09-21)


### Bug Fixes

* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **config:** compute urls for backend ([19687b1](https://github.com/ionic-team/ionic-cli/commit/19687b1))
* **cordova:** pass --prod to app-scripts for cordova builds ([3453ed9](https://github.com/ionic-team/ionic-cli/commit/3453ed9))
* **cordova:** remove original-src from config.xml after serve ([4835cd9](https://github.com/ionic-team/ionic-cli/commit/4835cd9))
* **cordova:** send options w/o intent to app-scripts ([0065658](https://github.com/ionic-team/ionic-cli/commit/0065658))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **serve:** do not merge watch patterns ([8664927](https://github.com/ionic-team/ionic-cli/commit/8664927))
* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* prefer locally installed executables ([fe07215](https://github.com/ionic-team/ionic-cli/commit/fe07215))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))
* **ssh:** ensure proper whitespace ([e232787](https://github.com/ionic-team/ionic-cli/commit/e232787))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **info:** show backend ([e1b7fda](https://github.com/ionic-team/ionic-cli/commit/e1b7fda))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* **resources:** generate iPhone X splash ([e38c1f0](https://github.com/ionic-team/ionic-cli/commit/e38c1f0))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.10.2"></a>
## [1.10.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.10.2) (2017-09-13)


### Bug Fixes

* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** pass --prod to app-scripts for cordova builds ([3453ed9](https://github.com/ionic-team/ionic-cli/commit/3453ed9))
* **cordova:** send options w/o intent to app-scripts ([0065658](https://github.com/ionic-team/ionic-cli/commit/0065658))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.10.1"></a>
## [1.10.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.10.1) (2017-09-12)


### Bug Fixes

* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** pass --prod to app-scripts for cordova builds ([3453ed9](https://github.com/ionic-team/ionic-cli/commit/3453ed9))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.10.0"></a>
# [1.10.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.2...@ionic/cli-utils@1.10.0) (2017-09-12)


### Bug Fixes

* better guidance for custom projects ([91c1be1](https://github.com/ionic-team/ionic-cli/commit/91c1be1))
* **backends:** explicitly list known backends ([84fa7d7](https://github.com/ionic-team/ionic-cli/commit/84fa7d7))
* **cordova:** write hash files only after successful resources generation ([47286cb](https://github.com/ionic-team/ionic-cli/commit/47286cb))
* **ionic1:** fix --consolelogs ([5763a38](https://github.com/ionic-team/ionic-cli/commit/5763a38))
* **pro:** fix "infinity" bug ([3cb47f0](https://github.com/ionic-team/ionic-cli/commit/3cb47f0))
* **serve:** ionic serve w/o external network should work ([eee3cb7](https://github.com/ionic-team/ionic-cli/commit/eee3cb7))


### Features

* **cordova:** add --dev-logger-port to run/emulate ([706680d](https://github.com/ionic-team/ionic-cli/commit/706680d))
* **pro:** default new apps to Ionic Pro ([6966135](https://github.com/ionic-team/ionic-cli/commit/6966135))
* IONIC_DAEMON_DIRECTORY environment variable ([ae1f7f1](https://github.com/ionic-team/ionic-cli/commit/ae1f7f1))
* **serve:** --auth feature for basic auth ([0b92c51](https://github.com/ionic-team/ionic-cli/commit/0b92c51))
* **ssl:** cafile, certfile, keyfile options ([b9cee01](https://github.com/ionic-team/ionic-cli/commit/b9cee01))




<a name="1.9.2"></a>
## [1.9.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.1...@ionic/cli-utils@1.9.2) (2017-08-17)


### Bug Fixes

* **cordova:** pass `--platform` and `--target` options to app-scripts ([5377f7e](https://github.com/ionic-team/ionic-cli/commit/5377f7e))
* **logs:** fix commands spamming lines of output ([af67074](https://github.com/ionic-team/ionic-cli/commit/af67074))
* **serve:** use localhost when external IP not required ([b36f5c2](https://github.com/ionic-team/ionic-cli/commit/b36f5c2))




<a name="1.9.1"></a>
## [1.9.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.9.0...@ionic/cli-utils@1.9.1) (2017-08-16)


### Bug Fixes

* **proxy:** fix continual prompting to install proxy plugin ([14c3613](https://github.com/ionic-team/ionic-cli/commit/14c3613))
* **resources:** detect resources/<platform> dirs upon platform add ([ea07da9](https://github.com/ionic-team/ionic-cli/commit/ea07da9))




<a name="1.9.0"></a>
# [1.9.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.8.1...@ionic/cli-utils@1.9.0) (2017-08-16)


### Bug Fixes

* **ionic1:** fix --browser option for v1 projects ([80ac51c](https://github.com/ionic-team/ionic-cli/commit/80ac51c))


### Features

* **docs:** add --browser/-w option to `ionic docs` ([ca74bdc](https://github.com/ionic-team/ionic-cli/commit/ca74bdc))




<a name="1.8.1"></a>
## [1.8.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.8.0...@ionic/cli-utils@1.8.1) (2017-08-15)


### Bug Fixes

* **cordova:** fix cordova serve issue with cordova.js mock ([f08f22b](https://github.com/ionic-team/ionic-cli/commit/f08f22b))




<a name="1.8.0"></a>
# [1.8.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.7.0...@ionic/cli-utils@1.8.0) (2017-08-14)


### Bug Fixes

* **cordova:** do not error on prepare with no platforms ([422c95f](https://github.com/ionic-team/ionic-cli/commit/422c95f))
* preserve whitespace in wrapped words ([6dc4cd2](https://github.com/ionic-team/ionic-cli/commit/6dc4cd2))
* **info:** add additional attempt to get ionic 1 version from bower.json ([d89ac09](https://github.com/ionic-team/ionic-cli/commit/d89ac09))
* **serve:** multitude of serve fixes ([d7fe31d](https://github.com/ionic-team/ionic-cli/commit/d7fe31d))
* **serve:** only show ip prompt if external ip is needed ([89853ca](https://github.com/ionic-team/ionic-cli/commit/89853ca))
* **ssh:** if key exists during generate, ask to overwrite ([59bc4fd](https://github.com/ionic-team/ionic-cli/commit/59bc4fd))


### Features

* **config:** --json and --force options for `config set` ([024ef43](https://github.com/ionic-team/ionic-cli/commit/024ef43))




<a name="1.7.0"></a>
# [1.7.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.6.0...@ionic/cli-utils@1.7.0) (2017-08-03)


### Bug Fixes

* **daemon:** fix occasional ENOENT error on windows ([1beb455](https://github.com/ionic-team/ionic-cli/commit/1beb455))
* **help:** "undefined" slipped in to some help output ([1f885fa](https://github.com/ionic-team/ionic-cli/commit/1f885fa))
* **plugins:** small fix for differing dist tags of plugins ([3adfcb6](https://github.com/ionic-team/ionic-cli/commit/3adfcb6))
* **serve:** allow binding of localhost ([e8a74d0](https://github.com/ionic-team/ionic-cli/commit/e8a74d0))
* **start:** disable yarn dedupe during start ([dd5c35f](https://github.com/ionic-team/ionic-cli/commit/dd5c35f))


### Features

* **build:** `ionic build` command ([3ad304c](https://github.com/ionic-team/ionic-cli/commit/3ad304c))




<a name="1.6.0"></a>
# [1.6.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.5.0...@ionic/cli-utils@1.6.0) (2017-07-27)


### Bug Fixes

* **timeouts:** rip out timeouts ([22dcd2f](https://github.com/ionic-team/ionic-cli/commit/22dcd2f))


### Features

* ionic pro ([36dc2f7](https://github.com/ionic-team/ionic-cli/commit/36dc2f7))




<a name="1.5.0"></a>
# [1.5.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.4.0...@ionic/cli-utils@1.5.0) (2017-07-11)


### Bug Fixes

* better icon support for windows ([47ea9ab](https://github.com/ionic-team/ionic-cli/commit/47ea9ab))
* **link:** disable interpretation of scientific notation ([3874ca6](https://github.com/ionic-team/ionic-cli/commit/3874ca6))
* **project:** warn users of ionic.project file ([965af07](https://github.com/ionic-team/ionic-cli/commit/965af07))
* **start:** substitute invalid package.json name for MyApp ([ce6c129](https://github.com/ionic-team/ionic-cli/commit/ce6c129))


### Features

* **cloud:** add options for snapshot metadata ([75099e6](https://github.com/ionic-team/ionic-cli/commit/75099e6))




<a name="1.4.0"></a>
# [1.4.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.3.0...@ionic/cli-utils@1.4.0) (2017-06-12)


### Bug Fixes

* **cordova:** actually show platform/type of missing resources ([4e154ed](https://github.com/ionic-team/ionic-cli/commit/4e154ed))
* **ionic1:** logger not logging changed files ([1b51529](https://github.com/ionic-team/ionic-cli/commit/1b51529))
* **plugins:** catch npm errors during updates and continue ([316826d](https://github.com/ionic-team/ionic-cli/commit/316826d))
* **serve:** running ionic serve in background ([883c21e](https://github.com/ionic-team/ionic-cli/commit/883c21e))


### Features

* **hooks:** call npm script hooks ([e34fc34](https://github.com/ionic-team/ionic-cli/commit/e34fc34))
* **plugins:** warn about multiple installed project plugins ([88789d8](https://github.com/ionic-team/ionic-cli/commit/88789d8))




<a name="1.3.0"></a>
# [1.3.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.2.0...@ionic/cli-utils@1.3.0) (2017-05-31)


### Bug Fixes

* **cordova:** more arg parsing fixes... ([4a75255](https://github.com/ionic-team/ionic-cli/commit/4a75255))
* **proxy:** use env load to ensure shared reference ([8552826](https://github.com/ionic-team/ionic-cli/commit/8552826))




<a name="1.2.0"></a>
# [1.2.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.2...@ionic/cli-utils@1.2.0) (2017-05-23)


### Bug Fixes

* **cli-plugin-ionic1:** use documentRoot and watchPatterns from ionic.config.json ([a878a95](https://github.com/ionic-team/ionic-cli/commit/a878a95))
* don't swallow subprocess stdout during --verbose ([d53d11a](https://github.com/ionic-team/ionic-cli/commit/d53d11a))
* **config:** Handle empty file ([fbcfc76](https://github.com/ionic-team/ionic-cli/commit/fbcfc76))
* **package:** dates not internationalized, use ISO ([0674bd9](https://github.com/ionic-team/ionic-cli/commit/0674bd9))


### Features

* **flags:** --no-interactive mode, with --confirm/--no-confirm ([1966a0c](https://github.com/ionic-team/ionic-cli/commit/1966a0c))
* **flags:** add --quiet flag ([6268f0c](https://github.com/ionic-team/ionic-cli/commit/6268f0c))
* **flags:** persistent "cli flags" ([72a9b45](https://github.com/ionic-team/ionic-cli/commit/72a9b45))
* **logging:** disable interval spinner for non-interactive mode ([9e4ed33](https://github.com/ionic-team/ionic-cli/commit/9e4ed33))
* **login:** automatic login via IONIC_EMAIL/IONIC_PASSWORD ([d8d26e4](https://github.com/ionic-team/ionic-cli/commit/d8d26e4))




<a name="1.1.2"></a>
## [1.1.2](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.1...@ionic/cli-utils@1.1.2) (2017-05-17)




<a name="1.1.1"></a>
## [1.1.1](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.1.0...@ionic/cli-utils@1.1.1) (2017-05-16)


### Bug Fixes

* **plugins:** messaging about globally installed plugins ([def3891](https://github.com/ionic-team/ionic-cli/commit/def3891))




<a name="1.1.0"></a>
# [1.1.0](https://github.com/ionic-team/ionic-cli/compare/@ionic/cli-utils@1.0.0...@ionic/cli-utils@1.1.0) (2017-05-16)


### Bug Fixes

* prevent TypeError runtime error ([1283f49](https://github.com/ionic-team/ionic-cli/commit/1283f49))
* **cordova:** give cordova options after -- separator (https://github.com/ionic-team/ionic-cli/issues/2254) ([256503e](https://github.com/ionic-team/ionic-cli/commit/256503e))
* **upload:** rip out progress library (fixes https://github.com/ionic-team/ionic-cli/issues/2257) ([1559049](https://github.com/ionic-team/ionic-cli/commit/1559049))


### Features

* **proxy:** global proxy plugin for start/login ([be89cb1](https://github.com/ionic-team/ionic-cli/commit/be89cb1))
