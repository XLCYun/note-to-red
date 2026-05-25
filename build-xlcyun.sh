#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TARGET_DIR="$HOME/Documents/obsidian-docs/.obsidian/plugins/note-to-red"
TMP_DIR="${TARGET_DIR}.tmp"

cd "$SCRIPT_DIR"

if command -v npm >/dev/null 2>&1; then
    BUILD_CMD=(npm run build)
elif command -v pnpm >/dev/null 2>&1; then
    BUILD_CMD=(pnpm build)
else
    echo "未找到 npm 或 pnpm，无法执行构建"
    exit 1
fi

echo "开始构建插件..."
"${BUILD_CMD[@]}"

for file in main.js styles.css manifest.json; do
    if [ ! -f "$file" ]; then
        echo "缺少构建产物: $file"
        exit 1
    fi
done

mkdir -p "$(dirname "$TARGET_DIR")"
rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"

cp main.js styles.css manifest.json "$TMP_DIR/"

if [ -d assets ]; then
    cp -R assets "$TMP_DIR/"
fi

rm -rf "$TARGET_DIR"
mv "$TMP_DIR" "$TARGET_DIR"

echo "已更新插件目录: $TARGET_DIR"
