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

            // 优先级 3：修复结构
            if (runTowerRepair(tower)) {
                // 如果 Tower 正在修复，则跳过其他任务
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


export default towerRole;
