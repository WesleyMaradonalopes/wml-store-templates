const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const projectRoot = process.cwd();
const expoArgs = ['expo', 'run:android', ...process.argv.slice(2)];

function getShortWindowsPath(target) {
  if (process.platform !== 'win32') {
    return target;
  }

  try {
    return execFileSync('cmd.exe', ['/d', '/c', 'for %I in (.) do @echo %~sI'], {
      cwd: target,
      encoding: 'utf8',
    }).trim() || target;
  } catch {
    return target;
  }
}

function removeGeneratedNativeCaches() {
  const cachePaths = [
    path.join(projectRoot, 'android', 'build', 'generated', 'autolinking'),
    path.join(projectRoot, 'android', 'app', '.cxx'),
    path.join(projectRoot, 'node_modules', 'expo-modules-core', 'android', '.cxx'),
    path.join(projectRoot, 'node_modules', 'react-native-gesture-handler', 'android', '.cxx'),
    path.join(projectRoot, 'node_modules', 'react-native-reanimated', 'android', '.cxx'),
    path.join(projectRoot, 'node_modules', 'react-native-screens', 'android', '.cxx'),
    path.join(projectRoot, 'node_modules', 'react-native-worklets', 'android', '.cxx'),
  ];

  for (const cachePath of cachePaths) {
    fs.rmSync(cachePath, { recursive: true, force: true });
  }
}

if (process.platform !== 'win32') {
  const result = spawnSync('npx', expoArgs, { cwd: projectRoot, env: process.env, stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} else {
  removeGeneratedNativeCaches();
  const tempRoot = getShortWindowsPath(os.tmpdir());
  const alias = path.join(tempRoot, `wml-${process.pid}-${Date.now()}`);
  const nodeOptions = [process.env.NODE_OPTIONS, '--preserve-symlinks']
    .filter(Boolean)
    .join(' ');
  const pathHook = path.join(alias, 'scripts', 'preserve-ascii-paths.cjs');
  const childEnv = {
    ...process.env,
    NODE_OPTIONS: `${nodeOptions} --require=${pathHook}`,
    WML_STORE_NATIVE_PROJECT_ROOT: projectRoot,
    WML_STORE_NATIVE_ALIAS: alias,
  };

  try {
    fs.symlinkSync(projectRoot, alias, 'junction');
    const result = spawnSync('npx.cmd', expoArgs, {
      cwd: alias,
      env: childEnv,
      stdio: 'inherit',
      shell: true,
    });
    process.exitCode = result.status ?? 1;
  } finally {
    try {
      fs.unlinkSync(alias);
    } catch {
      // The temporary junction is best-effort cleanup only.
    }
  }
}
