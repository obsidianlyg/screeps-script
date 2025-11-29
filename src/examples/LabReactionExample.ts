import LabManager from '../utils/LabManager';
import labOperator from '../roles/labOperator';

// 实验室反应示例
export class LabReactionExample {
    // 初始化实验室系统
    static initializeLabSystem(roomName: string): void {
        console.log(`初始化房间 ${roomName} 的实验室系统`);

        // 初始化内存
        LabManager.initializeMemory(roomName);

        // 检查实验室数量
        const labs = LabManager.getLabs(roomName);
        console.log(`房间 ${roomName} 有 ${labs.length} 个实验室`);

        if (labs.length < 3) {
            console.log(`警告: 房间 ${roomName} 实验室数量不足，需要至少3个实验室才能进行反应`);
            return;
        }

        // 显示实验室状态
        const labStates = LabManager.getLabStates(roomName);
        console.log('实验室状态:');
        labStates.forEach((lab, index) => {
            console.log(`  实验室 ${index + 1}: ${lab.resourceType || '空'} x${lab.amount}, 冷却: ${lab.cooldown}`);
        });

        // 显示资源状态
        const resources = LabManager.getResourceStatus(roomName);
        console.log('房间资源状态:');
        Object.entries(resources).forEach(([resource, amount]) => {
            console.log(`  ${resource}: ${amount}`);
        });
    }

    // 创建基础反应任务
    static createBasicReactionTasks(roomName: string): void {
        console.log(`为房间 ${roomName} 创建基础反应任务`);

        // 检查实验室数量
        const labs = LabManager.getLabs(roomName);
        if (labs.length < 3) {
            console.log(`房间 ${roomName} 实验室数量不足，跳过任务创建`);
            return;
        }

        // 清空之前的任务
        LabManager.clearTasks(roomName);

        // 创建基础反应物
        LabManager.createBasicReactions(roomName);

        console.log(`已为房间 ${roomName} 创建基础反应任务`);
    }

    // 创建高级反应任务
    static createAdvancedReactionTasks(roomName: string): void {
        console.log(`为房间 ${roomName} 创建高级反应任务`);

        // 检查实验室数量
        const labs = LabManager.getLabs(roomName);
        if (labs.length < 6) {
            console.log(`房间 ${roomName} 实验室数量不足，需要至少6个实验室进行高级反应`);
            return;
        }

        // 创建高级反应物
        LabManager.createAdvancedReactions(roomName);

        console.log(`已为房间 ${roomName} 创建高级反应任务`);
    }

    // 创建特定的Power反应
    static createPowerReaction(roomName: string, amount: number = 100): void {
        console.log(`为房间 ${roomName} 创建Power反应任务，数量: ${amount}`);

        const taskId = LabManager.addReactionTask(roomName, RESOURCE_POWER, amount, 10);
        if (taskId) {
            console.log(`Power反应任务已创建，任务ID: ${taskId}`);
        }
    }

    // 创建特定的高级化合物
    static createSpecificCompound(roomName: string, compound: string, amount: number = 200): void {
        console.log(`为房间 ${roomName} 创建 ${compound} 反应任务，数量: ${amount}`);

        const taskId = LabManager.addReactionTask(roomName, compound as any, amount, 5);
        if (taskId) {
            console.log(`${compound} 反应任务已创建，任务ID: ${taskId}`);
        }
    }

    // 处理所有反应任务
    static processAllReactions(roomName: string): void {
        LabManager.processReactionTasks(roomName);
    }

    // 显示任务状态
    static showTaskStatus(roomName: string): void {
        const tasks = LabManager.getReactionTasks(roomName);

        console.log(`房间 ${roomName} 反应任务状态:`);

        if (tasks.length === 0) {
            console.log('  没有活跃的反应任务');
            return;
        }

        tasks.forEach((task, index) => {
            console.log(`  任务 ${index + 1}:`);
            console.log(`    ID: ${task.id}`);
            console.log(`    产物: ${task.resultType} x${task.amount}`);
            console.log(`    反应物: ${task.reagent1} + ${task.reagent2}`);
            console.log(`    状态: ${task.status}`);
            console.log(`    优先级: ${task.priority}`);
            console.log(`    创建时间: ${task.created}`);
        });
    }

    // 创建实验室操作员
    static createLabOperators(spawnName: string, roomName: string, count: number = 2): void {
        console.log(`在房间 ${roomName} 创建 ${count} 个实验室操作员`);
        labOperator.create(spawnName, roomName, count);
    }

    // 检查资源需求
    static checkResourceNeeds(roomName: string): void {
        const resources = LabManager.getResourceStatus(roomName);
        const tasks = LabManager.getReactionTasks(roomName);

        console.log(`房间 ${roomName} 资源需求分析:`);

        // 计算任务所需的反应物
        const needs: Record<string, number> = {};

        tasks.forEach(task => {
            if (task.status === 'running' || task.status === 'pending') {
                needs[task.reagent1] = (needs[task.reagent1] || 0) + task.amount;
                needs[task.reagent2] = (needs[task.reagent2] || 0) + task.amount;
            }
        });

        console.log('需要的反应物:');
        Object.entries(needs).forEach(([resource, amount]) => {
            const current = resources[resource as any] || 0;
            const deficit = Math.max(0, amount - current);
            console.log(`  ${resource}: 需要 ${amount}, 当前 ${current}, 缺口 ${deficit}`);
        });
    }

    // 优化任务队列
    static optimizeTasks(roomName: string): void {
        const tasks = LabManager.getReactionTasks(roomName);

        console.log(`优化房间 ${roomName} 的任务队列`);

        // 检查任务是否可执行（是否有足够的反应物）
        const resources = LabManager.getResourceStatus(roomName);

        tasks.forEach(task => {
            if (task.status === 'pending') {
                const hasReagent1 = (resources[task.reagent1] || 0) >= 100;
                const hasReagent2 = (resources[task.reagent2] || 0) >= 100;

                if (hasReagent1 && hasReagent2) {
                    task.status = 'running';
                    console.log(`任务 ${task.id} 状态更新为运行中`);
                }
            }
        });
    }

    // 完整的实验室管理工作流程示例
    static completeLabWorkflow(roomName: string, spawnName: string): void {
        console.log(`开始房间 ${roomName} 的完整实验室管理工作流程`);

        // 1. 初始化系统
        this.initializeLabSystem(roomName);

        // 2. 检查资源状态
        this.checkResourceNeeds(roomName);

        // 3. 创建任务
        this.createBasicReactionTasks(roomName);

        // 4. 创建操作员
        this.createLabOperators(spawnName, roomName, 2);

        // 5. 显示任务状态
        this.showTaskStatus(roomName);

        console.log(`房间 ${roomName} 实验室管理工作流程初始化完成`);
    }

    // 紧急清理实验室
    static emergencyCleanup(roomName: string): void {
        console.log(`执行房间 ${roomName} 的紧急实验室清理`);

        // 清空所有任务
        LabManager.clearTasks(roomName);

        console.log(`已清空房间 ${roomName} 的所有反应任务`);
    }
}

// 导出快捷函数供主循环使用
export function runLabSystem(roomName: string): void {
    // 处理反应任务
    LabManager.processReactionTasks(roomName);

    // 每隔一段时间检查任务状态
    if (Game.time % 100 === 0) {
        LabReactionExample.showTaskStatus(roomName);
    }
}

export function setupLabSystem(roomName: string, spawnName: string): void {
    LabReactionExample.completeLabWorkflow(roomName, spawnName);
}
