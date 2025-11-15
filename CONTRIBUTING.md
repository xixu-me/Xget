# 贡献指南

感谢您对 Xget 的关注！我们欢迎各种形式的贡献，包括但不限于代码、文档、测试、反馈和建议。

## 🤝 贡献方式

### 报告问题

- 使用 [Issue 模板](https://github.com/xixu-me/Xget/issues/new/choose)报告 bug 或提出功能请求
- 搜索现有 issues 避免重复报告
- 提供详细的重现步骤和环境信息

### 提交代码

- fork 存储库到您的 GitHub 账户
- 创建功能分支 (`git checkout -b feature/amazing-feature`)
- 提交更改 (`git commit -m 'Add some amazing feature'`)
- 推送到分支 (`git push origin feature/amazing-feature`)
- 创建 Pull Request

### 改进文档

- 修正文档中的错误或不准确信息
- 添加使用示例和最佳实践
- 翻译文档到其他语言
- 改进代码注释和 API 文档

## 🛠️ 开发环境设置

### 前置要求

- Node.js 18+
- npm 或 yarn
- Git
- Cloudflare 账户（用于测试部署）

### 本地开发

```bash
# 克隆存储库
git clone https://github.com/xixu-me/Xget.git
cd Xget

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm test

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 📝 代码规范

### 代码风格

- 使用 2 个空格缩进
- 使用分号结尾
- 使用单引号字符串
- 遵循 ESLint 配置规则

### 命名约定

- 变量和函数使用 camelCase
- 常量使用 UPPER_SNAKE_CASE
- 类名使用 PascalCase
- 文件名使用 kebab-case

### 注释规范

```javascript
/**
 * 函数描述
 * @param {string} param1 - 参数1描述
 * @param {Object} param2 - 参数2描述
 * @returns {Promise<Response>} 返回值描述
 */
function exampleFunction(param1, param2) {
  // 实现逻辑
}
```

## 🧪 测试

### 测试类型

- **单元测试**: 测试单个函数和模块
- **集成测试**: 测试组件间的交互
- **端到端测试**: 测试完整的用户场景

### 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- --grep "platform"

# 生成测试覆盖率报告
npm run test:coverage
```

### 编写测试

- 为新功能编写相应的测试
- 确保测试覆盖率不低于 80%
- 使用描述性的测试名称
- 测试边界情况和错误处理

## 🚀 提交规范

### Commit 消息格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### 类型说明

- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

### 示例

```bash
feat(platforms): add support for Bitbucket
fix(cache): resolve cache invalidation issue
docs(readme): update installation instructions
perf(proxy): optimize request handling performance
```

## 🔍 Pull Request 流程

### 提交前检查

- [ ] 代码通过所有测试
- [ ] 代码符合存储库规范
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] Commit 消息符合规范

### PR 描述模板

请使用 [PR 模板](.github/pull_request_template.md)填写详细信息。

### 代码审查

- 所有 PR 需要至少一个维护者的审查
- 解决审查中提出的问题
- 保持 PR 的焦点明确，避免混合多个不相关的更改

## 🌟 贡献认可

### 贡献者列表

我们会在 README.md 中维护贡献者列表，感谢每一位贡献者的付出。

### 贡献统计

- 代码贡献会在 GitHub 贡献图中显示
- 重要贡献会在 Release Notes 中特别提及
- 长期贡献者可能被邀请成为存储库维护者

## 📋 开发任务

### 当前优先级

1. **性能优化**: 提升缓存效率和响应速度
2. **平台支持**: 添加新的代码托管和包管理平台
3. **安全增强**: 加强请求验证和安全防护
4. **监控改进**: 完善性能监控和错误追踪

### 适合新手的任务

查找标有 `good first issue` 标签的 issues，这些通常是：

- 文档改进
- 简单的 bug 修复
- 代码格式化
- 测试用例添加

## 🤔 获取帮助

### 沟通渠道

- **GitHub Issues**: 报告问题和功能请求
- **Email**: 敏感问题可发送至维护者邮箱

### 常见问题

**Q: 如何添加新平台支持？**
A: 编辑 `src/config/platforms.js` 文件，添加平台配置，然后更新相关文档和测试。

**Q: 如何测试 Cloudflare Workers 功能？**
A: 使用 `npm run dev` 启动本地开发服务器，或部署到 Cloudflare Workers 测试环境。

**Q: 如何处理跨域问题？**
A: 检查 CORS 配置，确保允许的源和方法设置正确。

## 📄 许可证

通过贡献代码，您同意您的贡献将在与存储库相同的 [GPL-3.0 许可证](LICENSE) 下发布。

## 🙏 致谢

感谢所有为 Xget 做出贡献的开发者、测试者和用户。您的支持和反馈是存储库持续改进的动力！

---

如果您有任何问题或建议，请随时通过 GitHub Issues 与我们联系。我们期待您的参与！
