import {
    HARVESTER_BODY,
    HARVESTER_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

let harvestRole = {
    create: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 Harvester 数量
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'harvester');

        // 如果数量不足
        if (harvesters.length < HARVESTER_COUNT && base.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {

            // 生成一个唯一的名字
            const newName = 'Harvester' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Harvester: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(HARVESTER_BODY, newName, {
                memory: {
                    role: 'harvester',
                    room: "",
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
// 移除不使用的参数 'creeps'
    run: function(creep:Creep) {
        // --- 状态切换逻辑：通过内存管理 Creep 状态 ---

        // 如果 Creep 满了，切换到转移状态
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && !creep.memory.working) {
            creep.memory.working = true;
            creep.say('⚡ 运送');
        }

        // 如果 Creep 空了，切换到采集状态
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working) {
            creep.memory.working = false;
            creep.say('⛏️ 采集');
        }

        // --- 执行任务逻辑 ---

        if (creep.memory.working) {
            // 任务：将能量转移到 Spawn
            const base = Game.spawns[MAIN_SPAWN_NAME];

            if (base) {
                // 优先将能量转移给 Spawn，或者任何需要能量的结构（如 Extension, Tower）
                // 这里我们只关注 Spawn
                const transferResult = creep.transfer(base, RESOURCE_ENERGY);

                if (transferResult === ERR_NOT_IN_RANGE) {
                    // 使用 ignoreCreeps: true 避免卡住其他 Creep
                    creep.moveTo(base, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        reusePath: 50, // 路径缓存，减少 CPU 消耗
                        ignoreCreeps: true // 避免路径被其他 Creep 堵塞（解决卡住问题的一部分）
                    });
                }
            } else {
                // 找不到基地，作为后备让它去升级 Controller
                const controller = creep.room.controller;
                if (controller) {
                    creep.moveTo(controller);
                }
            }
        } else {
            // 任务：采集能量

            // 更智能地选择目标：寻找最近的非空能量源
            const targetSource = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);

            if (targetSource) {
                const harvestResult = creep.harvest(targetSource);

                if (harvestResult === ERR_NOT_IN_RANGE) {
                    // 使用同样优化的 moveTo，确保路径选择更优
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


export default harvestRole;
