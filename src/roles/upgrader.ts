import {
    UPGRADER_BODY,
    UPGRADER_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

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
                    working: false
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
                // 使用非空断言 ! 必须确保 controller 存在
                if (creep.upgradeController(controller) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#66ccff' },
                        reusePath: 50,
                        ignoreCreeps: true
                    });
                }
            }
        } else {
            // 任务：采集能量

            // Upgrader 也可以从 Container/Storage 取能量，这里简化为从 Source 采集
            const targetSource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

            if (targetSource) {
                if (creep.harvest(targetSource) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetSource, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        reusePath: 50,
                        ignoreCreeps: true
                    });
                }
            }
        }
    }
};


export default upgradeRole;
