# @ionic/cli-plugin-gulp

This CLI plugin integrates with Ionic projects using gulp. If you have gulp
tasks named appropriately, they are run during certain CLI events.

## Gulp Tasks

| gulp task            | description                                                       | commands                                                     |
|----------------------|-------------------------------------------------------------------|--------------------------------------------------------------|
| `ionic:watch:before` | Runs **before** the file watcher activates during a "watch" event | `ionic serve`, `ionic cordova run`, `ionic cordova emulate`  |
| `ionic:build:before` | Runs **before** the Ionic "build" event starts.                   | `ionic upload`, `ionic package build`, `ionic cordova build` |
| `ionic:build:after`  | Runs **after** the Ionic "build" event finishes.                  | `ionic upload`, `ionic package build`, `ionic cordova build` |

### Example

```javascript
gulp.task('ionic:build:after', function() {
  console.log('Build complete!');
});
```
