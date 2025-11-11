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
function hasStore(structure: AnyStructure): structure is (StructureSpawn | StructureExtension | StructureTower | StructureStorage | StructureContainer | StructureLink) {
    return structure.structureType === STRUCTURE_SPAWN ||
           structure.structureType === STRUCTURE_EXTENSION ||
           structure.structureType === STRUCTURE_TOWER ||
           structure.structureType === STRUCTURE_STORAGE ||
           structure.structureType === STRUCTURE_CONTAINER ||
           structure.structureType === STRUCTURE_LINK;
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
            // 闲时采集者：link(资源点附近) > container > spawn > extension > tower > storage
            switch (structureType) {
                case STRUCTURE_LINK: return 0; // 最高优先级，但只在资源点附近
                case STRUCTURE_CONTAINER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_TOWER: return 4;
                case STRUCTURE_STORAGE: return 5;
                default: return 999;
            }

        case PriorityMode.WARTIME_TRANSPORTER:
            // 战时搬运者：link(资源点附近) > tower > spawn > extension > storage > container
            switch (structureType) {
                case STRUCTURE_LINK: return 0; // 最高优先级，但只在资源点附近
                case STRUCTURE_TOWER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_STORAGE: return 4;
                case STRUCTURE_CONTAINER: return 5;
                default: return 999;
            }

        case PriorityMode.WARTIME_HARVESTER:
            // 战时采集者：link(资源点附近) > container > tower > spawn > extension > storage
            switch (structureType) {
                case STRUCTURE_LINK: return 0; // 最高优先级，但只在资源点附近
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
 * 检查Link是否在资源点附近3格范围内
 * @param link Link结构
 * @param room 房间对象
 * @returns boolean 是否在资源点附近
 */
function isLinkNearResource(link: StructureLink, room: Room): boolean {
    // 查找房间内所有的能量源
    const sources = room.find(FIND_SOURCES);

    // 检查Link是否距离任何一个能量源在3格范围内
    for (const source of sources) {
        const distance = link.pos.getRangeTo(source.pos);
        if (distance <= 3) {
            return true;
        }
    }

    return false;
}

/**
 * 检查目标建筑是否应该被排除（基于能量源类型避免往返搬运）
 * @param structure 目标建筑
 * @param energySourceType 能量源类型
 * @returns boolean 是否应该排除
 */
function shouldExcludeTarget(structure: AnyStructure, energySourceType: 'container' | 'storage' | 'link' | null): boolean {
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

    // 如果能量来自 link，不能搬运到 link（避免在link之间往返搬运）
    if (energySourceType === 'link' && structure.structureType === STRUCTURE_LINK) {
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
    const energySourceType: 'container' | 'storage' | 'link' | null = creep.memory.energySourceType || null;

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

            // 特殊处理Link：只有在资源点附近3格范围内才被包含
            if (structure.structureType === STRUCTURE_LINK) {
                const link = structure as StructureLink;
                if (!isLinkNearResource(link, room)) {
                    return false; // Link不在资源点附近，排除
                }
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
export function findEnergySourceByPriority(creep: Creep, mode: PriorityMode): StructureContainer | StructureStorage | StructureLink | null {
    const room = creep.room;

    // 根据模式决定能量源的优先级
    let sourcePriority: { link: number, container: number, storage: number };

    switch (mode) {
        case PriorityMode.IDLE_HARVESTER:
        case PriorityMode.WARTIME_HARVESTER:
            // 采集者模式：优先 link(资源点附近)，其次 container，最后 storage
            sourcePriority = { link: 0, container: 1, storage: 2 };
            break;

        case PriorityMode.WARTIME_TRANSPORTER:
            // 战时搬运者：优先 storage，其次 container，最后 link
            sourcePriority = { link: 2, container: 1, storage: 0 };
            break;

        default:
            sourcePriority = { link: 0, container: 1, storage: 2 };
    }

    // 查找 links（只包含在资源点附近的且有能量的）
    const links = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_LINK) return false;
            const link = structure as StructureLink;
            return link.store.getUsedCapacity(RESOURCE_ENERGY) > 0 && isLinkNearResource(link, room);
        }
    }) as StructureLink[];

    // 查找 container
    const containers = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_CONTAINER) return false;
            const container = structure as StructureContainer;
            return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureContainer[];

    // 查找 storage
    const storages = room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            if (structure.structureType !== STRUCTURE_STORAGE) return false;
            const storage = structure as StructureStorage;
            return storage.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as StructureStorage[];

    // 按优先级返回能量源
    const prioritizedSources: Array<{ type: string; priority: number; structures: any[] }> = [
        { type: 'link', priority: sourcePriority.link, structures: links },
        { type: 'container', priority: sourcePriority.container, structures: containers },
        { type: 'storage', priority: sourcePriority.storage, structures: storages }
    ];

    // 按优先级排序
    prioritizedSources.sort((a, b) => a.priority - b.priority);

    for (const source of prioritizedSources) {
        if (source.structures.length > 0) {
            if (source.type === 'storage') {
                return source.structures[0]; // storage通常只有一个，直接返回
            } else {
                return creep.pos.findClosestByPath(source.structures);
            }
        }
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

/**
 * 调试函数：显示房间内Link的状态和资源距离信息
 * @param room 房间对象
 */
export function debugLinksStatus(room: Room): void {
    console.log(`=== 房间 ${room.name} Link状态报告 ===`);

    const links = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureLink => {
            return structure.structureType === STRUCTURE_LINK;
        }
    }) as StructureLink[];

    if (links.length === 0) {
        console.log('房间内没有Link');
        console.log('=== 报告结束 ===');
        return;
    }

    console.log(`总Link数量: ${links.length}`);

    // 查找房间内的所有能量源
    const sources = room.find(FIND_SOURCES);
    console.log(`能量源数量: ${sources.length}`);

    links.forEach((link, index) => {
        const energy = link.store.getUsedCapacity(RESOURCE_ENERGY);
        const capacity = link.store.getCapacity(RESOURCE_ENERGY);
        const percentage = capacity > 0 ? (energy / capacity) * 100 : 0;
        const isNearResource = isLinkNearResource(link, room);

        // 找到最近的能量源距离
        let minDistance = Infinity;
        for (const source of sources) {
            const distance = link.pos.getRangeTo(source.pos);
            minDistance = Math.min(minDistance, distance);
        }

        console.log(`${index + 1}. Link ${link.id.slice(-4)}:`);
        console.log(`   - 位置: (${link.pos.x}, ${link.pos.y})`);
        console.log(`   - 能量: ${energy}/${capacity} (${percentage.toFixed(1)}%)`);
        console.log(`   - 冷却: ${link.cooldown} tick`);
        console.log(`   - 距离最近能量源: ${minDistance === Infinity ? '未知' : minDistance} 格`);
        console.log(`   - 是否在资源点附近(3格内): ${isNearResource ? '✅ 是' : '❌ 否'}`);
        console.log(`   - 是否包含在优先级系统中: ${isNearResource ? '✅ 是(优先级0)' : '❌ 否(已排除)'}`);
    });

    console.log('=== 报告结束 ===');
}

