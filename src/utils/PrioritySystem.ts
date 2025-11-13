/**
 * 能量搬运优先级系统
 * 根据不同的状态和角色设置不同的目标优先级
 */

import {getSourcePositions} from './InitRoom'

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
            // 闲时采集者：link > container > spawn > extension > tower > storage
            switch (structureType) {
                case STRUCTURE_LINK: return 0; // 最高优先级
                case STRUCTURE_CONTAINER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_TOWER: return 4;
                case STRUCTURE_STORAGE: return 5;
                default: return 999;
            }

        case PriorityMode.WARTIME_TRANSPORTER:
            // 战时搬运者：tower > spawn > extension > storage > container > link
            switch (structureType) {
                case STRUCTURE_TOWER: return 1;
                case STRUCTURE_SPAWN: return 2;
                case STRUCTURE_EXTENSION: return 3;
                case STRUCTURE_STORAGE: return 4;
                case STRUCTURE_CONTAINER: return 5;
                case STRUCTURE_LINK: return 6;
                default: return 999;
            }

        case PriorityMode.WARTIME_HARVESTER:
            // 战时采集者：link > container > tower > spawn > extension > storage
            switch (structureType) {
                case STRUCTURE_LINK: return 0; // 最高优先级
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
 * 检查结构是否在能量源附近3格范围内 (R<=3)
 * @param structurePos 结构的位置
 * @param room 房间对象
 * @returns boolean 是否在资源点附近
 */
function isNearResource(structurePos: RoomPosition, room: Room): boolean {
    // 从缓存中安全地获取 RoomPosition 对象数组
    const sourcePositions = getSourcePositions(room);

    if (!sourcePositions || sourcePositions.length === 0) {
        // 缓存不存在时，进行备用查找或等待下一个 Tick
        // 注意：这里需要再次进行 find，会消耗 CPU，因此缓存的目的是避免走这里。
        const sources = room.find(FIND_SOURCES);
        for (const source of sources) {
            if (structurePos.getRangeTo(source.pos) <= 3) {
                return true;
            }
        }
        return false;
    }

    // 使用缓存的位置进行快速距离计算 (CPU高效)
    for (const pos of sourcePositions) {
        if (structurePos.getRangeTo(pos) <= 3) {
            return true;
        }
    }
    return false;
}


/**
 * 检查Link是否在资源点附近3格范围内
 * @param link Link结构
 * @param room 房间对象
 * @returns boolean 是否在资源点附近
 */
function isLinkNearResource(link: StructureLink, room: Room): boolean {
    return isNearResource(link.pos, room);
}

/**
 * 检查容器是否在资源点附近3格范围内
 * @param container 容器结构
 * @param room 房间对象
 * @returns boolean 是否在资源点附近
 */
function isContainerNearResource(container: StructureContainer, room: Room): boolean {
     return isNearResource(container.pos, room);
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
 * 根据优先级模式查找需要能量的建筑（距离层次版本）
 * * 目标：将能量从 Creep 转移到这些结构中。
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 * @param includeStorage 是否包含 storage 作为目标
 * @returns 按有效优先级排序的最优目标列表
 */
// (优化后的 findEnergyTargetsByPriority)
export function findEnergyTargetsByPriority(
    creep: Creep,
    mode: PriorityMode,
    includeStorage: boolean = false
): EnergyTarget[] {
    const room = creep.room;
    const energySourceType: 'container' | 'storage' | 'link' | null = creep.memory.energySourceType || null;

    interface Candidate {
        structure: AnyStoreStructure;
        basePriority: number;
        effectivePriority: number;
        distance: number;
        freeCapacity: number;
    }

    const candidateTargets: Candidate[] = [];

    // *** 统一查找，只调用一次 room.find(FIND_STRUCTURES) ***
    const allStructures = room.find(FIND_STRUCTURES) as AnyStructure[];

    for (const structure of allStructures) {
        // A. 基础过滤：排除不带 Store 的结构
        if (!hasStore(structure)) continue;

        // B. 排除条件：不含能量空位
        const structureWithStore = structure as AnyStoreStructure;
        const freeCapacity = structureWithStore.store.getFreeCapacity(RESOURCE_ENERGY);
        if (freeCapacity <= 0) continue;

        // C. 获取基础优先级（使用之前定义的函数）
        let basePriority = getStructurePriority(structure.structureType, mode);
        if (basePriority >= 999) continue; // 跳过无效优先级

        // D. 排除条件：根据模式和来源标记排除不合适的结构 (避免往返)
        if (shouldExcludeTarget(structure, energySourceType)) continue;

        // E. 排除条件：根据 includeStorage 排除 Storage
        if (!includeStorage && structure.structureType === STRUCTURE_STORAGE) continue;

        const distance = creep.pos.getRangeTo(structure.pos);
        let distancePenaltyWeight = 10; // 默认惩罚权重

        // F. 特殊处理：Link
        if (structure.structureType === STRUCTURE_LINK) {
            // 只有 Link 是接收 Link (非中央或非矿点附近的发送 Link) 且有空位才接收
            // 假设我们只将能量送给不在资源点附近的接收 Link (即中央 Link)
            // 原代码逻辑：只考虑在资源点附近的Link。如果Link逻辑复杂，应在内存中定义其角色。

            // 修正 Link 逻辑：通常 Harvester 送给 Source Link，Transporter 送给 Central Link。
            // 这里的判断 isLinkNearResource(link, room) 是 Source Link 的特征。

            // 如果 Link 基础优先级是 0 (最高)，我们只希望它接收，且它必须是 "接收" Link。
            if (isLinkNearResource(structure as StructureLink, room)) {
                 // 如果是资源点 Link（通常是Miner直接填充），Harvester/Transporter应跳过，除非它是中转。
                 // 保持原逻辑：Harvester 模式下 Link 优先级最高，惩罚最重。
                 distancePenaltyWeight = 1;
            } else {
                 // 非资源点附近的 Link (例如中央 Link)，如果不是接收目标，也应该跳过
                 // 这里需要更精细的 Link 角色判断，但为保持代码简洁，沿用原逻辑的排除。
                 // 默认所有非资源点附近的Link不作为目标，或将Link角色缓存。
                 // 暂时假设只有 isLinkNearResource 的 Link 是目标。
                 // 如果不是资源点附近的 Link，将其优先级设置为无效，使其跳过。
                 basePriority = 999;
                 continue;
            }
        }
        // G. 特殊处理：Container
        else if (structure.structureType === STRUCTURE_CONTAINER) {
            // 容器惩罚最轻
            distancePenaltyWeight = 5;
        }

        const effectivePriority = basePriority + distance * distancePenaltyWeight;

        // --- 2. 添加到候选列表 ---
        candidateTargets.push({
            structure: structureWithStore,
            basePriority,
            effectivePriority,
            distance,
            freeCapacity,
        });
    }

    // ... (排序和结果转换保持不变，与前一个答案一致) ...

    candidateTargets.sort((a, b) => {
        if (a.effectivePriority !== b.effectivePriority) {
            return a.effectivePriority - b.effectivePriority;
        }
        return a.distance - b.distance;
    });

    const result: EnergyTarget[] = [];
    for (const candidate of candidateTargets.slice(0, 5)) {
        result.push({
            structure: candidate.structure,
            priority: candidate.basePriority,
            freeCapacity: candidate.freeCapacity
        });
    }
    return result;
}

/**
 * 根据优先级模式查找能量源
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 * @returns 能量源对象
 */
export function findEnergySourceByPriority(creep: Creep, mode: PriorityMode): StructureContainer | StructureStorage | StructureLink | null {
    const room = creep.room;

    // 1. 根据模式决定能量源的优先级
    let sourcePriority: { link: number, container: number, storage: number };
    switch (mode) {
        case PriorityMode.IDLE_HARVESTER:
        case PriorityMode.WARTIME_HARVESTER:
            sourcePriority = { link: 0, container: 1, storage: 2 }; // link > container > storage
            break;
        case PriorityMode.WARTIME_TRANSPORTER:
            sourcePriority = { link: 2, container: 1, storage: 0 }; // storage > container > link
            break;
        default:
            sourcePriority = { link: 0, container: 1, storage: 2 };
    }

    // 2. 统一查找所有潜在来源结构 (只调用一次 FIND_STRUCTURES)
    // 并且只查找有能量的结构
    const availableSources = room.find(FIND_STRUCTURES, {
        filter: (s) => {
            if (!hasStore(s)) return false;
            const structure = s as AnyStoreStructure;
            return structure.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
        }
    }) as AnyStoreStructure[];

    const prioritizedStructures: { [key: string]: Array<StructureContainer | StructureStorage | StructureLink> } = {
        link: [],
        container: [],
        storage: []
    };

    // 3. 遍历并分类
    for (const s of availableSources) {
        if (s.structureType === STRUCTURE_LINK) {
            // 优化：只考虑非资源点附近的 Link (即中央 Link) 作为 Transporter 的能量源
            // 如果是资源点 Link（通常是 Hauler 倒给它），不应作为取能量的源头。
            if (!isLinkNearResource(s as StructureLink, room)) {
                prioritizedStructures.link.push(s as StructureLink);
            }
        } else if (s.structureType === STRUCTURE_CONTAINER) {
            prioritizedStructures.container.push(s as StructureContainer);
        } else if (s.structureType === STRUCTURE_STORAGE) {
            prioritizedStructures.storage.push(s as StructureStorage);
        }
    }

    // 4. 按优先级顺序查找并返回最近的结构
    const sortedPriorities: { type: 'link' | 'container' | 'storage'; priority: number }[] = [
        { type: 'link', priority: sourcePriority.link },
        { type: 'container', priority: sourcePriority.container },
        { type: 'storage', priority: sourcePriority.storage }
    ];

    sortedPriorities.sort((a, b) => a.priority - b.priority);

    for (const entry of sortedPriorities) {
        const structures = prioritizedStructures[entry.type];
        if (structures.length > 0) {
            // 优化：避免对所有 structures 调用 findClosestByPath
            if (entry.type === 'storage') {
                return structures[0] as StructureStorage; // storage通常只有一个
            } else {
                // 仅对非 Storage 的结构查找最近路径，仍然会消耗 CPU，但这是必需的
                return creep.pos.findClosestByPath(structures) as StructureContainer | StructureLink | null;
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
 * 调试函数：显示房间内容器状态和资源距离信息
 * @param room 房间对象
 */
export function debugContainersStatus(room: Room): void {
    console.log(`=== 房间 ${room.name} 容器状态报告 ===`);

    const containers = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureContainer => {
            return structure.structureType === STRUCTURE_CONTAINER;
        }
    }) as StructureContainer[];

    if (containers.length === 0) {
        console.log('房间内没有容器');
        console.log('=== 报告结束 ===');
        return;
    }

    console.log(`总容器数量: ${containers.length}`);

    // 查找房间内所有的能量源
    const sources = room.find(FIND_SOURCES);
    console.log(`能量源数量: ${sources.length}`);

    containers.forEach((container, index) => {
        const energy = container.store.getUsedCapacity(RESOURCE_ENERGY);
        const capacity = container.store.getCapacity(RESOURCE_ENERGY);
        const percentage = capacity > 0 ? (energy / capacity) * 100 : 0;
        const isNearResource = isContainerNearResource(container, room);

        // 找到最近的能量源距离
        let minDistance = Infinity;
        for (const source of sources) {
            const distance = container.pos.getRangeTo(source.pos);
            minDistance = Math.min(minDistance, distance);
        }

        console.log(`${index + 1}. 容器 ${container.id.slice(-4)}:`);
        console.log(`   - 位置: (${container.pos.x}, ${container.pos.y})`);
        console.log(`   - 能量: ${energy}/${capacity} (${percentage.toFixed(1)}%)`);
        console.log(`   - 距离最近能量源: ${minDistance === Infinity ? '未知' : minDistance} 格`);
        console.log(`   - 是否在资源点附近(3格内): ${isNearResource ? '✅ 是' : '❌ 否'}`);
        console.log(`   - 特殊状态: ${isNearResource ? '资源点容器(优先级0.5)' : '普通容器(优先级1)'}`);
    });

    console.log('=== 报告结束 ===');
}

/**
 * 显示优先级系统的能量目标信息（距离层次版本）
 * @param creep 执行任务的 creep
 * @param mode 优先级模式
 */
export function debugPriorityTargets(creep: Creep, mode: PriorityMode): void {
    console.log(`=== ${creep.name} 距离层次优先级报告 (模式: ${mode}) ===`);

    const room = creep.room;
    const energySourceType: 'container' | 'storage' | 'link' | null = creep.memory.energySourceType || null;

    // 收集所有候选目标的详细信息
    const candidateTargets: Array<{
        structure: AnyStructure;
        basePriority: number;
        effectivePriority: number;
        distance: number;
        freeCapacity: number;
        type: 'link' | 'container' | 'other';
        isNearResource?: boolean;
    }> = [];

    // 1. 收集Link信息
    const allLinks = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureLink => {
            if (structure.structureType !== STRUCTURE_LINK) return false;
            const link = structure;
            return isLinkNearResource(link, room) &&
                   link.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                   !shouldExcludeTarget(structure, energySourceType);
        }
    }) as StructureLink[];

    for (const link of allLinks) {
        const distance = creep.pos.getRangeTo(link.pos);
        const basePriority = 0;
        const effectivePriority = basePriority + distance * 3;

        candidateTargets.push({
            structure: link,
            basePriority,
            effectivePriority,
            distance,
            freeCapacity: link.store.getFreeCapacity(RESOURCE_ENERGY),
            type: 'link',
            isNearResource: isLinkNearResource(link, room)
        });
    }

    // 2. 收集容器信息
    const containers = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureContainer => {
            if (structure.structureType !== STRUCTURE_CONTAINER) return false;
            const container = structure;
            return container.store.getFreeCapacity(RESOURCE_ENERGY) > 0 &&
                   !shouldExcludeTarget(structure, energySourceType);
        }
    }) as StructureContainer[];

    for (const container of containers) {
        const distance = creep.pos.getRangeTo(container.pos);
        const isNearResource = isContainerNearResource(container, room);
        const basePriority = isNearResource ? 10 : 50;
        const effectivePriority = basePriority + distance * 1;

        candidateTargets.push({
            structure: container,
            basePriority,
            effectivePriority,
            distance,
            freeCapacity: container.store.getFreeCapacity(RESOURCE_ENERGY),
            type: 'container',
            isNearResource
        });
    }

    // 按有效优先级排序用于显示
    candidateTargets.sort((a, b) => {
        if (a.effectivePriority !== b.effectivePriority) {
            return a.effectivePriority - b.effectivePriority;
        }
        return a.distance - b.distance;
    });

    console.log(`候选目标总数: ${candidateTargets.length} (${allLinks.length}个Link, ${containers.length}个容器)`);

    if (candidateTargets.length === 0) {
        console.log('没有找到需要能量的目标');
        console.log('=== 报告结束 ===');
        return;
    }

    console.log('\n=== 候选目标详情（按有效优先级排序） ===');

    candidateTargets.forEach((target, index) => {
        const structure = target.structure;
        console.log(`${index + 1}. ${structure.structureType} ${structure.id.slice(-4)}:`);
        console.log(`   - 位置: (${structure.pos.x}, ${structure.pos.y})`);
        console.log(`   - 基础优先级: ${target.basePriority}`);
        console.log(`   - 距离: ${target.distance} 格`);
        console.log(`   - 距离惩罚: ${target.type === 'link' ? `×3 = ${target.distance * 3}` : `×1 = ${target.distance * 1}`}`);
        console.log(`   - 有效优先级: ${target.basePriority} + ${target.type === 'link' ? target.distance * 3 : target.distance * 1} = ${target.effectivePriority}`);
        console.log(`   - 空余容量: ${target.freeCapacity}`);

        if (target.type === 'container' && target.isNearResource !== undefined) {
            console.log(`   - 容器类型: ${target.isNearResource ? '资源点附近(基础10)' : '普通位置(基础50)'}`);
        } else if (target.type === 'link') {
            console.log(`   - Link状态: ${target.isNearResource ? '资源点附近' : '普通位置'} (基础0)`);
        }

        // 显示选择建议
        if (index === 0) {
            console.log(`   - 🎯 **将被选择**`);
        } else if (index === 1) {
            console.log(`   - ⚡ 备选目标`);
        }

        console.log('');
    });

    // 显示最终选择的目标
    const finalTargets = findEnergyTargetsByPriority(creep, mode);
    console.log(`=== 最终选择 ===`);
    finalTargets.forEach((target, index) => {
        const structure = target.structure;
        const distance = creep.pos.getRangeTo(structure.pos);
        console.log(`${index + 1}. ${structure.structureType} ${structure.id.slice(-4)} (距离: ${distance}, 优先级: ${target.priority})`);
    });

    console.log('=== 报告结束 ===');
}

/**
 * 调试命令：测试距离层次优先级系统
 */
export const testDistanceHierarchy = (creepName: string): void => {
    const creep = Game.creeps[creepName];
    if (!creep) {
        console.log(`找不到creep: ${creepName}`);
        return;
    }

    console.log(`\n🧪 测试距离层次优先级系统 - ${creep.name}`);
    console.log(`当前位置: (${creep.pos.x}, ${creep.pos.y})`);

    const mode = PriorityMode.IDLE_HARVESTER;
    debugPriorityTargets(creep, mode);
};
