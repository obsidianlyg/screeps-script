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
        creep.say("RR");
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

/**
 * Builder/Repairer 角色专用的容器修复方法。
 * 查找耐久度低于指定阈值的容器进行修复。
 * @param creep 当前执行任务的 Creep 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function repairContainers(creep: Creep): boolean {
    // 1. 定义 Container 的修复阈值
    const CONTAINER_REPAIR_THRESHOLD = 0.7; // 低于70%时开始修复

    // 2. 检查能量：如果能量不足，则无法修复
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return false;
    }

    // 3. 查找需要修复的 Container
    let containerToRepair: StructureContainer | null = null;

    // 优先从内存中恢复目标
    if (creep.memory.targetRepairId) {
        const potentialTarget = Game.getObjectById(creep.memory.targetRepairId);

        // 检查目标是否是 Container 且需要修复
        if (potentialTarget && 'structureType' in potentialTarget &&
            potentialTarget.structureType === STRUCTURE_CONTAINER &&
            'hits' in potentialTarget &&
            potentialTarget.hits < potentialTarget.hitsMax * CONTAINER_REPAIR_THRESHOLD) {
            containerToRepair = potentialTarget as StructureContainer;
        } else {
            // 清除无效目标
            creep.memory.targetRepairId = null;
        }
    }

    // 4. 如果内存中没有有效目标，则查找新的目标
    if (!containerToRepair) {
        const damagedContainers = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                // 筛选条件：必须是 Container 且耐久度低于阈值
                return structure.structureType === STRUCTURE_CONTAINER &&
                       structure.hits < structure.hitsMax * CONTAINER_REPAIR_THRESHOLD;
            }
        }) as StructureContainer[];

        if (damagedContainers.length > 0) {
            // 优先级策略：
            // 1. 优先修复有资源的容器（避免资源浪费）
            // 2. 其次修复耐久度最低的容器（最紧急的）
            // 3. 最后考虑距离因素

            // 按优先级排序
            const sortedContainers = damagedContainers.sort((a, b) => {
                // 计算容器的资源含量
                const resourcesA = a.store.getUsedCapacity();
                const resourcesB = b.store.getUsedCapacity();

                // 如果一个容器有资源而另一个没有，优先选有资源的
                if (resourcesA > 0 && resourcesB === 0) return -1;
                if (resourcesB > 0 && resourcesA === 0) return 1;

                // 如果都有资源或都没资源，比较耐久度（低的优先）
                const healthPercentageA = a.hits / a.hitsMax;
                const healthPercentageB = b.hits / b.hitsMax;

                if (healthPercentageA !== healthPercentageB) {
                    return healthPercentageA - healthPercentageB;
                }

                // 最后比较距离
                return creep.pos.getRangeTo(a.pos) - creep.pos.getRangeTo(b.pos);
            });

            containerToRepair = sortedContainers[0];
            creep.memory.targetRepairId = containerToRepair.id; // 存储到内存
        }
    }

    // 5. 执行修复或移动
    if (containerToRepair) {
        const repairResult = creep.repair(containerToRepair);
        creep.say("RC"); // Repair Container

        if (repairResult === ERR_NOT_IN_RANGE) {
            // 移动到 Container 旁边
            creep.moveTo(containerToRepair, {
                visualizePathStyle: { stroke: '#ffaa00' },
                maxOps: 1000,
                heuristicWeight: 1.2
            });
        } else if (repairResult === OK) {
            // 修复成功，继续下一个 Tick
            // 可以添加日志来跟踪修复进度
            const healthPercentage = ((containerToRepair.hits / containerToRepair.hitsMax) * 100).toFixed(1);
            creep.say(`RC ${healthPercentage}%`);
        } else if (repairResult === ERR_NOT_ENOUGH_RESOURCES) {
            // 能量不足，清除目标让creep去获取能量
            creep.memory.targetRepairId = null;
            return false;
        } else {
            console.log(`Creep ${creep.name} 修复 Container 失败，错误码: ${repairResult}`);
        }

        return true; // 正在执行修复 Container 任务
    }

    return false; // 没有找到需要修复的 Container
}

/**
 * Builder/Repairer 角色专用的存储修复方法。
 * 修复 Storage 和 Terminal 等高级存储结构。
 * @param creep 当前执行任务的 Creep 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function repairStorage(creep: Creep): boolean {
    // 1. 定义 Storage 的修复阈值
    const STORAGE_REPAIR_THRESHOLD = 0.8; // 低于80%时开始修复

    // 2. 检查能量：如果能量不足，则无法修复
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return false;
    }

    // 3. 查找需要修复的 Storage/Terminal
    let storageToRepair: (StructureStorage | StructureTerminal) | null = null;

    // 优先从内存中恢复目标
    if (creep.memory.targetRepairId) {
        const potentialTarget = Game.getObjectById(creep.memory.targetRepairId);

        // 检查目标是否是 Storage/Terminal 且需要修复
        if (potentialTarget && 'structureType' in potentialTarget &&
            (potentialTarget.structureType === STRUCTURE_STORAGE ||
             potentialTarget.structureType === STRUCTURE_TERMINAL) &&
            'hits' in potentialTarget &&
            potentialTarget.hits < potentialTarget.hitsMax * STORAGE_REPAIR_THRESHOLD) {
            storageToRepair = potentialTarget as StructureStorage | StructureTerminal;
        } else {
            // 清除无效目标
            creep.memory.targetRepairId = null;
        }
    }

    // 4. 如果内存中没有有效目标，则查找新的目标
    if (!storageToRepair) {
        const damagedStorages = creep.room.find(FIND_STRUCTURES, {
            filter: (structure) => {
                return (structure.structureType === STRUCTURE_STORAGE ||
                       structure.structureType === STRUCTURE_TERMINAL) &&
                       structure.hits < structure.hitsMax * STORAGE_REPAIR_THRESHOLD;
            }
        }) as (StructureStorage | StructureTerminal)[];

        if (damagedStorages.length > 0) {
            // 优先修复有更多资源的存储结构
            const sortedStorages = damagedStorages.sort((a, b) => {
                const totalResourcesA = a.store.getUsedCapacity();
                const totalResourcesB = b.store.getUsedCapacity();
                return totalResourcesB - totalResourcesA; // 降序排序
            });

            storageToRepair = sortedStorages[0];
            creep.memory.targetRepairId = storageToRepair.id; // 存储到内存
        }
    }

    // 5. 执行修复或移动
    if (storageToRepair) {
        const repairResult = creep.repair(storageToRepair);
        creep.say("RS"); // Repair Storage

        if (repairResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(storageToRepair, {
                visualizePathStyle: { stroke: '#00ff00' }
            });
        } else if (repairResult === OK) {
            const healthPercentage = ((storageToRepair.hits / storageToRepair.hitsMax) * 100).toFixed(1);
            creep.say(`RS ${healthPercentage}%`);
        }

        return true; // 正在执行修复 Storage 任务
    }

    return false; // 没有找到需要修复的 Storage
}

/**
 * 通用修复方法，按优先级修复所有类型的结构
 * 优先级：Container > Storage/Terminal > Road > Wall/Rampart
 * @param creep 当前执行任务的 Creep 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function repairAll(creep: Creep): boolean {
    // 检查能量
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        return false;
    }

    // 按优先级尝试不同类型的修复
    // 1. 首先修复容器（最重要的存储结构）
    if (repairContainers(creep)) {
        return true;
    }

    // 2. 修复存储结构
    if (repairStorage(creep)) {
        return true;
    }

    // 3. 修复道路
    if (repairRoads(creep)) {
        return true;
    }

    // 4. 最后修复墙壁
    if (repairWalls(creep)) {
        return true;
    }

    return false; // 没有找到需要修复的结构
}

export { repairRoads, repairContainers, repairStorage, repairAll };