/**
 * 显示优先级系统的能量目标信息
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 */
export function debugPriorityTargets(creep: Creep, mode: PriorityMode): void {
    console.log(`=== ${creep.name} 优先级目标报告 (模式: ${mode}) ===`);

    const targets = findEnergyTargetsByPriority(creep, mode);

    if (targets.length === 0) {
        console.log('没有找到需要能量的目标');
        console.log('=== 报告结束 ===');
        return;
    }

    console.log(`找到 ${targets.length} 个目标:`);

    targets.forEach((target, index) => {
        const structure = target.structure;
        console.log(`${index + 1}. ${structure.structureType} ${structure.id.slice(-4)}:`);
        console.log(`   - 位置: (${structure.pos.x}, ${structure.pos.y})`);
        console.log(`   - 优先级: ${target.priority}`);
        console.log(`   - 空余容量: ${target.freeCapacity}`);
        console.log(`   - 距离: ${creep.pos.getRangeTo(structure.pos)} 格`);

        // 如果是Link，显示额外信息
        if (structure.structureType === STRUCTURE_LINK) {
            const link = structure as StructureLink;
            const isNearResource = isLinkNearResource(link, creep.room);
            console.log(`   - Link特殊信息: 在资源点附近=${isNearResource}`);
        }
    });

    console.log('=== 报告结束 ===');
}
