/**
 * 能量搬运优先级系统
 * 根据不同的状态和角色设置不同的目标优先级
 */

export enum PriorityMode {
    IDLE_HARVESTER = 'idle_harvester',      // 闲时采集者
    WARTIME_TRANSPORTER = 'wartime_transporter', // 战时搬运者
    WARTIME_HARVESTER = 'wartime_harvester'      // 战时采集者
}

/**
 * 能量目标结构，包含目标建筑和优先级信息
 */
interface EnergyTarget {
    structure: AnyStructure;
    priority: number;
    freeCapacity: number;
}

/**
 * 类型守卫函数：检查结构是否有 store 属性
 * @param structure 要检查的结构
 * @returns boolean 是否有 store 属性
 */
function hasStore(structure: AnyStructure): structure is (StructureSpawn | StructureExtension | StructureTower | StructureStorage | StructureContainer) {
    return structure.structureType === STRUCTURE_SPAWN ||
           structure.structureType === STRUCTURE_EXTENSION ||
           structure.structureType === STRUCTURE_TOWER ||
           structure.structureType === STRUCTURE_STORAGE ||
           structure.structureType === STRUCTURE_CONTAINER;
}

/**
 * 根据优先级模式获取目标建筑的优先级
 * @param structureType 建筑类型
 * @param mode 优先级模式
 * @returns number 优先级（数字越小优先级越高）
 */
function getStructurePriority(structureType: StructureConstant, mode: PriorityMode): number {
    switch (mode) {
        case PriorityMode.IDLE_HARVESTER:
            // 闲时采集者：container > spawn > extension > tower
            switch (structureType) {
                case STRUCTURE_CONTAINER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_TOWER: return 4;
                case STRUCTURE_STORAGE: return 5;
                default: return 999;
            }

        case PriorityMode.WARTIME_TRANSPORTER:
            // 战时搬运者：tower > spawn > extension > storage
            switch (structureType) {
                case STRUCTURE_TOWER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_STORAGE: return 4;
                case STRUCTURE_CONTAINER: return 5;
                default: return 999;
            }

        case PriorityMode.WARTIME_HARVESTER:
            // 战时采集者：container > tower > spawn > extension
            switch (structureType) {
                case STRUCTURE_CONTAINER: return 1;
                case STRUCTURE_TOWER: return 2;
                case STRUCTURE_SPAWN: return 3;
                case STRUCTURE_EXTENSION: return 4;
                case STRUCTURE_STORAGE: return 5;
                default: return 999;
            }

        default:
            return 999;
    }
}

/**
 * 检查目标建筑是否应该被排除（基于能量源类型避免往返搬运）
 * @param structure 目标建筑
 * @param energySourceType 能量源类型
 * @returns boolean 是否应该排除
 */
function shouldExcludeTarget(structure: AnyStructure, energySourceType: 'container' | 'storage' | null): boolean {
    if (!energySourceType) {
        return false;
    }

    // 如果能量来自 container，不能搬运到 container
    if (energySourceType === 'container' && structure.structureType === STRUCTURE_CONTAINER) {
        return true;
    }

    // 如果能量来自 storage，不能搬运到 storage
    if (energySourceType === 'storage' && structure.structureType === STRUCTURE_STORAGE) {
        return true;
    }

    return false;
}

/**
 * 根据优先级模式查找需要能量的建筑
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 * @param includeStorage 是否包含 storage 作为目标
 * @returns 按优先级排序的可用目标列表
 */
