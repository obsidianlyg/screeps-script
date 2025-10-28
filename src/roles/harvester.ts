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
import { findEnergyTargetsByPriority, getPriorityMode, PriorityMode } from "utils/PrioritySystem";

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
            // 使用优先级系统进行能量转移
            const isWartime = false; // 可以根据需要调整战时状态
            const mode = getPriorityMode(creep.memory.role, isWartime);
            const targets = findEnergyTargetsByPriority(creep, mode, true); // 包含 storage

            if (targets.length > 0) {
                const bestTarget = targets[0];
                const transferResult = creep.transfer(bestTarget.structure, RESOURCE_ENERGY);

                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(bestTarget.structure, {
                        visualizePathStyle: { stroke: '#ffffff' },
                        ignoreCreeps: false,
                        range: 0
                    });
                }
            } else {
                // 备用逻辑：所有需要能量的建筑都满了！去升级控制器。
                const controller = creep.room.controller;
                if (controller) {
                    creep.say('⬆️ 升级');
                    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, {
                            visualizePathStyle: { stroke: '#66ccff' },
                            ignoreCreeps: true
                        });
                    }
                }
            }
        } else {
            // 任务：采集能量

            // 检查当前分配的资源源是否枯竭
            if (creep.memory.assignedSource) {
                const assignedSource = Game.getObjectById(creep.memory.assignedSource);
                if (assignedSource && assignedSource.energy === 0) {
                    // 资源源枯竭，立即寻找附近容器存放能量
                    const nearbyContainer = creep.pos.findClosestByRange(FIND_STRUCTURES, {
                        filter: (structure) => {
                            return structure.structureType === STRUCTURE_CONTAINER &&
                                   structure.store.getFreeCapacity(RESOURCE_ENERGY) > 0;
                        }
                    }) as StructureContainer | null;

                    if (nearbyContainer && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        // 向附近容器转移能量
                        const transferResult = creep.transfer(nearbyContainer, RESOURCE_ENERGY);
                        if (transferResult === OK) {
                            console.log(`${creep.name}: 资源枯竭，成功向附近容器存放能量`);
                            // 如果能量全部存放完，重新寻找资源源
                            if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
                                creep.memory.assignedSource = null; // 清除分配，重新找资源源
                            }
                        } else if (transferResult === ERR_NOT_IN_RANGE) {
                            creep.moveTo(nearbyContainer, {
                                visualizePathStyle: { stroke: '#ff9900' }, // 橙色表示紧急存放
                                ignoreCreeps: false
                            });
                            return; // 先处理紧急存放，不采集
                        }
                    }
                }
            }

            // 去资源点采集
            findSource(creep)
        }
    }
};


export default harvestRole;
