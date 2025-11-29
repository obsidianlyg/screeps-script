# Screeps 实验室反应系统

这个实验室系统为你的 Screeps 帝国提供了完整的实验室反应管理功能，包括自动化反应任务管理、资源搬运和实验室操作员。

## 主要组件

### 1. LabManager (`src/utils/LabManager.ts`)
核心实验室管理器，负责：
- 反应任务管理和调度
- 实验室状态监控
- 资源状态检查
- 反应配方管理

### 2. LabOperator (`src/roles/labOperator.ts`)
实验室操作员角色，负责：
- 从存储提取反应物到实验室
- 清理实验室中的多余资源
- 智能资源搬运和分配

### 3. LabReactionExample (`src/examples/LabReactionExample.ts`)
使用示例和快捷函数，包含：
- 完整的实验室工作流程
- 任务创建和管理示例
- 资源需求分析

## 快速开始

### 1. 基础初始化

```typescript
import { setupLabSystem } from 'examples/LabReactionExample';

// 一次性设置完整的实验室系统
setupLabSystem('W8N8', 'Spawn1');
```

### 2. 手动初始化和任务创建

```typescript
import LabManager from 'utils/LabManager';
import labOperator from 'roles/labOperator';

// 初始化内存
LabManager.initializeMemory('W8N8');

// 创建基础反应任务
LabManager.createBasicReactions('W8N8');

// 创建实验室操作员
labOperator.create('Spawn1', 'W8N8', 2);

// 处理反应任务
LabManager.processReactionTasks('W8N8');
```

### 3. 创建特定的反应任务

```typescript
// 创建基础矿物
LabManager.addReactionTask('W8N8', RESOURCE_HYDROGEN, 1000, 2);
LabManager.addReactionTask('W8N8', RESOURCE_OXYGEN, 1000, 2);

// 创建高级化合物
LabManager.addReactionTask('W8N8', RESOURCE_UTRIUM_LEMERGITE, 200, 3);

// 创建Power反应
LabManager.addReactionTask('W8N8', RESOURCE_POWER, 100, 10);
```

## 系统特性

### 1. 自动任务管理
- 任务优先级排序
- 状态跟踪（pending → running → completed）
- 实验室自动分配
- 资源可用性检查

### 2. 智能实验室分配
- 自动找到合适的反应物实验室
- 检查实验室冷却时间
- 确保反应物类型匹配
- 优化实验室使用效率

### 3. 资源管理
- 从存储和终端自动提取资源
- 智能资源分配
- 实验室清理功能
- 资源需求分析

### 4. 错误处理
- 实验室不足检测
- 资源缺失警告
- 任务失败处理
- 过期任务清理

## 支持的反应配方

### 基础反应物（能量 + 基础矿物）
- `HYDROGEN` = ENERGY + ZYNTHIUM
- `OXYGEN` = ENERGY + OXIDANT
- `UTRIUM` = ENERGY + LEMERGIUM
- `LEMERGIUM` = ENERGY + KEANIUM
- `KEANIUM` = ENERGY + ZYNTHIUM
- `ZYNTHIUM` = ENERGY + CATALYST
- `CATALYST` = ENERGY + HYDROGEN
- `GHODIUM` = ENERGY + UTRIUM