export function findEnergyTargetsByPriority(
    creep: Creep,
    mode: PriorityMode,
    includeStorage: boolean = false
): EnergyTarget[] {
    const targets: EnergyTarget[] = [];
    const room = creep.room;
    const energySourceType: 'container' | 'storage' | null = creep.memory.energySourceType || null;

    // 查找所有需要能量的建筑
    const structuresNeedingEnergy = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            // 根据模式决定是否包含某些结构类型
            if (!includeStorage && structure.structureType === STRUCTURE_STORAGE) {
                return false;
            }

            // 只考虑有 store 属性的结构
            if (!hasStore(structure)) {
                return false;
            }

            // 检查是否应该排除（避免往返搬运）
            if (shouldExcludeTarget(structure, energySourceType)) {
                return false;
            }

            // 检查是否有空余容量
            const freeCapacity = structure.store.getFreeCapacity(RESOURCE_ENERGY);
            return freeCapacity > 0;
        }
    });

    // 为每个建筑分配优先级并收集信息
    for (const structure of structuresNeedingEnergy) {
        if (!hasStore(structure)) continue;

        const priority = getStructurePriority(structure.structureType, mode);
        const freeCapacity = structure.store.getFreeCapacity(RESOURCE_ENERGY);

        // 只包含有意义的优先级（排除 999）
        if (priority < 999) {
            targets.push({
                structure,
                priority,
                freeCapacity
            });
        }
    }

    // 按优先级排序（优先级数字越小越靠前），如果优先级相同则按距离排序
    targets.sort((a, b) => {
        if (a.priority !== b.priority) {
            return a.priority - b.priority;
        }
        // 优先级相同时比较距离
        return creep.pos.getRangeTo(a.structure.pos) - creep.pos.getRangeTo(b.structure.pos);
    });

    return targets;
}

/**
 * 根据优先级模式查找能量源
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 * @returns 能量源对象
 */
export function findEnergySourceByPriority(creep: Creep, mode: PriorityMode): StructureContainer | StructureStorage | null {
    const room = creep.room;

    // 根据模式决定能量源的优先级
    let sourcePriority: { container: number, storage: number };

    switch (mode) {
        case PriorityMode.IDLE_HARVESTER:
        case PriorityMode.WARTIME_HARVESTER:
            // 采集者模式：优先 container，其次 storage
            sourcePriority = { container: 1, storage: 2 };
            break;

        case PriorityMode.WARTIME_TRANSPORTER:
            // 战时搬运者：优先 storage，其次 container
            sourcePriority = { container: 2, storage: 1 };
            break;

        default:
            sourcePriority = { container: 1, storage: 2 };
    }

    // 查找 container 和 storage
    const containers = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_CONTAINER) return false;
            const container = structure as StructureContainer;
            return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureContainer[];

    const storages = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_STORAGE) return false;
            const storage = structure as StructureStorage;
            return storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureStorage[];

    // 按优先级返回能量源
    if (sourcePriority.container <= sourcePriority.storage && containers.length > 0) {
        return creep.pos.findClosestByPath(containers);
    } else if (storages.length > 0) {
        return storages[0]; // 房间内通常只有一个 storage
    } else if (containers.length > 0) {
        return creep.pos.findClosestByPath(containers);
    }

    return null;
}

/**
 * 获取角色对应的优先级模式
 * @param creepRole creep 角色
 * @param isWartime 是否战时状态
 * @returns 优先级模式
 */
export function getPriorityMode(creepRole: string, isWartime: boolean = false): PriorityMode {
    if (isWartime) {
        if (checkPrefix(creepRole, 'harvester') || checkPrefix(creepRole, 'big_harvester')) {
            return PriorityMode.WARTIME_HARVESTER;
        } else if (checkPrefix(creepRole, 'transporter')) {
            return PriorityMode.WARTIME_TRANSPORTER;
        }
    } else {
        if (checkPrefix(creepRole, 'harvester') || checkPrefix(creepRole, 'big_harvester')) {
            return PriorityMode.IDLE_HARVESTER;
        }
    }

    // 默认使用闲时采集者模式
    return PriorityMode.IDLE_HARVESTER;
}

function checkPrefix(mainStr: string, prefix: string): boolean {
  return mainStr.startsWith(prefix);
}

/**
 * 检查房间是否需要能量搬运
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 * @returns boolean 是否需要搬运
 */
export function needsEnergyTransportByPriority(creep: Creep, mode: PriorityMode): boolean {
    const targets = findEnergyTargetsByPriority(creep, mode);
    return targets.length > 0;
}
