import {
    UPGRADER_BODY,
    UPGRADER_COUNT,
    BIG_COMMON_BODY,
    BIG_UPGRADE_COUNT,
    BIG_ENERYG,
    MAIN_SPAWN_NAME
} from "constant/constants";

import findSource from "utils/FindSource";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

let upgradeRole = {
    create: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 upgrader 数量
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader');

        // 如果数量不足
        if (upgraders.length < UPGRADER_COUNT && base.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {

            // 生成一个唯一的名字
            const newName = 'Upgrader' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Upgrader: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(UPGRADER_BODY, newName, {
                memory: {
                    role: 'upgrader',
                    room: "",
                    working: false,
                    assignedSource: null  // 添加资源源分配字段
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 upgrader。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
                // console.log(`Spawn 正在忙碌。`);
            } else {
                console.log(`生成 Creep 时发生错误: ${result}`);
            }
        }
    },
    createBig: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 upgrader 数量
        const upgraders = _.filter(Game.creeps, (creep) => creep.memory.role === 'upgrader');

        // 如果数量不足
        if (upgraders.length < BIG_UPGRADE_COUNT && getDefaultEneryg() >= BIG_ENERYG) {

            // 生成一个唯一的名字
            const newName = 'Upgrader' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Upgrader: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(BIG_COMMON_BODY, newName, {
                memory: {
                    role: 'upgrader',
                    room: "",
                    working: false,
                    assignedSource: null  // 添加资源源分配字段
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 upgrader。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
                // console.log(`Spawn 正在忙碌。`);
            } else {
                console.log(`生成 Creep 时发生错误: ${result}`);
            }
        }
    },
    // 移除不使用的参数 'creeps'
    run: function(creep:Creep) {
        // 初始化内存字段（为了兼容旧的creep）
        if (creep.memory.assignedSource === undefined) {
            creep.memory.assignedSource = null;
        }

        // --- 状态切换逻辑 ---

        // 内存中通常用 'upgrading' 状态来区分
        // 如果 Creep 满了，切换到升级状态
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && !creep.memory.working) {
            creep.memory.working = true;
            creep.say('⬆️ 升级');
        }

        // 如果 Creep 空了，切换到采集状态
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working) {
            creep.memory.working = false;
            creep.say('⛏️ 采集');
        }

        // --- 执行任务逻辑 ---

        if (creep.memory.working) {
            // 任务：升级 Controller
            const controller = creep.room.controller;

            if (controller) { // 安全检查
                const upgradeResult = creep.upgradeController(controller);
                if (upgradeResult == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#66ccff' },
                        ignoreCreeps: false,
                        maxOps: 1000,
                        heuristicWeight: 1.2
                    });
                }
            } else {
                console.log(`Upgrader ${creep.name}: 找不到controller！`);
            }
        } else {
            // 任务：采集能量

            // 去资源点采集
            findSource(creep)
        }
    }
};


export default upgradeRole;
