import {
    BUILDER_BODY,
    BUILDER_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

let builderRole = {
    create: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 Harvester 数量
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder');

        // 如果数量不足
        if (builders.length < BUILDER_COUNT && base.store.getUsedCapacity(RESOURCE_ENERGY) >= 200) {

            // 生成一个唯一的名字
            const newName = 'Builder' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Builder: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(BUILDER_BODY, newName, {
                memory: {
                    role: 'builder',
                    room: "",
                    working: false
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 builder。`);
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
        // --- 卡住检测和恢复 ---
        if (!creep.memory.stuck) {
            creep.memory.stuck = { pos: creep.pos, time: Game.time };
        } else {
            // 如果creep在同一个位置停留太久，清除路径缓存
            if (creep.pos.isEqualTo(creep.memory.stuck.pos) &&
                Game.time - creep.memory.stuck.time > 10) {
                creep.memory.stuck = { pos: creep.pos, time: Game.time };
                // 强制重新计算路径
                delete creep.memory._move;
                creep.say('🔄 重新寻路');
            } else if (!creep.pos.isEqualTo(creep.memory.stuck.pos)) {
                // 位置变化，更新记录
                creep.memory.stuck = { pos: creep.pos, time: Game.time };
            }
        }

        // --- 状态切换逻辑：通过内存管理 Creep 状态 ---

        // 默认状态：建造 (building: true)

        // 1. 如果 Creep 能量空了 (<= 0)，切换到 "取能量" 状态
        if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0 && creep.memory.working) {
            creep.memory.working = false;
            creep.say('⚡ 取能量');
        }

        // 2. 如果 Creep 满了，切换到 "建造" 状态
        // 我们只要求它至少带一些能量，但让它装满会更有效率
        if (creep.store.getFreeCapacity(RESOURCE_ENERGY) === 0 && !creep.memory.working) {
            creep.memory.working = true;
            creep.say('🛠️ 建造');
        }

        // --- 执行任务逻辑 ---

        if (creep.memory.working) {
            // 任务：建造工地

            // 1. 查找目标工地
            // 查找房间内距离最近的工地
            const targetSite = creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES);

            if (targetSite) {
                // 尝试建造
                const buildResult = creep.build(targetSite);

                if (buildResult === ERR_NOT_IN_RANGE) {
                    // 移动到工地
                    creep.moveTo(targetSite, {
                        visualizePathStyle: { stroke: '#00ff2aff' },
                        reusePath: 50,
                        ignoreCreeps: true
                    });
                }
            } else {
                // 如果没有工地可建，让 Builder 闲置下来做点别的事情 (比如升级 Controller)
                const controller = creep.room.controller;
                if (controller) {
                    creep.say('暂歇');
                    // 移动到 Controller 附近等待新工地
                    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, { reusePath: 50, ignoreCreeps: true });
                    }
                }
            }
        } else {
            // 任务：取回能量

            // 优先从 Container/Storage 取能量，效率比采 Source 高
            // 查找最近的 Storage/Container
            const energySource = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                                s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
            });

            if (energySource) {
                // 从 Container/Storage 取能量
                if (creep.withdraw(energySource, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(energySource, {
                        visualizePathStyle: { stroke: '#ffaa00' },
                        reusePath: 50,
                        ignoreCreeps: true
                    });
                }
            } else {
                // 如果没有 Container/Storage，就 fallback 到从 Source 采集
                const source = creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE);
                if (source) {
                    if (creep.harvest(source) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(source, {
                            visualizePathStyle: { stroke: '#ffaa00' },
                            reusePath: 50,
                            ignoreCreeps: true
                        });
                    }
                }
            }
        }
    }
};


export default builderRole;
