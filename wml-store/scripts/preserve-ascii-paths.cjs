const fs = require('node:fs');
const path = require('node:path');

const projectRoot = process.env.WML_STORE_NATIVE_PROJECT_ROOT;
const asciiRoot = process.env.WML_STORE_NATIVE_ALIAS;

if (projectRoot && asciiRoot) {
  const normalizedProjectRoot = path.resolve(projectRoot);
  const normalizedAsciiRoot = path.resolve(asciiRoot);

  const mapPath = (value) => {
    if (typeof value !== 'string') {
      return value;
    }

    const relativePath = path.relative(normalizedProjectRoot, value);
    const isInsideProject =
      relativePath === '' ||
      (!relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath));

    return isInsideProject ? path.join(normalizedAsciiRoot, relativePath) : value;
  };

  const wrapSyncRealpath = (realpath) => function wrappedRealpath(...args) {
    return mapPath(realpath.apply(this, args));
  };

  const wrapAsyncRealpath = (realpath) => function wrappedRealpath(input, options, callback) {
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }

    return realpath.call(this, input, options, (error, resolvedPath) => {
      callback(error, error ? resolvedPath : mapPath(resolvedPath));
    });
  };

  const originalRealpathSync = fs.realpathSync;
  fs.realpathSync = wrapSyncRealpath(originalRealpathSync);
  if (fs.realpathSync.native) {
    fs.realpathSync.native = wrapSyncRealpath(fs.realpathSync.native);
  }

  const originalRealpath = fs.realpath;
  fs.realpath = wrapAsyncRealpath(originalRealpath);

  const originalPromiseRealpath = fs.promises.realpath.bind(fs.promises);
  fs.promises.realpath = async (input, options) => {
    return mapPath(await originalPromiseRealpath(input, options));
  };
}
