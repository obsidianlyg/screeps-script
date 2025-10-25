import {
    MAIN_SPAWN_NAME
} from "constant/constants";

/**
 * 计算房间内所有 Spawn 和 Extension 中当前存储的总能量。
 * @param room 要检查的 Room 对象。
 * @returns Spawn 和 Extension 中能量的总和。
 */
function getSpawnAndExtensionEnergy(room: Room | undefined): number {
    // 安全检查：如果room不存在，返回0
    if (!room) {
        console.log("警告：房间不存在，无法获取能量信息");
        return 0;
    }

    let totalEnergy = 0;

    // 查找房间内所有属于你的 Spawn 和 Extension
    const poweredStructures = room.find(FIND_MY_STRUCTURES, {
        filter: (structure) => {
            return structure.structureType === STRUCTURE_SPAWN ||
                   structure.structureType === STRUCTURE_EXTENSION;
        }
    }) as (StructureSpawn | StructureExtension)[]; // 断言类型以获取 'energy' 属性

    // 累加它们的当前能量
    for (const structure of poweredStructures) {
        // TypeScript 已经通过上面的断言知道它们有 'energy' 属性
        totalEnergy += structure.energy;
    }

    return totalEnergy;
}

function getDefaultEneryg() {
    const spawn = Game.spawns[MAIN_SPAWN_NAME];
    let totalEnergy = 0;
    if (spawn && spawn.room) {
    totalEnergy = getSpawnAndExtensionEnergy(spawn.room);
    console.log("totalEnergy:" + totalEnergy);
    } else {
    console.log("警告：无法找到spawn或spawn房间");
    }
    return totalEnergy;
}

export {getSpawnAndExtensionEnergy, getDefaultEneryg};
