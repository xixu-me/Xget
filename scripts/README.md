# 脚本

此目录包含存储库的维护与开发工具。

## 可用脚本

### fix-badge-colors.js

用于 README 文件的徽章颜色校验与自动修复工具。

**用途：** 确保 README.md 与 README.en.md 中的所有徽章颜色与 Simple Icons 官方品牌颜色一致。

**用法：**

```bash
# 校验徽章颜色（只读）
node scripts/fix-badge-colors.js

# 校验并自动修复不匹配项
node scripts/fix-badge-colors.js --fix
```

**功能：**

- 从 Simple Icons 官方仓库获取最新颜色
- 扫描 README.md 与 README.en.md
- 识别颜色不匹配项
- 在提供 `--fix` 标志时自动修复不匹配项
- 生成包含修复前后颜色值的详细报告

**适用场景：**

- 在提交新增/修改徽章的 PR 之前
- 例行维护以确保品牌一致性
- Simple Icons 更新品牌颜色后

---

有关存储库的更多信息，请参阅主 [README](../README.md)。
