#!/bin/bash

# 批量部署所有云函数的脚本
# 使用方法：在微信开发者工具中，右键每个云函数文件夹 -> 上传并部署：云端安装依赖

echo "========================================="
echo "云函数部署指南"
echo "========================================="
echo ""
echo "由于微信小程序云函数需要通过开发者工具部署，"
echo "请按照以下步骤操作："
echo ""
echo "方法一：使用微信开发者工具（推荐）"
echo "----------------------------------------"
echo "1. 打开微信开发者工具"
echo "2. 在左侧的 'cloudfunctions' 目录下，找到每个云函数文件夹"
echo "3. 对每个云函数文件夹右键："
echo "   - 选择 '上传并部署：云端安装依赖'"
echo "   - 或者选择 '上传并部署：所有文件'"
echo ""
echo "需要部署的云函数列表："
echo "----------------------------------------"

# 列出所有有 package.json 的云函数
find cloudfunctions -maxdepth 1 -type d ! -name "cloudfunctions" | while read dir; do
    if [ -f "$dir/package.json" ]; then
        echo "  ✓ $(basename "$dir")"
    elif [ -f "$dir/index.js" ]; then
        echo "  ✓ $(basename "$dir") (无 package.json)"
    fi
done

echo ""
echo "方法二：使用命令行工具（需要安装微信开发者工具CLI）"
echo "----------------------------------------"
echo "如果已安装微信开发者工具CLI，可以使用以下命令："
echo ""
echo "cd cloudfunctions"
echo "for dir in */; do"
echo "  if [ -f \"\${dir}package.json\" ] || [ -f \"\${dir}index.js\" ]; then"
echo "    echo \"部署: \${dir%/}\""
echo "    cli cloud functions deploy \${dir%/} --env cloudbase-4gn1heip7c38ec6c"
echo "  fi"
echo "done"
echo ""
echo "========================================="
