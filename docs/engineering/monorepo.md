# Monorepo 与 pnpm

> 如果你的项目用了 Monorepo（比如一个仓库里放了多个 package），这章的内容会直接帮你应对面试。即使没用过，理解这些概念也是现代前端工程师的必备知识。

---

## 一、先搞清楚：什么是 Monorepo

### 1.1 两种代码仓库管理方式

**Multirepo（多仓库）**：每个项目/包独立一个 Git 仓库

```
github.com/company/web-app        ← 前端应用
github.com/company/mobile-app     ← 移动端应用
github.com/company/ui-components  ← 组件库
github.com/company/utils          ← 工具函数库
github.com/company/api-types      ← 接口类型定义
```

**Monorepo（单仓库）**：所有相关项目放在同一个 Git 仓库里，用目录结构区分

```
github.com/company/my-project/
├── packages/
│   ├── web-app/        ← 前端应用
│   ├── mobile-app/     ← 移动端应用
│   ├── ui-components/  ← 组件库
│   ├── utils/          ← 工具函数库
│   └── api-types/      ← 接口类型定义
├── pnpm-workspace.yaml
└── package.json
```

### 1.2 Multirepo 的痛点（为什么需要 Monorepo）

假设你有一个组件库 `ui-components` 和一个应用 `web-app`，两者分别在不同仓库：

```
场景：你修改了 ui-components 里的 Button 组件

多仓库流程：
1. 修改 Button（在 ui-components 仓库）
2. 发布新版本到 npm（0.1.0 → 0.1.1）
3. 切换到 web-app 仓库
4. 更新依赖：npm install ui-components@0.1.1
5. 测试是否 work

这个流程至少 5 步，还有版本管理的心智负担
```

Multirepo 的主要问题：
- **代码复用麻烦**：跨仓库修改需要发包、更新版本
- **类型/接口不同步**：`api-types` 更新了，各个仓库要手动跟进
- **重复依赖**：每个仓库各自装自己的 React、TypeScript，磁盘占用大
- **CI/CD 复杂**：多个仓库需要多套流水线
- **难以统一规范**：ESLint、Prettier 配置在各仓库各自维护

### 1.3 Monorepo 的优势

```
Monorepo 流程：
1. 修改 packages/ui-components/Button.tsx
2. packages/web-app 直接引用的就是本地代码
   → 改完立即生效，无需发包

更多好处：
✅ 代码跨包修改：一次提交可以同时修改多个包
✅ 统一的依赖管理：所有包共享 node_modules
✅ 共享 TypeScript 类型：api-types 改了，其他包立刻感知
✅ 统一的工具链配置：一套 ESLint/Prettier/CI 规则
✅ 原子提交：一个 commit 可以包含跨包的相关改动
```

### 1.4 Monorepo 的挑战

- **仓库体积增大**：所有项目的历史都在一起
- **构建速度**：修改一个包时需要判断哪些包受影响，需要构建工具支持（Turborepo/Nx）
- **权限管理**：不同团队可能需要不同的代码访问权限

---

## 二、pnpm：Monorepo 的最佳拍档

### 2.1 pnpm 是什么

pnpm（performant npm）是一个**快速、节省磁盘空间**的包管理器。它可以替代 npm 和 yarn。

### 2.2 传统 npm/yarn 的问题

**问题一：重复安装**

```
projects/
├── app-a/
│   └── node_modules/
│       ├── react/     ← 安装了一次 react
│       └── lodash/
├── app-b/
│   └── node_modules/
│       ├── react/     ← 又安装了一次 react（完全一样的代码）
│       └── lodash/
```

100 个项目就有 100 份 react，浪费大量磁盘。

**问题二：幽灵依赖（Ghost Dependencies）**

npm v3+ 和 yarn 把所有依赖"扁平化"到 `node_modules` 根目录：

```
node_modules/
├── your-package/
├── lodash/          ← lodash 是 your-package 的依赖，不是你直接安装的
└── react/
```

