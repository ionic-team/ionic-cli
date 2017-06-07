# @ionic/cli-plugin-gulp

This CLI plugin integrates with Ionic projects using gulp. If you have gulp
tasks named appropriately, they are run during certain CLI events.

## Gulp Tasks

* `ionic:watch:before`: Runs **before** the file watcher activates during a
  "watch" event. This event occurs during `ionic serve`, `ionic cordova run`,
  and `ionic cordova emulate`.
* `ionic:build:before`: Runs **before** the Ionic "build" event starts. This
  event occurs during `ionic upload`, `ionic package build`, and `ionic cordova
  build`.
* `ionic:build:after`: Runs **after** the Ionic "build" event starts. This
  event occurs during `ionic upload`, `ionic package build`, and `ionic cordova
  build`. For `ionic cordova build`, the event occurs after the Ionic build and
  before the Cordova build.

### Example

```javascript
gulp.task('ionic:build:after', function() {
  console.log('Build complete!');
});
```
