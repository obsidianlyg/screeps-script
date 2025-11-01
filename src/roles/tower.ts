import {
    HARVESTER_BODY,
    BIG_COMMON_BODY,
    HARVESTER_COUNT,
    BIG_HARVEST_COUNT,
    BIG_ENERYG,
    MAIN_SPAWN_NAME
} from "constant/constants";

import findSource from "utils/FindSource";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

let towerRole = {
    run: function(room: Room): void {
            // 将此逻辑应用于房间内的所有 Tower
        const towers = room.find(FIND_MY_STRUCTURES, {
            filter: { structureType: STRUCTURE_TOWER }
        }) as StructureTower[];

        for (const tower of towers) {
            // Tower 的优先任务通常是 1. 攻击 2. 治疗 3. 修复
            // 这里假设攻击和治疗逻辑已先于此运行。

            // 优先级 1：攻击是最高优先级
            if (runTowerAttack(tower)) {
                continue;
            }

            // 优先级 2：治疗友方 Creep
            if (runTowerHeal(tower)) {
                continue;
            }

            // 优先级 3：容器
            if (runTowerRepairContainer(tower)) {
                continue;
            }

            // 优先级 4：存储桶
            if (runTowerRepairStorage(tower)) {
                continue;
            }

            // 优先级 5：修复道路
            if (runTowerRepair(tower)) {
                continue;
            }

            // 优先级 6：修城墙
            if (runTowerRepairWall(tower)) {
                continue;
            }


            // ... 其他 Tower 任务（例如：修复 Rampart, 修复墙壁, 填充能量等）
        }
    }
};

/**
 * Tower 的攻击逻辑：查找并攻击敌对目标。
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 攻击是否正在进行。
 */
function runTowerAttack(tower: StructureTower): boolean {

    // 1. 查找敌对 Creep（非我方或非友方）
    const hostileCreeps = tower.room.find(FIND_HOSTILE_CREEPS);

    if (hostileCreeps.length > 0) {
        // 2. 选择攻击目标
        // 策略：选择距离最近的敌对 Creep（通常最快到达房间）
        const target = tower.pos.findClosestByRange(hostileCreeps);

        if (target) {
            const attackResult = tower.attack(target);

            if (attackResult === OK) {
                return true; // 正在攻击
            } else {
                // 如果攻击失败（例如：能量不足，错误码 ERR_NOT_ENOUGH_ENERGY）
                // 可以选择在这里添加日志，但通常 Tower 能量不足会由其他系统处理
            }
        }
    }

    return false; // 没有找到攻击目标
}

/**
 * Tower 的治疗逻辑：查找并治疗受损的友方 Creep。
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 治疗是否正在进行。
 */
function runTowerHeal(tower: StructureTower): boolean {

    // 1. 查找所有我方 Creep
    const myCreeps = tower.room.find(FIND_MY_CREEPS);

    // 2. 筛选出需要治疗的目标
    const damagedCreeps = myCreeps.filter(creep => {
        // 筛选条件：当前生命值低于最大生命值
        return creep.hits < creep.hitsMax;
    });

    if (damagedCreeps.length > 0) {
        // 3. 选择治疗目标
        // 策略：选择生命值百分比最低（最危险）的 Creep 进行治疗
        let lowestHitsRatio = 1;
        let targetCreep: Creep | null = null;

        for (const creep of damagedCreeps) {
            const hitsRatio = creep.hits / creep.hitsMax;

            if (hitsRatio < lowestHitsRatio) {
                lowestHitsRatio = hitsRatio;
                targetCreep = creep;
            }
        }

        // 4. 执行治疗
        if (targetCreep) {
            const healResult = tower.heal(targetCreep);

            if (healResult === OK) {
                return true; // 正在治疗
            }
        }
    }

    return false; // 没有找到需要治疗的目标
}

/**
 * Tower 的主要维修逻辑。
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 修复是否正在进行。
 */
function runTowerRepair(tower: StructureTower): boolean {

    // 1. 检查 Tower 是否有足够的能量
    // 修复和攻击都需要能量。通常，如果 Tower 能量太低，应优先保留能量用于攻击。
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < 300) {
        return false; // 能量不足，不进行维修
    }

    // 2. 定义修复的优先级和阈值
    // Road 的修复优先级通常低于 Rampart 或 Wall。
    // 我们设定一个较低的 Road 修复阈值（例如低于 50% 或 10,000 hits）来节省能量。
    const ROAD_REPAIR_THRESHOLD = 0.7; // 低于最大耐久度的 50% 就开始修

    // 3. 查找需要修复的 Road
    const damagedRoads = tower.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            // 必须是 Road，并且耐久度低于阈值
            return structure.structureType === STRUCTURE_ROAD &&
                   structure.hits < structure.hitsMax * ROAD_REPAIR_THRESHOLD;
        }
    }) as StructureRoad[]; // 断言类型

    if (damagedRoads.length > 0) {

        // 4. 选择最佳修复目标

        // 策略：选择耐久度百分比最低的 Road，优先修复损坏最严重的。
        let lowestHitsRatio = 1;
        let targetRoad: StructureRoad | null = null;

        for (const road of damagedRoads) {
            const hitsRatio = road.hits / road.hitsMax;

            if (hitsRatio < lowestHitsRatio) {
                lowestHitsRatio = hitsRatio;
                targetRoad = road;
            }
        }

        // 5. 执行修复
        if (targetRoad) {
            const repairResult = tower.repair(targetRoad);

            if (repairResult === OK) {
                // 修复成功
                return true;
            } else {
                // 修复失败，例如目标太远 (Tower的范围有限)
                // console.log(`Tower ${tower.id} 修复失败，错误码: ${repairResult}`);
            }
        }
    }

    return false; // 没有找到需要修复的 Road
}

