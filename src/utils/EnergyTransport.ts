import { handleStuckDetection } from "./StuckDetection";

/**
 * 能量目标结构，包含目标建筑和优先级信息
 */
interface EnergyTarget {
    structure: AnyStructure;
    priority: number;
    freeCapacity: number;
}

/**
 * 能量搬运工具
 * 负责为 spawn、extension、tower 等建筑补充能量，按优先级排序
 */

/**
 * 类型守卫函数：检查结构是否有 store 属性
 * @param structure 要检查的结构
 * @returns boolean 是否有 store 属性
 */
function hasStore(structure: AnyStructure): structure is (StructureSpawn | StructureExtension | StructureTower | StructureStorage) {
    return structure.structureType === STRUCTURE_SPAWN ||
           structure.structureType === STRUCTURE_EXTENSION ||
           structure.structureType === STRUCTURE_TOWER ||
           structure.structureType === STRUCTURE_STORAGE;
}

/**
 * 查找需要能量的建筑，按优先级排序
 * @param room 目标房间
 * @returns 按优先级排序的可用目标列表
 */
function findEnergyTargets(screep: Creep): EnergyTarget[] {
    const targets: EnergyTarget[] = [];

    let room = screep.room;

    // 查找所有需要能量的建筑和storage
    const structuresNeedingEnergy = room.find(FIND_STRUCTURES, {
        filter: (structure) => {

            // 只考虑 spawn, extension, tower，storage
            if (!hasStore(structure)) {
                return false;
            }
            // 不能跟源冲突
            if (screep.memory.energySourceType == structure.structureType) {
                return false;
            }

            // 检查是否有空余容量
            const freeCapacity = structure.store.getFreeCapacity(RESOURCE_ENERGY);
            return freeCapacity > 0;
        }
    }) as (StructureSpawn | StructureExtension | StructureTower | StructureStorage)[];

    // 为每个建筑分配优先级并收集信息
    for (const structure of structuresNeedingEnergy) {
        let priority = 0;
        const freeCapacity = structure.store.getFreeCapacity(RESOURCE_ENERGY);

        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
                priority = 1; // 最高优先级
                break;
            case STRUCTURE_EXTENSION:
                priority = 2; // 中等优先级
                break;
            case STRUCTURE_TOWER:
                priority = 3; // 最低优先级
                break;
            case STRUCTURE_STORAGE:
                priority = 4; // 最低优先级
                break;
        }

        targets.push({
            structure,
            priority,
            freeCapacity
        });
    }

    // 按优先级排序（优先级数字越小越靠前），如果优先级相同则按距离排序
    targets.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        // 这里会在调用时传入具体的 creep 来计算距离
        return 0;
    });

    return targets;
}

/**
 * 寻找最近的能量源
 * @param creep 需要能量的 creep
 * @returns 能量源对象，如果没有则返回 null
 */
function findEnergySource(creep: Creep): StructureContainer | StructureStorage | null {
    // 分别查找 container 和 storage
    const containers = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_CONTAINER) {
                return false;
            }
            const container = structure as StructureContainer;
            return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureContainer[];

    const storages = creep.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_STORAGE) {
                return false;
            }
            const storage = structure as StructureStorage;
            return storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureStorage[];

    // 优先选择最近的 container
    if (containers.length > 0) {
        const nearestContainer = creep.pos.findClosestByPath(containers);
        if (nearestContainer) {
            return nearestContainer;
        }
    }

    // 如果没有 container，选择 storage
    if (storages.length > 0) {
        return storages[0]; // 房间内通常只有一个 storage
    }

    // 如果都没有，返回 null
    return null;
}


/**
 * 能量搬运主要逻辑
 * @param creep 执行搬运任务的 creep
 * @returns boolean 是否正在执行搬运任务
 */