### 中间反应物（基础矿物 + 基础矿物）
- `OXIDANT` = OXYGEN + HYDROGEN
- `UTRIUM_LEMERGITE` = UTRIUM + LEMERGIUM
- `UTRIUM_HYDRIDE` = UTRIUM + HYDROGEN
- `UTRIUM_OXIDE` = UTRIUM + OXYGEN
- `KEANIUM_HYDRIDE` = KEANIUM + HYDROGEN
- `KEANIUM_OXIDE` = KEANIUM + OXYGEN
- `LEMERGIUM_HYDRIDE` = LEMERGIUM + HYDROGEN
- `LEMERGIUM_OXIDE` = LEMERGIUM + OXYGEN
- `ZYNTHIUM_HYDRIDE` = ZYNTHIUM + HYDROGEN
- `ZYNTHIUM_OXIDE` = ZYNTHIUM + OXYGEN
- `GHODIUM_HYDRIDE` = GHODIUM + HYDROGEN
- `GHODIUM_OXIDE` = GHODIUM + OXYGEN
- `GHODIUM_LEMERGITE` = GHODIUM + LEMERGIUM
- `GHODIUM_UTRIUM` = GHODIUM + UTRIUM
- `GHODIUM_KEANIUM` = GHODIUM + KEANIUM
- `GHODIUM_ZYNTHIUM` = GHODIUM + ZYNTHIUM
- `POWER` = POWER + ENERGY

## 主循环集成

系统已集成到主循环中：

```typescript
// 在 main.ts 中
export const loop = () => {
    // ... 其他代码 ...

    // 实验室系统处理（每个tick）
    runLabSystem(mainRoom);

    // 实验室操作员会自动运行
    if (creep.memory.role == 'labOperator') {
        labOperator.run(creep);
    }
};
```

## 常用操作

### 检查实验室状态
```typescript
const labStates = LabManager.getLabStates('W8N8');
console.log('实验室状态:', labStates);
```

### 查看资源状态
```typescript
const resources = LabManager.getResourceStatus('W8N8');
console.log('房间资源:', resources);
```

### 查看任务状态
```typescript
import { LabReactionExample } from 'examples/LabReactionExample';
LabReactionExample.showTaskStatus('W8N8');
```

### 检查资源需求
```typescript
import { LabReactionExample } from 'examples/LabReactionExample';
LabReactionExample.checkResourceNeeds('W8N8');
```

### 紧急清理
```typescript
import { LabReactionExample } from 'examples/LabReactionExample';
LabReactionExample.emergencyCleanup('W8N8');
```

### 取消特定任务
```typescript
LabManager.cancelTask('W8N8', 'task_id');
```

## 配置建议

### 1. 实验室布局
- 至少需要3个实验室（2个反应物 + 1个产物）
- 推荐6-10个实验室用于高级反应
- 实验室应该紧邻存储和终端

### 2. 实验室操作员配置
- 基础反应：1-2个操作员
- 高级反应：2-3个操作员
- 身体配置：WORK + CARRY + MOVE

### 3. 存储要求
- 确保有足够的存储容量
- 反应物应存储在存储或终端中
- 定期清理实验室产物

## 性能优化

1. **任务缓存**：系统自动缓存任务状态，减少重复计算
2. **实验室分配优化**：智能匹配实验室和反应物
3. **资源搬运优化**：按需提取，避免浪费
4. **任务优先级**：重要任务优先执行

## 故障排除

### 常见问题

1. **实验室数量不足**
   - 确保房间至少有3个实验室
   - 检查实验室是否已建造和控制

2. **反应物缺失**
   - 使用 `checkResourceNeeds()` 检查资源缺口
   - 确保反应物在存储或终端中

3. **任务不执行**
   - 检查实验室冷却时间
   - 确认反应物类型匹配
   - 查看任务状态是否为 "running"

4. **操作员不工作**
   - 确保操作员已创建
   - 检查操作员是否有合适的身体配置
   - 确认有可执行的活跃任务

### 调试技巧

```typescript
// 启用详细日志
console.log('实验室状态:', LabManager.getLabStates('W8N8'));
console.log('任务列表:', LabManager.getReactionTasks('W8N8'));
console.log('资源状态:', LabManager.getResourceStatus('W8N8'));
```

## 扩展功能

系统设计为可扩展的，你可以：
- 添加自定义反应配方
- 实现更复杂的资源调度算法
- 集成市场交易功能
- 添加跨房间实验室协调

这个实验室系统为你提供了强大的自动化反应管理功能，可以大大简化你的 Screeps 资源管理工作！