/**
 * Tower 的通用结构修复逻辑。
 * 优先级：修复受损比例最低的结构（最紧急）
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function runTowerRepairWall(tower: StructureTower): boolean {

    // 1. 检查 Tower 是否有足够的能量
    // 修复需要能量。如果能量太低，应优先保留用于攻击。
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < 300) {
        return false;
    }

    // 2. 定义修复目标耐久度（针对 Walls/Ramparts）
    // 只有低于这个值才会被 Tower 视为修复目标。
    const DEFENSE_TARGET_HITS = 100000; // 目标修复到 50,000 hits

    // 3. 查找所有需要修复的结构
    const structuresToRepair = tower.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            // 筛选条件：

            // A. Wall 或 Rampart 必须低于目标 hits
            if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                return structure.hits < DEFENSE_TARGET_HITS;
            }

            // B. Roads 必须低于 hitsMax 的 50%
            if (structure.structureType === STRUCTURE_ROAD) {
                 return structure.hits < structure.hitsMax * 0.5;
            }

            // C. 其他结构（如 Container, Link 等）必须低于满耐久度的 90%
            if (structure.hits < structure.hitsMax * 0.9) {
                // 排除墙壁、道路和控制器 (避免 Tower 误修)
                return structure.structureType !== STRUCTURE_CONTROLLER;
            }

            return false;
        }
    });

    if (structuresToRepair.length > 0) {

        // 4. 选择最佳修复目标

        // 策略：选择耐久度百分比最低的结构（最紧急）进行修复
        let target: AnyStructure | null = null;
        let lowestHitsRatio = 1;

        for (const structure of structuresToRepair) {
            let hitsRatio;

            // 对于 Walls/Ramparts，我们只关心它是否低于 DEFENSE_TARGET_HITS
            if (structure.structureType === STRUCTURE_WALL || structure.structureType === STRUCTURE_RAMPART) {
                hitsRatio = structure.hits / DEFENSE_TARGET_HITS; // 使用目标值作为分母
            } else {
                hitsRatio = structure.hits / structure.hitsMax; // 使用 Max hits 作为分母
            }

            if (hitsRatio < lowestHitsRatio) {
                lowestHitsRatio = hitsRatio;
                target = structure;
            }
        }

        // 5. 执行修复
        if (target) {
            const repairResult = tower.repair(target);

            if (repairResult === OK) {
                return true; // 正在修复
            }
        }
    }

    return false; // 没有找到需要修复的目标
}

/**
 * Tower 的 Container 专用修复逻辑：查找并修复耐久度低于阈值的 Container。
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function runTowerRepairContainer(tower: StructureTower): boolean {

    // 1. 检查 Tower 是否有足够的能量（可以根据需要调整这个阈值）
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < 100) {
        return false;
    }

    // 2. 定义修复阈值：当 Container 的耐久度低于最大耐久度的 80% 时开始修复
    const CONTAINER_REPAIR_THRESHOLD = 0.8;

    // 3. 查找所有需要修复的 Container
    const damagedContainers = tower.room.find(FIND_STRUCTURES, {
        filter: (structure) => {
            return structure.structureType === STRUCTURE_CONTAINER &&
                   structure.hits < structure.hitsMax * CONTAINER_REPAIR_THRESHOLD;
        }
    }) as StructureContainer[]; // 明确断言类型

    if (damagedContainers.length > 0) {

        // 4. 选择最佳修复目标

        // 策略：选择耐久度百分比最低（最紧急）的 Container
        let targetContainer: StructureContainer | null = null;
        let lowestHitsRatio = 1;

        for (const container of damagedContainers) {
            const hitsRatio = container.hits / container.hitsMax;

            if (hitsRatio < lowestHitsRatio) {
                lowestHitsRatio = hitsRatio;
                targetContainer = container;
            }
        }

        // 5. 执行修复
        if (targetContainer) {
            const repairResult = tower.repair(targetContainer);

            if (repairResult === OK) {
                return true; // 正在修复
            }
            // 失败（如能量不足，但已在开头检查）则会返回 false
        }
    }

    return false; // 没有找到需要修复的 Container
}

/**
 * Tower 的 Storage 专用修复逻辑：查找并修复耐久度低于阈值的 Storage。
 * @param tower 要操作的 Tower 对象。
 * @returns boolean 修复任务是否正在进行。
 */
function runTowerRepairStorage(tower: StructureTower): boolean {

    // 1. 检查 Tower 是否有足够的能量
    // Storage 非常重要，即使能量不多，也可以考虑修复，但这里我们保留检查。
    if (tower.store.getUsedCapacity(RESOURCE_ENERGY) < 100) {
        return false;
    }

    // 2. 定义修复阈值：Storage 具有很高的 hitsMax (例如 1,000,000)。
    // 我们设定一个较高的百分比阈值，以确保 Storage 始终接近满血。
    const STORAGE_REPAIR_THRESHOLD = 0.95; // 低于 95% 的耐久度就开始修复

    // 3. 查找需要修复的 Storage
    // 由于一个房间通常只有一个 Storage，我们可以直接查找并检查它。
    const storage = tower.room.storage; // 直接获取房间的 Storage 对象

    if (storage) {
        // 检查 Storage 是否需要修复
        if (storage.hits < storage.hitsMax * STORAGE_REPAIR_THRESHOLD) {

            // 4. 执行修复
            const repairResult = tower.repair(storage);

            if (repairResult === OK) {
                return true; // 正在修复
            } else {
                // 如果失败（例如：目标超出 Tower 范围，虽然 Storage 通常在中心）
                // console.log(`Tower ${tower.id} 修复 Storage 失败，错误码: ${repairResult}`);
            }
        }
    }

    return false; // 没有找到需要修复的 Storage
}


export default towerRole;
