import {
    BUILDER_BODY,
    BIG_COMMON_BODY,
    BIG_COMMON_BODY_TMP,
    BUILDER_COUNT,
    BIG_BUILDER_COUNT,
    BIG_ENERYG,
    HARVESTER_COUNT,
    BIG_HARVEST_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

import findSource from "utils/FindSource";

import findContainer from "utils/FindContainer";

import { transportEnergy, needsEnergyTransport } from "utils/EnergyTransport";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

import { repairRoads, repairContainers } from "utils/repair";
import { handleStuckDetection } from "utils/StuckDetection";

let builderRole = {
    create: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 加入限制以采集者为主，采集者数量不足优先创建采集者
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'harvester');
        if (harvesters.length < HARVESTER_COUNT) {
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
                    room: MAIN_SPAWN_NAME,
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
    createBySpawn: function(spawnName: string, energyLimit: number, count: number, harvesterCount: number, body: BodyPartConstant[]) {
        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 加入限制以采集者为主，采集者数量不足优先创建采集者
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'harvester' + spawnName && creep.memory.room == spawnName);
        if (harvesters.length < harvesterCount) {
            return;
        }

        // 统计当前 Harvester 数量
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder' + spawnName && creep.memory.room == spawnName);

        // 如果数量不足
        if (builders.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {

            // 生成一个唯一的名字
            const newName = 'Builder' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Builder: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'builder' + spawnName,
                    room: spawnName,
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

    createVolunteerBySpawn: function(originName: string, targetName: string, energyLimit: number, count: number, body: BodyPartConstant[]) {
        const base = Game.spawns[originName];
        if (!base) {
            console.log("找不到 Spawn: " + originName);
            return;
        }

        // 统计当前 Harvester 数量
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'builder' + originName && creep.memory.room == targetName);

        // 如果数量不足
        if (builders.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {

            // 生成一个唯一的名字
            const newName = 'Builder' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 Builder: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'builder' + originName,
                    room: targetName,
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
    createBig: function() {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 加入限制以采集者为主，采集者数量不足优先创建采集者
        const harvesters = _.filter(Game.creeps, (creep) => creep.memory.role === 'big_harvester');
        if (harvesters.length < BIG_HARVEST_COUNT) {
            return;
        }

        // 统计当前 big_builder 数量
        const builders = _.filter(Game.creeps, (creep) => creep.memory.role === 'big_builder');

        // 如果数量不足
        if (builders.length < BIG_BUILDER_COUNT && getDefaultEneryg() >= BIG_ENERYG) {

            // 生成一个唯一的名字
            const newName = 'big_builder' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 big_builder: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(BIG_COMMON_BODY, newName, {
                memory: {
                    role: 'big_builder',
                    room: MAIN_SPAWN_NAME,
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
    // 指定房间建造方法
    buildInRoom: function(creep: Creep, targetRoomName: string) {
        // 检查目标房间是否可见
        if (!Game.rooms[targetRoomName]) {
            console.log(`${creep.name}: 目标房间 ${targetRoomName} 不可见，无法建造`);
        }

        const targetRoom = Game.rooms[targetRoomName];

        // 检查 creep 是否在目标房间
        if (creep.room.name !== targetRoomName) {
            // 移动到目标房间
            creep.say('🚶 移动中');
            const result = creep.moveTo(new RoomPosition(25, 25, targetRoomName), {
                visualizePathStyle: { stroke: '#ffff00ff' },
                reusePath: 50
            });
            return;
        }

        // 运行creeper特定内容
        this.run(creep)
    },
// 移除不使用的参数 'creeps'
    run: function(creep:Creep) {

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
            const constructionSites = creep.room.find(FIND_MY_CONSTRUCTION_SITES);

            // --- 核心筛选逻辑：排除接近完成的道路 ---
            const filteredSites = constructionSites.filter(site => {

                // 如果是道路（Road）
                if (site.structureType === STRUCTURE_ROAD) {
                    // 假设道路总进度是 300，我们设置一个绝对值阈值，例如：剩余工作量小于 30 就跳过
                    // 意思是：进度 > 270 的道路我们暂时不建
                    const ROAD_PROGRESS_SKIP_THRESHOLD = 0.90; // 90%
                    // return site.progress / site.progressTotal < ROAD_PROGRESS_SKIP_THRESHOLD;
                    // TODO 临时设置小路优先
                    // return site.progressTotal < 2000
                    return true;
                }

                // extention开关
                if (site.structureType === STRUCTURE_EXTENSION) {
                    return true;
                }

                // container开关
                if (site.structureType === STRUCTURE_CONTAINER) {
                    return true;
                }

                // 其他所有建筑（Spawn, Extension, Container 等）都保留，不进行进度筛选
                return true;
            });
            // 查找房间内距离最近的工地
            let targetSite: ConstructionSite | null = null;
            // 2. 在筛选后的列表中，进行优先级排序
            if (filteredSites.length > 0) {

                filteredSites.sort((a, b) => {
                    // 优先级排序：
                    // 1. Extension/Spawn/Tower（最重要）
                    // 2. Container/Storage
                    // 3. Road（优先级最低）

                    const getPriority = (site: ConstructionSite) => {
                        switch (site.structureType) {
                            case STRUCTURE_SPAWN:
                            case STRUCTURE_EXTENSION:
                            case STRUCTURE_TOWER:
                                return 1;
                            case STRUCTURE_CONTAINER:
                            case STRUCTURE_STORAGE:
                                return 2;
                            case STRUCTURE_ROAD:
                            case STRUCTURE_LINK:
                                return 3;
                            default:
                                return 4; // 其他建筑
                        }
                    };

                    // 比较优先级：优先级数字越小越靠前
                    const pA = getPriority(a);
                    const pB = getPriority(b);

                    if (pA !== pB) {
                        return pA - pB;
                    }

                    // 优先级相同时，选择距离最近的
                    return creep.pos.getRangeTo(a) - creep.pos.getRangeTo(b);
                });

                targetSite = filteredSites[0];

            } else {
                // 3. 如果 filteredSites 为空，说明所有工地都是接近完成的道路
                // 此时应该让 Builder 去完成这些道路，避免闲置
                // 因此，回退到从所有工地中选择距离最近的一个
                targetSite = creep.pos.findClosestByPath(constructionSites);
            }

            let actualTargetSite: ConstructionSite | null = null;

            // 检查是否有缓存的目标工地且仍然存在
            if (creep.memory.targetConstructionSiteId) {
                const cachedTarget = Game.getObjectById(creep.memory.targetConstructionSiteId);
                if (cachedTarget && cachedTarget instanceof ConstructionSite) {
                    actualTargetSite = cachedTarget;
                    // console.log(`${creep.name}: 使用缓存的目标工地 ${actualTargetSite.id}`);
                }
            }

            // 如果没有有效的缓存目标，使用新选择的目标
            if (!actualTargetSite && targetSite) {
                actualTargetSite = targetSite;
                creep.memory.targetConstructionSiteId = targetSite.id;
                // console.log(`${creep.name}: 使用新选择的目标工地 ${targetSite.id}`);
            }

            if (actualTargetSite) {
                // 尝试建造
                const buildResult = creep.build(actualTargetSite);

                if (buildResult === ERR_NOT_IN_RANGE) {
                    // 移动到工地，使用长路径缓存避免重复计算
                    creep.moveTo(actualTargetSite, {
                        visualizePathStyle: { stroke: '#00ff2aff' },
                        ignoreCreeps: false,  // 正常情况下不穿过creep
                        maxOps: 1000,
                        heuristicWeight: 1.2,
                        range: 1
                    });
                } else if (buildResult === OK) {
                    // console.log(`${creep.name}: 正在建造工地 ${actualTargetSite.id}`);
                    // 建造中，继续工作
                    // 移除目标缓存 - 下次根据优先级再查
                    creep.memory.targetConstructionSiteId = null;
                } else {
                    console.log(`${creep.name}: 建造失败，错误码=${buildResult}`);
                    // 建造失败，清除缓存重新选择
                    creep.memory.targetConstructionSiteId = null;
                    delete creep.memory._move;
                }
            } else {
                // 如果没有工地可建，让 Builder 闲置下来做点别的事情 (比如升级 Controller)

                // 执行能量搬运任务
                const isWorking = transportEnergy(creep);
                if (isWorking) {
                    return;
                }

                // 修容器
                let repairContainer = repairContainers(creep);
                if (repairContainer) {
                    return;
                }

                // 修路
                let repairRoadsBool = repairRoads(creep);
                if (repairRoadsBool) {
                    return;
                }

                // 升级
                const controller = creep.room.controller;
                if (controller) {
                    creep.say('up');
                    creep.memory.targetConstructionSiteId = null;  // 清除建造目标
                    delete creep.memory._move;  // 清除路径缓存
                    // 移动到 Controller 附近等待新工地
                    if (creep.upgradeController(controller) === ERR_NOT_IN_RANGE) {
                        creep.moveTo(controller, { ignoreCreeps: false,  // 正常情况下不穿过creep
                            maxOps: 1000,
                            heuristicWeight: 1.2,
                            range: 1 });
                    }
                }
            }
        } else {
            // 任务：取回能量

            // 优先从 Container/Storage 取能量，效率比采 Source 高
            const containerFound = findContainer(creep);

            // 如果没有找到可用的Container，就 fallback 到从 Source 采集
            if (!containerFound) {
                // console.log(`${creep.name}: 没有可用container，转而去采集资源源`);
                // 去资源点采集
                findSource(creep)
            }
        }
    }
};


export default builderRole;