结果：你可以在代码里直接 `import lodash`，即使你没有在 `package.json` 里声明依赖。

这是一个潜在的 bug：
- 某天 `your-package` 升级，不再依赖 `lodash` 了
- `lodash` 从 `node_modules` 消失
- 你的代码报错：`Cannot find module 'lodash'`

### 2.3 pnpm 的解决方案：硬链接 + 符号链接

pnpm 有一个**全局存储（store）**，通常在 `~/.pnpm-store/`。所有安装过的包都会存在这里，只存一份。

**硬链接（Hard Link）**：

```
~/.pnpm-store/
└── react@18.2.0/    ← react 的真实文件只存这里一份

项目 A 的 node_modules/
└── .pnpm/react@18.2.0/  ← 通过硬链接指向 store，不占额外空间

项目 B 的 node_modules/
└── .pnpm/react@18.2.0/  ← 同样通过硬链接，和项目 A 共享同一份文件
```

> 硬链接：两个"路径"指向磁盘上同一块数据，删一个不影响另一个，也不额外占用空间。

**符号链接（Symbolic Link）**：

pnpm 用符号链接（类似"快捷方式"）把你真正安装的包链接到 `node_modules` 根目录，而传递性依赖（你没有声明的）不会出现在根目录。

```
项目的 node_modules/
├── react -> .pnpm/react@18.2.0/node_modules/react    ← 符号链接，你声明了的
└── .pnpm/                                              ← 真实文件在这里
    ├── react@18.2.0/
    │   └── node_modules/
    │       ├── react/          ← react 的真实代码（硬链接到 store）
    │       └── loose-envify/   ← react 的依赖（不出现在根目录）
    └── lodash@4.17.21/
```

**效果**：
- `node_modules` 根目录只有你在 `package.json` 里声明的包 → 解决幽灵依赖
- 所有项目共享 store 里的文件 → 解决重复安装，节省磁盘
- 安装速度快 → 大多数情况只需创建硬链接，不需要复制文件

### 2.4 pnpm 常用命令

```bash
# 安装所有依赖
pnpm install

# 安装一个包
pnpm add react
pnpm add -D typescript          # 安装开发依赖
pnpm add -g pnpm                # 全局安装

# 删除包
pnpm remove lodash

# 运行脚本
pnpm run build
pnpm build                      # run 可以省略

# 执行命令（不需要全局安装）
pnpm dlx create-react-app my-app  # 相当于 npx

# 查看全局 store
pnpm store status
pnpm store prune                # 清理不再使用的包
```

---

## 三、pnpm Workspace：Monorepo 实战

### 3.1 基本配置

在项目根目录创建 `pnpm-workspace.yaml`，声明哪些目录是 workspace 的 package：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'        # packages 目录下所有子目录
  - 'apps/*'            # apps 目录下所有子目录
  - '!**/test/**'       # 排除 test 目录
```

**典型目录结构**：

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json              ← 根 package.json（工作区根）
├── packages/
│   ├── ui/
│   │   ├── package.json      ← 组件库，name: "@myapp/ui"
│   │   └── src/
│   ├── utils/
│   │   ├── package.json      ← 工具函数，name: "@myapp/utils"
│   │   └── src/
│   └── config/
│       ├── package.json      ← 共享配置，name: "@myapp/config"
│       └── tsconfig.json
└── apps/
    ├── web/
    │   ├── package.json      ← 前端应用，name: "@myapp/web"
    │   └── src/
    └── admin/
        ├── package.json      ← 管理后台，name: "@myapp/admin"
        └── src/
```

### 3.2 包之间的引用

在 `apps/web/package.json` 里声明对本地包的依赖：

```json
{
  "name": "@myapp/web",
  "dependencies": {
    "@myapp/ui": "workspace:*",      // workspace:* 表示引用工作区内的最新版本
    "@myapp/utils": "workspace:^",   // workspace:^ 类似 ^ 语义但限定在工作区内
    "react": "^18.0.0"
  }
}
```

