import {
    HARVESTER_BODY,
    BIG_COMMON_BODY,
    HARVESTER_COUNT,
    BIG_HARVEST_COUNT,
    BIG_ENERYG,
    BIG_COMMON_BODY_TMP,
    BIG_ENERYG_TMP,
    MAIN_SPAWN_NAME
} from "constant/constants";

import findSource from "utils/FindSource";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";
import { handleStuckDetection } from "utils/StuckDetection";

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
    createBig: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 big_harvester 数量
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'big_harvester');

        // 如果数量不足
        if (harvesters.length < BIG_HARVEST_COUNT && getDefaultEneryg() >= BIG_ENERYG_TMP) {

            // 生成一个唯一的名字
            const newName = 'big_harvester' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 big_harvester: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(BIG_COMMON_BODY_TMP, newName, {
                memory: {
                    role: 'big_harvester',
                    room: "",
                    working: false
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 big_harvester。`);
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

            // 1. 查找所有需要能量的关键结构 (Spawn, Extension, Tower)
            const criticalTargets = creep.room.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    // 筛选出所有有空闲容量的 Spawn, Extension 和 Tower
                    return (structure.structureType === STRUCTURE_SPAWN ||
                            structure.structureType === STRUCTURE_EXTENSION ||
                            structure.structureType === STRUCTURE_TOWER) &&
                        structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                }
            });

            let target: AnyStructure | null = null;
            // 2. 如果存在需要能量的关键结构，则进行优先级排序
            if (criticalTargets.length > 0) {

                // (可选) 优先级排序：Spawn > Extension > Tower
                // 确保 Creep 总是去最高优先级的最近目标
                criticalTargets.sort((a, b) => {
                    let priorityA = a.structureType === STRUCTURE_SPAWN ? 1 : a.structureType === STRUCTURE_EXTENSION ? 2 : 3;
                    let priorityB = b.structureType === STRUCTURE_SPAWN ? 1 : b.structureType === STRUCTURE_EXTENSION ? 2 : 3;
                    if (priorityA !== priorityB) return priorityA - priorityB;
                    return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
                });

                target = criticalTargets[0];

            } else {
                // 3. 如果所有关键结构都满了，查找 Container 或 Storage (长期存储)
                target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
                    filter: (s) => (s.structureType === STRUCTURE_CONTAINER ||
                                    s.structureType === STRUCTURE_STORAGE) &&
                                s.store.getFreeCapacity(RESOURCE_ENERGY) > 0
                });
            }

            if (target) {
                // 向找到的目标结构转移能量
                const transferResult = creep.transfer(target, RESOURCE_ENERGY);

                if (transferResult === ERR_NOT_IN_RANGE) {
                    // 添加卡住检测机制
                    if (handleStuckDetection(creep, target, 'harvesterTransferPosition', 5)) {
                        return; // 绕路移动结束本轮
                    }

                    // 使用 ignoreCreeps: true 避免卡住其他 Creep
                    creep.moveTo(target, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        ignoreCreeps: true // 避免路径被其他 Creep 堵塞（解决卡住问题的一部分）
                    });
                }
            } else {
                // 5. 备用逻辑：所有需要能量的建筑都满了！去升级控制器。
                const controller = creep.room.controller;
                if (controller) {
                    creep.say('⬆️ 升级');
                    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                        // 添加卡住检测机制
                        if (handleStuckDetection(creep, controller, 'harvesterUpgradePosition', 5)) {
                            return; // 绕路移动结束本轮
                        }

                        // 使用优化后的 moveTo
                        creep.moveTo(controller, {
                            visualizePathStyle: { stroke: '#66ccff' },
                            ignoreCreeps: true
                        });
                    }
                }
            }
        } else {
            // 任务：采集能量

            // 去资源点采集
            findSource(creep)
        }
    }
};


export default harvestRole;
