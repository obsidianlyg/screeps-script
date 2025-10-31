/**
 * BodyUtils 使用示例
 * 展示如何在角色创建中使用新的 Body 配置系统
 */

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    getLevelByRCL,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from '../utils/BodyUtils';

import { getSpawnAndExtensionEnergy } from 'utils/GetEnergy';

import { ENERGY_THRESHOLDS, RCL_TO_CREEP_LEVEL } from '../constant/constants';

/**
 * 根据房间等级创建合适的采集者
 */
export function createHarvesterByRCL(spawn: StructureSpawn, roomName: string) {
    const room = Game.rooms[roomName];
    if (!room) return;

    // 根据房间控制等级确定 Creep 等级
    const rcl = room.controller?.level || 1;
    const level = getLevelByRCL(rcl);

    // 获取对应的 Body 配置
    const body = getBodyByRole(CreepRole.HARVESTER, level);
    const bodyCost = calculateBodyCost(body);

    console.log(`RCL ${rcl} 房间创建 ${level} 等级采集者，成本: ${bodyCost}`);

    // 检查是否有足够能量
    if (canAffordBody(body, getSpawnAndExtensionEnergy(room))) {
        const result = spawn.spawnCreep(body, `Harvester_${Game.time}`, {
            memory: {
                role: CreepRole.HARVESTER + roomName,
                level: level,
                room: roomName,
                working: false
            }
        });

        if (result === OK) {
            console.log(`成功创建 ${level} 等级采集者`);
        }
    } else {
        console.log(`能量不足，需要 ${bodyCost}，当前只有 ${getSpawnAndExtensionEnergy(room)}`);
    }
}

/**
 * 根据可用能量创建自适应的建造者
 */
export function createAdaptiveBuilder(spawn: StructureSpawn, count: number = 1, roomName: string) {

    const room = Game.rooms[roomName];
    if (!room) return;

    const availableEnergy = getSpawnAndExtensionEnergy(room);


    // 根据可用能量确定最高可达等级
    let level = getLevelByEnergy(availableEnergy);

    // 获取基础 Body 配置
    let body = getBodyByRole(CreepRole.BUILDER, level);

    // 如果能量不足，自动调整 Body 配置
    if (!canAffordBody(body, availableEnergy)) {
        body = adjustBodyToEnergy(body, availableEnergy);
        level = CreepLevel.BASIC; // 降级到基础等级
    }

    const bodyCost = calculateBodyCost(body);

    console.log(`创建自适应建造者，等级: ${level}，成本: ${bodyCost}`);

    // 统计当前建造者数量
    const currentBuilders = _.filter(Game.creeps, creep =>
        creep.memory.role === CreepRole.BUILDER + roomName
    ).length;

    if (currentBuilders < count) {
        const result = spawn.spawnCreep(body, `Builder_${Game.time}`, {
            memory: {
                role: CreepRole.BUILDER + roomName,
                level: level,
                working: false,
                room: ''
            }
        });

        if (result === OK) {
            console.log(`成功创建自适应建造者`);
        } else {
            console.log(`创建建造者失败: ${result}`);
        }
    }
}

/**
 * 创建搬运队伍（多个等级的搬运者）
 */
export function createTransportTeam(spawn: StructureSpawn, roomName: string) {
    const room = Game.rooms[roomName];
    if (!room) return;
    const availableEnergy = getSpawnAndExtensionEnergy(room);

    // 根据能量创建不同等级的搬运者
    const transportConfigs = [
        { level: CreepLevel.BASIC, count: 2, priority: 1 },
        { level: CreepLevel.MEDIUM, count: 1, priority: 2 }
    ];

    for (const config of transportConfigs) {
        if (availableEnergy >= ENERGY_THRESHOLDS[config.level]) {
            const body = getBodyByRole(CreepRole.TRANSPORTER, config.level);

            // 统计当前该等级的搬运者数量
            const currentTransporters = _.filter(Game.creeps, creep =>
                creep.memory.role === CreepRole.TRANSPORTER + roomName &&
                creep.memory.level === config.level
            ).length;

            if (currentTransporters < config.count) {
                const result = spawn.spawnCreep(body, `Transporter_${config.level}_${Game.time}`, {
                    memory: {
                        role: CreepRole.TRANSPORTER + roomName,
                        level: config.level,
                        room: roomName,
                        working: false
                    }
                });

                if (result === OK) {
                    console.log(`成功创建 ${config.level} 等级搬运者`);
                }
            }
        }
    }
}