pnpm 会自动把 `@myapp/ui` 符号链接到 `apps/web/node_modules/@myapp/ui`，指向本地的 `packages/ui`。

```
apps/web/node_modules/
└── @myapp/
    ├── ui -> ../../../packages/ui        ← 符号链接到本地包！
    └── utils -> ../../../packages/utils   ← 修改 packages/utils 立即生效
```

### 3.3 在特定包里执行命令

```bash
# 在 packages/ui 里执行 build
pnpm --filter @myapp/ui run build

# 在 apps/web 里执行 dev
pnpm --filter @myapp/web run dev

# 对所有包执行 lint
pnpm --filter '*' run lint

# 对 web 及其所有依赖的本地包都执行 build（拓扑排序）
pnpm --filter @myapp/web... run build
```

### 3.4 在根目录安装共享依赖

```bash
# -w 表示安装到根 workspace（所有包共用）
pnpm add -Dw typescript eslint prettier

# 只给某个包安装
pnpm add react --filter @myapp/web
```

### 3.5 根 package.json 的作用

```json
{
  "name": "my-monorepo",
  "private": true,          // 防止根目录被发布到 npm
  "scripts": {
    "build": "pnpm --filter './packages/*' run build",
    "build:apps": "pnpm --filter './apps/*' run build",
    "dev": "pnpm --filter @myapp/web run dev",
    "lint": "pnpm -r run lint",    // -r = recursive，对所有包执行
    "test": "pnpm -r run test"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "^8.0.0"
  }
}
```

---

## 四、Turborepo：给 Monorepo 加速

### 4.1 Monorepo 构建面临的问题

当你有 10 个包，每次修改都 `pnpm -r run build` 把所有包都重新构建，效率很低。

问题：
- `@myapp/utils` 没改，为什么要重新 build？
- 多个包的 build 可以并行，为什么要串行等待？

### 4.2 Turborepo 是什么

Turborepo（Vercel 出品）是专门为 Monorepo 设计的**任务编排和缓存工具**。

核心能力：
1. **任务缓存**：如果包的代码没变，直接用上次的构建结果，不重新构建
2. **并行执行**：分析包的依赖关系，没有依赖的包并行构建
3. **远程缓存**：把构建缓存上传到云端，团队成员和 CI 共享缓存

### 4.3 基本配置

```json
// turbo.json（根目录）
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],   // 先执行依赖包的 build，再执行自己的 build
      "outputs": ["dist/**"]      // 哪些文件是构建产物（用于缓存）
    },
    "dev": {
      "cache": false,            // dev 任务不缓存
      "persistent": true         // 持续运行（watch 模式）
    },
    "lint": {
      "dependsOn": []            // lint 不依赖其他任务，可以并行
    }
  }
}
```

```bash
# 用 turbo 运行，自动处理依赖顺序、并行、缓存
turbo build
turbo dev
```

**效果**：

```
第一次构建：
  @myapp/utils build  ✓ 3.2s
  @myapp/ui build     ✓ 5.1s（依赖 utils，等 utils 完成）
  @myapp/web build    ✓ 8.4s（依赖 ui，等 ui 完成）

第二次构建（只改了 web）：
  @myapp/utils build  ✓ 0.1s（缓存命中！）
  @myapp/ui build     ✓ 0.1s（缓存命中！）
  @myapp/web build    ✓ 8.4s（代码改了，重新构建）
```

### 4.4 Nx 简介

Nx（Nrwl 出品）是另一个流行的 Monorepo 管理工具，功能比 Turborepo 更全面，包含：
- 代码生成器（生成新的包/组件/服务）
- 依赖图可视化
- 受影响分析（只运行被改动代码影响的测试）
- 插件生态（React、Next.js、Angular、NestJS……）

