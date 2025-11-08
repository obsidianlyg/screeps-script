// 矿工角色的内存接口
interface MinerMemory extends CreepMemory {
    role: 'miner';
    mining: boolean; // 标记是否处于采矿模式
    mineralId?: Id<Mineral>; // 要采掘的矿物ID
    containerId?: Id<StructureContainer>; // 矿物旁的容器ID
}

import findSource from "utils/FindSource";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";
import { findEnergyTargetsByPriority, getPriorityMode, PriorityMode } from "utils/PrioritySystem";

let minerRole = {
  createBySpawn: function(spawnName: string, energyLimit: number, count: number, body: BodyPartConstant[]) {
        const base = Game.spawns[spawnName];
        if (!base) {
            console.log("找不到 Spawn: " + spawnName);
            return;
        }

        // 统计当前 Harvester 数量
        const miners = _.filter(Game.creeps, (creep) => creep.memory.role === 'miner' + spawnName);
        // 如果数量不足
        if (miners.length < count && getSpawnAndExtensionEnergy(base.room) >= energyLimit) {

            // 生成一个唯一的名字
            const newName = 'miner_' + Game.time; // 使用当前时间戳创建唯一名字

            console.log(`尝试生成新的 miner: ${newName}`);

            // 尝试生成 Creep 并检查结果
            const result = base.spawnCreep(body, newName, {
                memory: {
                    role: 'miner' + spawnName,
                    room: spawnName,
                    working: false
                }
            });

            // 打印生成结果，便于调试
            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 miner`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
                // console.log(`Spawn 正在忙碌。`);
            } else {
                console.log(`生成 Creep 时发生错误: ${result}`);
            }
        }
    },
    /** @param {Creep} creep */
    run: (creep: Creep) => {
        // 确保 Creep 内存类型正确
        const memory = creep.memory as MinerMemory;

        // 1. 查找目标
        if (!memory.mineralId) {
            // 查找房间内的矿物
            const mineral = creep.room.find(FIND_MINERALS)[0];
            if (mineral) {
                memory.mineralId = mineral.id;
            } else {
                // 没有矿物，Creep 无事可做
                creep.say('无矿物!');
                return;
            }
        }
        const mineral = Game.getObjectById(memory.mineralId);

        // 2. 查找容器 (用于存放矿物)
        if (!memory.containerId && mineral) {
            // 查找矿物周围是否有容器
            const container = mineral.pos.findInRange(FIND_STRUCTURES, 1, {
                filter: (s) => s.structureType === STRUCTURE_CONTAINER
            })[0] as StructureContainer | undefined;


            if (container) {
                memory.containerId = container.id;
            }
        }
        const container = memory.containerId ? Game.getObjectById(memory.containerId) as StructureContainer : null;

        // --- 运行逻辑 ---

        // 如果 Creep 携带满了（只应该发生在容器已满或不存在时）
        if (creep.store.getFreeCapacity() === 0) {
            // 如果容器存在且未满，尝试转移矿物 (通常不需要，因为站立在容器上开采会自动放入)
            if (container && container.store.getFreeCapacity() > 0) {
                creep.transfer(container, mineral!.mineralType);
            } else {
                // 如果容器不存在或已满，矿工等待，或者移动到 Storage/Terminal 倾倒
                creep.say('容器满!');
                // 暂时停止开采
                memory.mining = false;
                // 可以添加逻辑，让它将矿物运回 Storage 或 Terminal
            }
            return;
        }

        // 采矿模式
        if (mineral) {
            // 确定矿工的采矿目标点（用于移动）
            let targetForMove: RoomPosition;

            // 优先使用容器作为目标位置，方便 Creep 靠近并将资源存入
            if (container) {
                // 目标是容器 (Creep 应该移动到容器旁边的空位)
                targetForMove = container.pos;

                // 判断 Creep 是否已在容器旁边（距离为 1）
                const isAtMiningRange = creep.pos.getRangeTo(container) <= 1;

                if (!isAtMiningRange) {
                    // 移动到目标容器附近
                    creep.moveTo(targetForMove, { visualizePathStyle: { stroke: '#ffaa00' } });
                } else {
                    // 已经在采矿范围内，执行开采动作

                    // 尝试开采矿物（矿物和容器距离为 1，只要在容器旁边，通常就在矿物周围 1 格内）
                    const harvestResult = creep.harvest(mineral);

                    // 如果采矿成功或处于冷却中，则继续
                    if (harvestResult === OK || harvestResult === ERR_NOT_ENOUGH_RESOURCES) {
                        // 如果 Creep 脚下不是容器，将采到的矿物存入容器
                        if (!creep.pos.isEqualTo(container.pos) && creep.store.getUsedCapacity(mineral.mineralType) > 0) {
                            creep.transfer(container, mineral.mineralType);
                        }
                    } else if (harvestResult === ERR_NOT_IN_RANGE) {
                        // 偶尔会出现这种情况，比如 Creep 站在容器旁边但矿物在 2 格外（地形非常规），
                        // 此时应该移动到矿物旁。但通常不发生。
                        creep.moveTo(mineral.pos, { visualizePathStyle: { stroke: '#ffaa00' } });
                    } else if (harvestResult === ERR_NOT_OWNER) {
                        creep.say('需要Extractor!');
                    }
                }
            }
            // 如果没有容器，目标是矿物本身
            else {
                targetForMove = mineral.pos;

                // 判断 Creep 是否已在矿物周围（距离为 1）
                const isAtMiningRange = creep.pos.getRangeTo(mineral) <= 1;

                if (!isAtMiningRange) {
                    // 移动到矿物附近
                    creep.moveTo(targetForMove, { visualizePathStyle: { stroke: '#ffaa00' } });
                } else {
                    // 已经在采矿位置，执行开采动作
                    const harvestResult = creep.harvest(mineral);

                    if (harvestResult === ERR_NOT_OWNER) {
                        creep.say('需要Extractor!');
                    } else if (harvestResult === ERR_NOT_ENOUGH_RESOURCES) {
                        creep.say('冷却中...');
                    }
                }
            }
        }
    }
};

export default minerRole;
