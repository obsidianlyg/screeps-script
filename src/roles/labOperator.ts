import LabManager, { ReactionTask } from '../utils/LabManager';
import transporterRole from './transporter';

interface LabOperatorMemory extends CreepMemory {
    currentTask?: ReactionTask;
    labId?: Id<StructureLab>;
    targetResource?: ResourceConstant;
    working: boolean;
}

export default {
    // 创建实验室操作员
    create(spawnName: string, roomName: string, count: number = 1): void {
        const spawn = Game.spawns[spawnName];
        if (!spawn) {
            console.log(`ERROR: Spawn ${spawnName} not found`);
            return;
        }

        const energy = spawn.room.energyAvailable;
        const body = this.getOptimalBody(energy);

        for (let i = 0; i < count; i++) {
            const creepName = `labOperator_${roomName}_${Game.time}_${i}`;
            const result = spawn.spawnCreep(body, creepName, {
                memory: {
                    role: 'labOperator',
                    room: roomName,
                    working: false
                } as LabOperatorMemory
            });

            if (result === OK) {
                console.log(`创建实验室操作员: ${creepName}`);
            } else {
                console.log(`创建实验室操作员失败: ${result}`);
            }
        }
    },

    // 获取最优身体配置
    getOptimalBody(energy: number): BodyPartConstant[] {
        const parts: BodyPartConstant[] = [];

        // 计算能负担多少个 CARRY 和 WORK
        const carryCost = BODYPART_COST[CARRY];
        const workCost = BODYPART_COST[WORK];
        const moveCost = BODYPART_COST[MOVE];

        let remainingEnergy = energy;
        let carryCount = 0;
        let workCount = 0;
        let moveCount = 0;

        // 优先添加 WORK 部分
        while (remainingEnergy >= workCost + moveCost) {
            parts.push(WORK, MOVE);
            remainingEnergy -= (workCost + moveCost);
            workCount++;
            moveCount++;
        }

        // 添加 CARRY 部分
        while (remainingEnergy >= carryCost + moveCost) {
            parts.push(CARRY, MOVE);
            remainingEnergy -= (carryCost + moveCost);
            carryCount++;
            moveCount++;
        }

        // 确保至少有基本的平衡
        if (parts.length === 0) {
            return [WORK, CARRY, MOVE];
        }

        return parts;
    },

    // 运行实验室操作员
    run(creep: Creep): void {
        const memory = creep.memory as LabOperatorMemory;

        if (!memory.currentTask) {
            this.findNewTask(creep);
            return;
        }

        if (memory.working) {
            this.executeTask(creep);
        } else {
            this.prepareForTask(creep);
        }
    },

    // 寻找新任务
    findNewTask(creep: Creep): void {
        const memory = creep.memory as LabOperatorMemory;
        const roomName = creep.room.name;
        const tasks = LabManager.getReactionTasks(roomName);

        // 寻找需要资源准备的任务
        for (const task of tasks) {
            if (task.status === 'running') {
                // 检查是否需要为这个任务准备资源
                if (this.needsResourcePreparation(creep, task)) {
                    memory.currentTask = task;
                    memory.working = false;
                    console.log(`${creep.name} 接受任务: ${task.resultType}`);
                    return;
                }
            }
        }

        // 如果没有任务，执行清理工作
        this.cleanupLabs(creep);
    },

    // 检查任务是否需要资源准备
    needsResourcePreparation(creep: Creep, task: ReactionTask): boolean {
        if (!task.lab1Id || !task.lab2Id) {
            return false;
        }

        const lab1 = Game.getObjectById(task.lab1Id);
        const lab2 = Game.getObjectById(task.lab2Id);

        if (!lab1 || !lab2) {
            return false;
        }

        // 检查反应物是否充足
        const needsReagent1 = !lab1.mineralType || lab1.mineralAmount < 100;
        const needsReagent2 = !lab2.mineralType || lab2.mineralAmount < 100;

        return needsReagent1 || needsReagent2;
    },

    // 准备任务资源
    prepareForTask(creep: Creep): void {
        const memory = creep.memory as LabOperatorMemory;
        const task = memory.currentTask;

        if (!task || !task.lab1Id || !task.lab2Id) {
            memory.currentTask = undefined;
            return;
        }

        const lab1 = Game.getObjectById(task.lab1Id);
        const lab2 = Game.getObjectById(task.lab2Id);

        if (!lab1 || !lab2) {
            memory.currentTask = undefined;
            return;
        }

        // 确定需要获取的资源
        let targetResource: ResourceConstant | undefined;
        let sourceStructure: any;

        if (!lab1.mineralType || lab1.mineralAmount < 100) {
            targetResource = task.reagent1;
            sourceStructure = this.findResourceSource(creep.room, targetResource as ResourceConstant);
        } else if (!lab2.mineralType || lab2.mineralAmount < 100) {
            targetResource = task.reagent2;
            sourceStructure = this.findResourceSource(creep.room, targetResource as ResourceConstant);
        }

        if (!sourceStructure || !targetResource) {
            console.log(`${creep.name} 无法找到 ${targetResource} 的来源`);
            memory.currentTask = undefined;
            return;
        }

        // 从源结构获取资源
        const result = creep.withdraw(sourceStructure, targetResource);
        if (result === OK) {
            memory.working = true;
            memory.targetResource = targetResource;
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(sourceStructure, { visualizePathStyle: { stroke: '#ffaa00' } });
        } else {
            console.log(`${creep.name} 提取 ${targetResource} 失败: ${result}`);
        }
    },

    // 执行任务
    executeTask(creep: Creep): void {
        const memory = creep.memory as LabOperatorMemory;
        const task = memory.currentTask;

        if (!task || !task.lab1Id || !task.lab2Id) {
            memory.currentTask = undefined;
            memory.working = false;
            return;
        }

        const lab1 = Game.getObjectById(task.lab1Id);
        const lab2 = Game.getObjectById(task.lab2Id);

        if (!lab1 || !lab2) {
            memory.currentTask = undefined;
            memory.working = false;
            return;
        }

        let targetLab: StructureLab | null = null;
        let targetResource: ResourceConstant | undefined;

        // 确定目标实验室和资源
        if (memory.targetResource === task.reagent1) {
            targetLab = lab1;
            targetResource = task.reagent1;
        } else if (memory.targetResource === task.reagent2) {
            targetLab = lab2;
            targetResource = task.reagent2;
        }

        if (!targetLab || !targetResource) {
            // 资源已经准备好，开始工作模式
            if (creep.store.getUsedCapacity() === 0) {
                memory.working = false;
            } else {
                // 有资源但不确定放到哪里，清空并重新开始
                this.transferToStorage(creep);
            }
            return;
        }

        // 转移资源到实验室
        const result = creep.transfer(targetLab, targetResource);
        if (result === OK) {
            if (creep.store.getUsedCapacity() === 0) {
                memory.working = false;
                memory.targetResource = undefined;
            }
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(targetLab, { visualizePathStyle: { stroke: '#00ff00' } });
        } else if (result === ERR_FULL || result === ERR_INVALID_TARGET) {
            // 实验室已满或有其他问题，转移到存储
            this.transferToStorage(creep);
        } else {
            console.log(`${creep.name} 转移资源到实验室失败: ${result}`);
        }
    },

    // 查找资源来源
    findResourceSource(room: Room, resourceType: ResourceConstant): StructureStorage | StructureTerminal | StructureLab | null {
        // 首先检查存储
        const storage = room.storage;
        if (storage && storage.store[resourceType] && storage.store[resourceType] > 0) {
            return storage;
        }

        // 然后检查终端
        const terminal = room.terminal;
        if (terminal && terminal.store[resourceType] && terminal.store[resourceType] > 0) {
            return terminal;
        }

        // 最后检查其他实验室
        const labs = room.find<StructureLab>(FIND_MY_STRUCTURES, {
            filter: (structure): structure is StructureLab =>
                structure.structureType === STRUCTURE_LAB &&
                structure.mineralType === resourceType &&
                structure.mineralAmount > 100
        });

        return labs.length > 0 ? labs[0] : null;
    },

    // 转移资源到存储
    transferToStorage(creep: Creep): void {
        const room = creep.room;
        let targetStructure: StructureStorage | StructureTerminal | null = null;

        // 优先转移到终端
        if (room.terminal) {
            targetStructure = room.terminal;
        } else if (room.storage) {
            targetStructure = room.storage;
        }

        if (!targetStructure) {
            // 没有存储结构，丢弃资源
            for (const resource in creep.store) {
                creep.drop(resource as ResourceConstant);
            }
            return;
        }

        // 转移所有资源
        for (const resource in creep.store) {
            const amount = creep.store[resource as ResourceConstant];
            if (amount > 0) {
                const result = creep.transfer(targetStructure, resource as ResourceConstant);
                if (result === OK) {
                    break; // 一次只能转移一种资源
                } else if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetStructure, { visualizePathStyle: { stroke: '#ff0000' } });
                    break;
                }
            }
        }
    },

    // 清理实验室
    cleanupLabs(creep: Creep): void {
        const room = creep.room;
        const labs = room.find<StructureLab>(FIND_MY_STRUCTURES, {
            filter: (structure): structure is StructureLab =>
                structure.structureType === STRUCTURE_LAB &&
                structure.mineralType !== undefined &&
                structure.mineralAmount > 0
        });

        if (labs.length === 0) {
            return;
        }

        // 找到需要清理的实验室
        const labToCleanup = labs[0];
        if (creep.store.getFreeCapacity() === 0) {
            // 背包已满，转移到存储
            this.transferToStorage(creep);
            return;
        }

        // 从实验室提取资源
        const result = creep.withdraw(labToCleanup, labToCleanup.mineralType!);
        if (result === OK) {
            console.log(`${creep.name} 正在清理实验室: ${labToCleanup.mineralType}`);
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(labToCleanup, { visualizePathStyle: { stroke: '#ffff00' } });
        }
    },

    // 获取房间内所有实验室操作员
    getLabOperators(roomName: string): Creep[] {
        return _.filter(Game.creeps, creep =>
            creep.memory.role === 'labOperator' && creep.memory.room === roomName
        );
    }
};