Turborepo 更轻量，适合已有项目接入；Nx 功能更强，适合从零开始的大型项目。

---

## 五、工程化实践总结

### 典型的现代 Monorepo 技术栈

```
代码管理：  Git（单仓库）
包管理：    pnpm + workspace
任务编排：  Turborepo 或 Nx
构建工具：  Vite（应用）+ Rollup/tsup（库）
类型检查：  TypeScript（根目录统一配置）
代码规范：  ESLint + Prettier（根目录统一配置）
CI/CD：    GitHub Actions（利用 Turborepo 远程缓存加速）
```

### 什么时候选 Monorepo？

✅ **适合 Monorepo**：
- 多个前端应用共享组件库、工具函数、API 类型
- 前后端在同一团队（全栈项目）
- 需要频繁跨包修改的场景

❌ **不适合 Monorepo**：
- 项目完全独立，没有代码共享需求
- 团队规模很小，一个应用就够了
- 不同项目有不同技术栈且完全独立

---

## 面试官怎么问

### Q1：什么是 Monorepo？和 Multirepo 相比有什么优缺点？

**参考回答：**

Monorepo 是把多个相关项目/包放在同一个 Git 仓库里管理的方式，与之对应的是 Multirepo（每个项目独立仓库）。

Monorepo 的优点：代码跨包共享和修改方便，无需发包；统一管理工具链配置；原子提交可以覆盖多个包；依赖可以复用。

缺点：仓库体积大；构建需要额外工具（Turborepo/Nx）做增量和并行；权限管理粒度较粗。

---

### Q2：pnpm 相比 npm/yarn 有什么优势？

**参考回答：**

两个核心优势：

1. **节省磁盘空间**：pnpm 有全局 store，同一个包只存一份，项目里通过硬链接引用，不同项目共享同一份文件，不重复占用磁盘。

2. **解决幽灵依赖**：npm/yarn 扁平化 node_modules 导致可以直接使用未声明的依赖（幽灵依赖），引入隐患。pnpm 的 node_modules 只有你在 package.json 中声明的包，其余传递依赖不出现在根目录，访问未声明的包会报错，更安全。

此外 pnpm 安装速度也更快，因为硬链接不需要复制文件。

---

### Q3：pnpm workspace 是怎么用的？包之间如何相互引用？

**参考回答：**

在根目录创建 `pnpm-workspace.yaml`，声明哪些目录是 workspace 的包。然后在需要引用本地包的地方，在 `package.json` 的 `dependencies` 里用 `workspace:*` 声明依赖。

pnpm 会自动创建符号链接，把本地包链接到引用方的 `node_modules` 里，修改本地包的代码会立即在引用方生效，不需要发包、不需要重新安装。

---

### Q4：pnpm 是怎么解决幽灵依赖问题的？

**参考回答：**

npm/yarn 会把所有依赖（包括传递依赖）扁平化放到 node_modules 根目录，导致你可以直接使用没有声明在 package.json 里的包，这就是幽灵依赖。

pnpm 通过符号链接 + 嵌套结构解决这个问题：根 node_modules 只有你直接声明的包的符号链接，传递依赖被放在 `.pnpm/` 目录的嵌套结构里，不会出现在根目录。如果你尝试引用没有声明的包，Node.js 找不到，就会直接报错，强制你显式声明依赖。

---

### Q5：项目用了 Monorepo，遇到过什么问题？怎么解决的？（经验类）

**参考回答思路（根据你的实际项目调整）：**

可以从以下角度展开：
- 包之间的循环依赖：如何检测和打破循环
- 构建顺序的问题：用 Turborepo 的 `dependsOn` 配置保证构建顺序
- 某个包修改后需要发现哪些包受影响：`pnpm --filter '...@myapp/utils'` 查找依赖链
- TypeScript 项目引用（`references`）配置，保证类型检查的正确性
- 版本管理：用 Changesets 管理各包的版本号和 changelog
