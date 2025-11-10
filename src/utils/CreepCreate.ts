import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";
import { findEnergyTargetsByPriority, getPriorityMode, PriorityMode } from "utils/PrioritySystem";

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    createBodyParts,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from '../utils/BodyUtils';

let creepCreate = {
  createByParam: function(param: CreepParam) {
        const spawnName = param.spawn;
        const body = createBodyParts(param.conf);
        const energyLimit = calculateBodyCost(body);
        const count = param.count;
        const role = param.role;
        const room = param.room;

        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 统计当前 role 数量
        const creeps = _.filter(Game.creeps, (creep) => creep.memory.role === role + spawnName && creep.memory.room == room);


        // 如果数量不足
        if (creeps.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {

            // 生成一个唯一的名字
            const newName = role + '_' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 ${role}: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: role + spawnName,
                    room: room,
                    working: false
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 Harvester。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
                // console.log(`Spawn 正在忙碌。`);
            } else {
                console.log(`生成 Creep 时发生错误: ${result}`);
            }
        }
    },
}

export default creepCreate;
