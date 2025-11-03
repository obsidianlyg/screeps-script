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

    createBySpawn: function(spawnName: string, energyLimit: number, count: number, body: BodyPartConstant[], modeStr: string) {
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
                    isGettingEnergy: false,
                    transportMode: modeStr
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

    /**
     * 搬运矿资源的方法
     * @param creep 运输者
     * @param mineralType 要搬运的矿物类型 (RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, etc.)
     * @param sourceRoomName 源房间名称
     * @param targetRoomName 目标房间名称
     */
    transportMineral: function(creep: Creep, mineralType: ResourceConstant, sourceRoomName?: string, targetRoomName?: string) {
        // 初始化内存字段
        if (!creep.memory.mineralTarget) {
            creep.memory.mineralTarget = null;
        }
        if (!creep.memory.isGettingMineral) {
            creep.memory.isGettingMineral = false;
        }

        const currentRoom = creep.room;
        const sourceRoom = sourceRoomName ? Game.rooms[sourceRoomName] : currentRoom;
        const targetRoom = targetRoomName ? Game.rooms[targetRoomName] : currentRoom;

        // 检查是否有矿资源可以搬运
        if (!creep.memory.isGettingMineral && creep.store.getUsedCapacity(mineralType) === 0) {
            creep.memory.isGettingMineral = true;
            creep.say('⛏️ 取矿');
        }

        // 如果已经装满了矿物，切换到运输状态
        if (creep.memory.isGettingMineral && creep.store.getFreeCapacity(mineralType) === 0) {
            creep.memory.isGettingMineral = false;
            creep.say('🚚 运矿');
            creep.memory.mineralTarget = null; // 清除目标缓存
        }

        // --- 执行任务逻辑 ---
        if (creep.memory.isGettingMineral) {
            // 任务：从源位置获取矿物

            // 如果不在源房间，先移动到源房间
            if (sourceRoomName && creep.room.name !== sourceRoomName) {
                creep.say('🚶 去源房间');
                // 验证房间名称是否有效
                if (sourceRoomName && /^[EW]\d+[NS]\d+$/.test(sourceRoomName)) {
                    creep.moveTo(new RoomPosition(25, 25, sourceRoomName), {
                        visualizePathStyle: { stroke: '#ff9900' },
                        reusePath: 50
                    });
                } else {
                    console.log(`${creep.name}: 无效的源房间名称: ${sourceRoomName}`);
                }
                return;
            }

            // 查找包含指定矿物的容器或存储
            const mineralContainers = sourceRoom.find(FIND_STRUCTURES, {
                filter: (structure) => {
                    return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
                           structure.store.getUsedCapacity(mineralType) > 0;
                }
            });

            // 查找矿物本身（如果矿物还未被开采到容器中）
            const minerals = sourceRoom.find(FIND_MINERALS, {
                filter: (mineral) => mineral.mineralType === mineralType && mineral.mineralAmount > 0
            });

            let targetSource: any = null;

            if (mineralContainers.length > 0) {
                // 优先从容器/存储中获取矿物
                targetSource = creep.pos.findClosestByPath(mineralContainers);
                creep.say('📦 容器取矿');
            } else if (minerals.length > 0) {
                // 如果没有容器，直接从矿物源获取（需要矿工先开采）
                targetSource = minerals[0];
                // creep.say('⛏️ 矿物源');
            }

            if (targetSource) {
                const withdrawResult = creep.withdraw(targetSource, mineralType);
                if (withdrawResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetSource, {
                        visualizePathStyle: { stroke: '#ff9900' },
                        reusePath: 30
                    });
                } else if (withdrawResult === OK) {
                    console.log(`${creep.name}: 成功获取 ${mineralType}`);
                } else if (withdrawResult === ERR_INVALID_TARGET) {
                    // 如果目标是矿物本身而不是容器，需要等待矿工开采
                    // creep.say('⏳');
                    // 移动到矿物附近等待
                    creep.moveTo(targetSource, { range: 2 });
                } else {
                    console.log(`${creep.name}: 获取矿物失败，错误码=${withdrawResult}`);
                }
            } else {
                creep.say('❌ 无矿物');
                // 如果没有找到矿物源，回到房间中心等待
                const centerPos = new RoomPosition(25, 25, creep.room.name);
                creep.moveTo(centerPos, { ignoreCreeps: true });
            }
        } else {
            // 任务：将矿物运输到目标位置

            // 如果不在目标房间，先移动到目标房间
            if (targetRoomName && creep.room.name !== targetRoomName) {
                creep.say('🚶 去目标房间');
                // 验证房间名称是否有效
                if (targetRoomName && /^[EW]\d+[NS]\d+$/.test(targetRoomName)) {
                    creep.moveTo(new RoomPosition(25, 25, targetRoomName), {
                        visualizePathStyle: { stroke: '#00ff99' },
                        reusePath: 50
                    });
                } else {
                    console.log(`${creep.name}: 无效的目标房间名称: ${targetRoomName}`);
                }
                return;
            }

            // 查找目标存储位置（按优先级排序）
            // 手动定义一个所有具有 .store 属性的结构类型列表
            // 注意：Tombstone, Creep, Resource 也具有 store 属性，但它们不是 FIND_MY_STRUCTURES 的结果
            const STORE_STRUCTURE_TYPES = [
                STRUCTURE_STORAGE,
                STRUCTURE_TERMINAL,
                STRUCTURE_FACTORY,
                STRUCTURE_LAB
                // 如果您确定房间内只有您自己的 CONTAINER 且您想包含它，可以添加 STRUCTURE_CONTAINER
            ] as const; // 使用 const 确保类型是字面量数组

            // 运行时，筛选函数
            const targetStructures = targetRoom.find(FIND_MY_STRUCTURES).filter((structure) => {

                // 1. 检查结构类型是否在我们的目标列表中
                const isTargetType = STORE_STRUCTURE_TYPES.includes(structure.structureType as any);

                if (isTargetType) {
                    // 2. 使用类型保护检查结构是否具有 .store 属性
                    // 尽管我们知道这些类型有 store，但通过检查 store 属性是否存在，
                    // 我们可以安全地将其视为 AnyStoreStructure 类型
                    const hasStore = 'store' in structure;

                    if (hasStore) {
                        // 现在可以安全地将结构断言为 AnyStoreStructure 或更具体的类型
                        const storeStructure = structure as AnyStoreStructure;

                        // 3. 检查是否有足够的空间容纳矿物
                        const freeCapacity = storeStructure.store.getFreeCapacity(mineralType);

                        // 检查 freeCapacity 是否不是 null (即该结构可以存储这种矿物)
                        // 并且容量大于 0
                        if (freeCapacity !== null && freeCapacity > 0) {
                            return true;
                        }
                    }
                }

                return false;
            }) as AnyStoreStructure[]; // 最终结果可以断言为 AnyStoreStructure 数组

            let targetDestination: any = null;

            if (targetStructures.length > 0) {
                // 按优先级排序：Terminal > Storage > Factory > Lab
                targetStructures.sort((a, b) => {
                    const getPriority = (structure: AnyStructure) => {
                        switch (structure.structureType) {
                            case STRUCTURE_TERMINAL: return 1;
                            case STRUCTURE_STORAGE: return 2;
                            case STRUCTURE_FACTORY: return 3;
                            case STRUCTURE_LAB: return 4;
                            default: return 5;
                        }
                    };
                    return getPriority(a) - getPriority(b);
                });

                targetDestination = targetStructures[0];
            }

            // 检查是否有缓存的目标
            if (creep.memory.mineralTarget) {
                const cachedTarget = Game.getObjectById(creep.memory.mineralTarget);
                if (cachedTarget && cachedTarget instanceof Structure) {
                    targetDestination = cachedTarget;
                }
            }

            if (targetDestination) {
                // 缓存目标
                creep.memory.mineralTarget = targetDestination.id;

                const transferResult = creep.transfer(targetDestination, mineralType);
                if (transferResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(targetDestination, {
                        visualizePathStyle: { stroke: '#00ff99' },
                        reusePath: 30
                    });
                } else if (transferResult === OK) {
                    console.log(`${creep.name}: 成功运输 ${mineralType} 到 ${targetDestination.structureType}`);
                    creep.memory.mineralTarget = null; // 清除缓存
                } else if (transferResult === ERR_FULL) {
                    console.log(`${creep.name}: 目标已满，寻找新目标`);
                    creep.memory.mineralTarget = null; // 清除缓存，下次重新选择
                } else {
                    console.log(`${creep.name}: 运输失败，错误码=${transferResult}`);
                    creep.memory.mineralTarget = null; // 清除缓存
                }
            } else {
                creep.say('❌ 无目标');
                // 如果没有目标存储，回到房间中心等待
                const centerPos = new RoomPosition(25, 25, creep.room.name);
                if (creep.pos.getRangeTo(centerPos) > 5) {
                    creep.moveTo(centerPos, { ignoreCreeps: true });
                }
            }
        }
    },

    /**
     * 智能运输方法：根据当前情况自动选择运输能量或矿物
     */
    smartTransport: function(creep: Creep) {
        // 首先尝试搬运能量
        const energyTransportWorking = transportEnergy(creep);

        if (!energyTransportWorking) {
            // 如果没有能量搬运任务，检查是否有矿物需要搬运
            const room = creep.room;

            // 查找房间中的矿物
            const minerals = room.find(FIND_MINERALS);
            if (minerals.length > 0) {
                const mineral = minerals[0]; // 假设房间只有一种矿物
                const mineralType = mineral.mineralType;

                // 检查是否有容器中的矿物需要搬运
                const containersWithMinerals = room.find(FIND_STRUCTURES, {
                    filter: (structure) => {
                        return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
                               structure.store.getUsedCapacity(mineralType) > 100; // 至少有100个单位才值得搬运
                    }
                });

                if (containersWithMinerals.length > 0) {
                    // 使用矿物运输功能
                    this.transportMineral(creep, mineralType);
                    return;
                }
            }

            // 如果都没有，执行默认的闲置行为
            creep.say('💤 闲置');
            const controller = creep.room.controller;
            if (controller && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
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
    },

    run: function(creep: Creep) {
        // 初始化内存字段
        if (creep.memory.transportTarget === undefined) {
            creep.memory.transportTarget = null;
        }
        if (creep.memory.isGettingEnergy === undefined) {
            creep.memory.isGettingEnergy = false;
        }

        // 根据内存中的模式选择运行方式
        const transportMode = creep.memory.transportMode || 'energy';
        switch (transportMode) {
            case 'mineral':
                // 专门搬运矿物模式
                const mineralType = creep.memory.targetMineral as ResourceConstant;
                const sourceRoom = creep.memory.sourceRoom as string;
                const targetRoom = creep.memory.targetRoom as string;

                if (mineralType) {
                    this.transportMineral(creep, mineralType, sourceRoom, targetRoom);
                } else {
                    // 如果没有指定矿物类型，回退到智能模式
                    this.smartTransport(creep);
                }
                break;

            case 'smart':
                // 智能模式：自动选择运输能量或矿物
                this.smartTransport(creep);
                break;

            case 'energy':
            default:
                // 默认的能量搬运模式
                const isWorking = transportEnergy(creep);

                // 如果没有搬运任务，让 creep 闲置
                if (!isWorking) {
                    creep.say('💤 闲置');

                    // 可以让闲置的 creep 去帮助升级控制器或者做其他有用的事情
                    const controller = creep.room.controller;
                    if (controller && creep.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                        creep.say('💤 闲置');
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
                break;
        }
    },

    /**
     * 创建专门搬运矿物的运输者
     */
    createMineralTransporter: function(spawn: StructureSpawn, mineralType: ResourceConstant, sourceRoom?: string, targetRoom?: string) {
        const spawnName = spawn.name;
        const count = 1; // 矿物运输者通常需要较少数量

        // 统计当前矿物运输者数量
        const mineralTransporters = _.filter(Game.creeps, (creep) =>
            creep.memory.role === 'transporter' + spawnName &&
            creep.memory.transportMode === 'mineral'
        );

        const availableEnergy = getSpawnAndExtensionEnergy(spawn.room);

        if (mineralTransporters.length < count && availableEnergy >= 600) {
            const newName = `MineralTransporter_${mineralType}_${Game.time}`;

            console.log(`尝试生成新的矿物运输者: ${newName}`);

            const result = spawn.spawnCreep(CARRIER_BODY, newName, {
                memory: {
                    role: 'transporter' + spawnName,
                    room: spawnName,
                    working: false,
                    transportTarget: null,
                    isGettingEnergy: false,
                    transportMode: 'mineral', // 设置为矿物运输模式
                    targetMineral: mineralType,
                    sourceRoom: sourceRoom || spawnName,
                    targetRoom: targetRoom || spawnName
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成矿物运输者。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成矿物运输者时发生错误: ${result}`);
            }
        }
    }
};

export default transporterRole;
