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

            // 如果没有攻击或治疗任务，则尝试修复 Road
            if (runTowerRepair(tower)) {
                // 如果 Tower 正在修复，则跳过其他任务
                continue;
            }

            // ... 其他 Tower 任务（例如：修复 Rampart, 修复墙壁, 填充能量等）
        }
    }
};

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
    const ROAD_REPAIR_THRESHOLD = 0.5; // 低于最大耐久度的 50% 就开始修

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


export default towerRole;