export function transportEnergy(creep: Creep): boolean {
    // 检查 creep 是否有搬运任务的内存标记
    if (!creep.memory.transportTarget) {
        creep.memory.transportTarget = null;
        creep.memory.isGettingEnergy = false;
    }

    // 如果没有能量，需要先获取能量
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.isGettingEnergy = true;
        creep.memory.transportTarget = null;
        creep.memory.energySourceType = null; // 清除能量源类型缓存
        creep.say('⚡ 取能量');
    }

    // 如果能量满了，准备去搬运
    if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
        creep.memory.isGettingEnergy = false;
        creep.memory.transportTarget = null;
        creep.say('🚚 搬运');
    }

    const transportTargetId = creep.memory.transportTarget;
    const isGettingEnergy = creep.memory.isGettingEnergy;

    // 获取能量阶段
    if (isGettingEnergy) {
        // 首先尝试从缓存的目标获取能量
        if (transportTargetId) {
            const source = Game.getObjectById(transportTargetId);
            if (source && hasStore(source) && source.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                return handleEnergyWithdraw(creep, source as StructureContainer | StructureStorage);
            } else {
                // 目标无效，清除缓存
                creep.memory.transportTarget = null;
            }
        }

        // 查找新的能量源
         let energySource = findEnergySource(creep);

        if (energySource) {
            creep.memory.transportTarget = energySource.id;
            return handleEnergyWithdraw(creep, energySource);
        }

        console.log(`${creep.name}: 找不到可用的能量源`);
        return false;
    }

    // 搬运能量阶段
    const targets = findEnergyTargets(creep);
    if (targets.length === 0) {
        console.log(`${creep.name}: 没有需要补充能量的建筑`);
        return false;
    }

    // 使用能量源类型缓存过滤目标，避免往返搬运
    const energySourceType = creep.memory.energySourceType;
    let filteredTargets = targets;

    // 按距离重新排序目标（考虑当前 creep 的位置）
    filteredTargets.sort((a, b) => {
        const distanceA = creep.pos.getRangeTo(a.structure.pos);
        const distanceB = creep.pos.getRangeTo(b.structure.pos);

        // 优先级相同时比较距离
        if (a.priority === b.priority) {
            return distanceA - distanceB;
        }

        return a.priority - b.priority;
    });

    // 选择最佳目标
    const bestTarget = filteredTargets[0];
    creep.memory.transportTarget = bestTarget.structure.id;

    return handleEnergyTransfer(creep, bestTarget.structure);
}

/**
 * 处理从能量源取能量的逻辑
 * @param creep 执行任务的 creep
 * @param source 能量源
 * @returns boolean 是否正在处理
 */
function handleEnergyWithdraw(creep: Creep, source: StructureContainer | StructureStorage): boolean {
    const result = creep.withdraw(source, RESOURCE_ENERGY);

    if (result === OK) {
        console.log(`${creep.name}: 成功从 ${source.structureType} 获取能量`);
        // 记录能量源类型
        creep.memory.energySourceType = source.structureType === STRUCTURE_CONTAINER ? 'container' : 'storage';
        return true;
    } else if (result === ERR_NOT_IN_RANGE) {

        creep.moveTo(source, {
            visualizePathStyle: { stroke: '#fa7000ff' }, // 黄色表示取能量
            ignoreCreeps: false
        });
        return true;
    } else {
        console.log(`${creep.name}: 从 ${source.structureType} 取能量失败: ${result}`);
        creep.memory.transportTarget = null;
        return false;
    }
}

/**
 * 处理向目标建筑转移能量的逻辑
 * @param creep 执行任务的 creep
 * @param target 目标建筑
 * @returns boolean 是否正在处理
 */
function handleEnergyTransfer(creep: Creep, target: AnyStructure): boolean {
    const result = creep.transfer(target, RESOURCE_ENERGY);

    if (result === OK) {
        console.log(`${creep.name}: 成功向 ${target.structureType} 转移能量`);
        // 检查目标建筑是否已满（需要类型检查）
        if (hasStore(target) && target.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            creep.memory.transportTarget = null;
        }
        // 转移完成后清除能量源类型缓存
        creep.memory.energySourceType = null;
        return true;
    } else if (result === ERR_NOT_IN_RANGE) {
        // 添加卡住检测
        if (handleStuckDetection(creep, target, 'transportTransferPosition', 5)) {
            return true; // 绕路移动结束本轮
        }

        creep.moveTo(target, {
            visualizePathStyle: { stroke: '#00ffff' }, // 青色表示转移能量
            ignoreCreeps: false
        });
        return true;
    } else if (result === ERR_FULL) {
        console.log(`${creep.name}: 目标 ${target.structureType} 已满`);
        creep.memory.transportTarget = null;
        return false;
    } else {
        console.log(`${creep.name}: 向 ${target.structureType} 转移能量失败: ${result}`);
        creep.memory.transportTarget = null;
        return false;
    }
}

/**
 * 检查房间是否需要能量搬运
 * @param room 目标房间
 * @returns boolean 是否需要搬运
 */
export function needsEnergyTransport(creep: Creep): boolean {
    const targets = findEnergyTargets(creep);
    return targets.length > 0;
}