/**
 * 根据游戏阶段动态调整 Creep 生产策略
 */
export function adaptiveCreepProduction(spawn: StructureSpawn, roomName: string) {
    const room = Game.rooms[roomName];
    if (!room) return;

    const rcl = room.controller?.level || 1;
    const availableEnergy = spawn.store.getUsedCapacity(RESOURCE_ENERGY);

    console.log(`房间 ${roomName} - RCL: ${rcl}, 可用能量: ${availableEnergy}`);

    // 根据不同的游戏阶段调整生产策略
    switch (rcl) {
        case 1:
        case 2:
            // 早期：基础采集者和建造者
            createHarvesterByRCL(spawn, roomName);
            createAdaptiveBuilder(spawn, 1, roomName);
            break;

        case 3:
        case 4:
            // 中期：加入搬运者
            createHarvesterByRCL(spawn, roomName);
            createAdaptiveBuilder(spawn, 2, roomName);
            createTransportTeam(spawn, roomName);
            break;

        case 5:
        case 6:
            // 后期：高等级 Creep
            createHarvesterByRCL(spawn, roomName);
            createAdaptiveBuilder(spawn, 3, roomName);
            createTransportTeam(spawn, roomName);
            break;

        case 7:
        case 8:
            // 终期：精英级 Creep
            createHarvesterByRCL(spawn, roomName);
            createAdaptiveBuilder(spawn, 5, roomName);
            createTransportTeam(spawn, roomName);
            break;
    }
}

/**
 * 升级现有 Creep 的 Body 配置（通过替换）
 */
export function upgradeCreepBody(spawn: StructureSpawn, creep: Creep) {
    const currentLevel = creep.memory.level as CreepLevel || CreepLevel.BASIC;
    const availableEnergy = spawn.store.getUsedCapacity(RESOURCE_ENERGY);

    // 获取下一个等级
    const getNextLevel = (level: CreepLevel): CreepLevel | null => {
        switch (level) {
            case CreepLevel.BASIC:
                return CreepLevel.MEDIUM;
            case CreepLevel.MEDIUM:
                return CreepLevel.ADVANCED;
            case CreepLevel.ADVANCED:
                return CreepLevel.ELITE;
            case CreepLevel.ELITE:
                return null;
            default:
                return CreepLevel.MEDIUM;
        }
    };

    const nextLevel = getNextLevel(currentLevel);

    // 检查是否可以升级到更高等级
    if (nextLevel && availableEnergy >= ENERGY_THRESHOLDS[nextLevel]) {
        const body = getBodyByRole(creep.memory.role as CreepRole, nextLevel);

        if (canAffordBody(body, availableEnergy)) {
            // 标记当前 Creep 为待替换
            creep.memory.replacement = true;

            // 创建新的高等级 Creep
            const result = spawn.spawnCreep(body, `${creep.memory.role}_${nextLevel}_${Game.time}`, {
                memory: {
                    role: creep.memory.role,
                    level: nextLevel,
                    room: creep.memory.room,
                    working: false,
                    replaces: creep.name // 标记替换的 Creep
                }
            });

            if (result === OK) {
                console.log(`开始升级 ${creep.name} 从等级 ${currentLevel} 到 ${nextLevel}`);
            }
        }
    }
}

// 导出示例函数
export default {
    createHarvesterByRCL,
    createAdaptiveBuilder,
    createTransportTeam,
    adaptiveCreepProduction,
    upgradeCreepBody
};
