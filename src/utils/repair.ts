/**
 * Builder/Repairer 角色专用的道路修复方法。
 * @param creep 当前执行任务的 Creep 对象。
 */
function repairRoads(creep: Creep): boolean {
    // 修复阈值：当 Road 的耐久度低于最大耐久度的这个比例时，才进行修复。
    // 0.8 表示低于 80% 时开始修复。
    const REPAIR_THRESHOLD = 0.8;

    // 1. 检查能量：如果能量不足，则无法修复，返回 false（应转为去采集能量）
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return false;
    }

    // 2. 查找并筛选需要修复的 Road
    // 优先从内存中查找目标ID，避免每 Tick 运行昂贵的 find 操作
    let roadToRepair: StructureRoad | null = null;

    if (creep.memory.targetRepairId) {
        roadToRepair = Game.getObjectById(creep.memory.targetRepairId) as StructureRoad;

        // 检查目标是否有效（是否存在且确实需要修复）
        if (!roadToRepair || roadToRepair.hits === roadToRepair.hitsMax) {
            roadToRepair = null;
            creep.memory.targetRepairId = null;
        }
    }

    // 3. 如果内存中没有有效目标，则查找新的目标
    if (!roadToRepair) {
        // 查找房间内所有结构，并筛选出需要修复的 Road
        const damagedRoads = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return structure.structureType === STRUCTURE_ROAD &&
                       structure.hits < structure.hitsMax * REPAIR_THRESHOLD;
            }
        }) as StructureRoad[]; // 明确断言类型

        // 如果找到损坏的 Road，选择最靠近的一个（或损坏程度最高的）
        if (damagedRoads.length > 0) {
            // 简单选择：选择距离 Creep 最近的进行修复
            roadToRepair = creep.pos.findClosestByPath(damagedRoads);

            if (roadToRepair) {
                creep.memory.targetRepairId = roadToRepair.id; // 存储到内存
            }
        }
    }

    // 4. 执行修复或移动
    if (roadToRepair) {
        const repairResult = creep.repair(roadToRepair);
        creep.say("r-Road");
        if (repairResult === ERR_NOT_IN_RANGE) {
            // 使用 creep.moveTo()，它自带路径缓存（reusePath），CPU消耗较低
            creep.moveTo(roadToRepair, { visualizePathStyle: { stroke: '#ffffff' } });
        } else if (repairResult === OK) {
            // 修复成功，继续下一个 Tick
        } else {
            // 修复失败（例如能量不足，但我们已在开头检查）
            console.log(`Creep ${creep.name} 修复 Road 失败，错误码: ${repairResult}`);
        }

        return true; // 正在执行修复任务
    }

    return false; // 没有找到需要修复的 Road
}

/**
 * Builder/Repairer 角色专用的墙壁修复方法。
 * 查找耐久度低于指定阈值的墙壁进行修复。
 * @param creep 当前执行任务的 Creep 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function repairWalls(creep: Creep): boolean {

    // 1. 定义 Wall 的目标耐久度
    // 注意：Wall 和 Rampart 的 hitsMax 非常高。通常只修复到自定义目标耐久度即可。
    // R.C.L 8 时 Wall 的最大耐久度为 3亿。这里设置一个合理的中间值作为目标。
    const WALL_TARGET_HITS = 50000; // 修复到 50,000 耐久度

    // 2. 检查能量：如果能量不足，则无法修复
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return false;
    }

    // 3. 查找需要修复的 Wall
    let wallToRepair: StructureWall | null = null;

    // 优先从内存中恢复目标
    if (creep.memory.targetRepairId) {
        const potentialTarget = Game.getObjectById(creep.memory.targetRepairId);

        // 检查目标是否是 Wall 且需要修复
        if (potentialTarget && 'structureType' in potentialTarget &&
            potentialTarget.structureType === STRUCTURE_WALL &&
            'hits' in potentialTarget &&
            potentialTarget.hits < WALL_TARGET_HITS) {
            wallToRepair = potentialTarget as StructureWall;
        } else {
            // 清除无效目标
            creep.memory.targetRepairId = null;
        }
    }

    // 4. 如果内存中没有有效目标，则查找新的目标
    if (!wallToRepair) {
        const damagedWalls = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                // 筛选条件：必须是 Wall 且耐久度低于目标值
                return structure.structureType === STRUCTURE_WALL &&
                       structure.hits < WALL_TARGET_HITS;
            }
        }) as StructureWall[];

        if (damagedWalls.length > 0) {
            // 策略：选择耐久度最低的 Wall（最紧急的）
            // 注意：findClosestByPath 可能会选择一个路径最短但耐久度较高的，
            //       我们应该优先修复最薄弱的。

            let weakestWall = damagedWalls[0];
            for (let i = 1; i < damagedWalls.length; i++) {
                if (damagedWalls[i].hits < weakestWall.hits) {
                    weakestWall = damagedWalls[i];
                }
            }

            wallToRepair = weakestWall;
            creep.memory.targetRepairId = wallToRepair.id; // 存储到内存
        }
    }

    // 5. 执行修复或移动
    if (wallToRepair) {
        const repairResult = creep.repair(wallToRepair);

        if (repairResult === ERR_NOT_IN_RANGE) {
            // 移动到 Wall 旁边
            creep.moveTo(wallToRepair, { visualizePathStyle: { stroke: '#ff0000' } });
        }

        // 如果 repairResult === OK，Creep 会继续修复
        // 如果 repairResult === ERR_NOT_ENOUGH_ENERGY，应该在任务切换逻辑中处理

        return true; // 正在执行修复 Wall 任务
    }

    return false; // 没有找到需要修复的 Wall
}

export {repairRoads};
