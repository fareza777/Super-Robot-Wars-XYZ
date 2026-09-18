#!/usr/bin/env bash
# Dev box setup for SRW XYZ: Node.js + Android SDK + Gradle maven mirror.
# repo.maven.apache.org returns 403 from this environment, so all Gradle
# builds route through Google's GCS mirror via ~/.gradle/init.gradle.
set -euo pipefail

NODE_VER=v22.14.0
SDK_DIR="$HOME/android-sdk"
CMDTOOLS_VER=11076708

export PATH="$HOME/node/bin:$PATH"

if [ ! -x "$HOME/node/bin/node" ]; then
  curl -fsSL "https://nodejs.org/dist/${NODE_VER}/node-${NODE_VER}-linux-x64.tar.xz" -o /tmp/node.tar.xz
  mkdir -p "$HOME/node"
  tar -xJf /tmp/node.tar.xz -C "$HOME/node" --strip-components=1
fi

if [ ! -x "$SDK_DIR/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK_DIR/cmdline-tools"
  curl -fsSL "https://dl.google.com/android/repository/commandlinetools-linux-${CMDTOOLS_VER}_latest.zip" -o /tmp/cmdtools.zip
  unzip -qo /tmp/cmdtools.zip -d "$SDK_DIR/cmdline-tools"
  mv "$SDK_DIR/cmdline-tools/cmdline-tools" "$SDK_DIR/cmdline-tools/latest"
fi

export ANDROID_HOME="$SDK_DIR" ANDROID_SDK_ROOT="$SDK_DIR"
export PATH="$SDK_DIR/cmdline-tools/latest/bin:$SDK_DIR/platform-tools:$PATH"

yes | sdkmanager --licenses >/dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" >/dev/null

mkdir -p "$HOME/.gradle"
cat > "$HOME/.gradle/init.gradle" <<'EOF'
def MIRROR = 'https://maven-central.storage-download.googleapis.com/maven2/'
def addMirror
addMirror = { repos ->
    if (repos == null) return
    try {
        if (repos.findByName('centralGcsMirror') == null) {
            def repo = repos.maven { url = MIRROR; name = 'centralGcsMirror' }
            repos.remove(repo)
            repos.add(0, repo)
        }
    } catch (Throwable t) {
        println("mirror inject failed: ${t.message}")
    }
}
gradle.beforeSettings { settings ->
    try { addMirror(settings.pluginManagement.repositories) } catch (Throwable t) { println("pluginManagement: ${t.message}") }
    try { addMirror(settings.dependencyResolutionManagement.repositories) } catch (Throwable t) { println("drm: ${t.message}") }
}
allprojects {
    addMirror(buildscript.repositories)
    addMirror(repositories)
}
EOF

npm install
