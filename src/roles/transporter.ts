import {
    CARRIER_BODY,
    TRANSPORTER_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

import { transportEnergy, needsEnergyTransport } from "utils/EnergyTransport";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

let transporterRole = {
    create: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 transporter 数量
        const transporters = _.filter(Game.creeps, (creep) => creep.memory.role === 'transporter');

        // 如果数量不足且能量足够，创建新的 transporter
        if (transporters.length < TRANSPORTER_COUNT && base.store.getUsedCapacity(RESOURCE_ENERGY) >= 150) {
            const newName = 'Transporter' + Game.time;

            console.log(`尝试生成新的 Transporter: ${newName}`);

            const result = base.spawnCreep(CARRIER_BODY, newName, {
                memory: {
                    role: 'transporter',
                    room: MAIN_SPAWN_NAME,
                    working: false,
                    transportTarget: null,
                    isGettingEnergy: false
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 transporter。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成 Transporter 时发生错误: ${result}`);
            }
        }
    },

    createBySpawn: function(spawnName: string, energyLimit: number, count: number, body: BodyPartConstant[]) {
        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 统计当前 transporter 数量
        const transporters = _.filter(Game.creeps, (creep) => creep.memory.role === 'transporter' + spawnName);

        // 如果数量不足且能量足够，创建新的 transporter
        if (transporters.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {
            const newName = 'Transporter' + Game.time;

            console.log(`尝试生成新的 Transporter: ${newName}`);

            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'transporter' + spawnName,
                    room: spawnName,
                    working: false,
                    transportTarget: null,
                    isGettingEnergy: false
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 transporter。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成 Transporter 时发生错误: ${result}`);
            }
        }
    },

    run: function(creep: Creep) {
        // 初始化内存字段
        if (creep.memory.transportTarget === undefined) {
            creep.memory.transportTarget = null;
        }
        if (creep.memory.isGettingEnergy === undefined) {
            creep.memory.isGettingEnergy = false;
        }

        // 执行能量搬运任务
        const isWorking = transportEnergy(creep);

        // 如果没有搬运任务，让 creep 闲置
        if (!isWorking) {
            creep.say('💤 闲置');

            // 可以让闲置的 creep 去帮助升级控制器或者做其他有用的事情
            const controller = creep.room.controller;
            if (controller && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                creep.say('⬆️ 升级');
                if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#cccccc' },
                        ignoreCreeps: true
                    });
                }
            } else {
                // 移动到房间中心附近等待
                const centerPos = new RoomPosition(25, 25, creep.room.name);
                if (creep.pos.getRangeTo(centerPos) > 5) {
                    creep.moveTo(centerPos, {
                        visualizePathStyle: { stroke: '#cccccc' },
                        ignoreCreeps: true
                    });
                }
            }
        }
    }
};

export default transporterRole;
