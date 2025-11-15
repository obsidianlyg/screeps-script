/**
 * Factory使用示例
 * 展示如何使用FactoryManager进行资源压缩和解压
 */

import FactoryManager from '../utils/FactoryManager';

/**
 * 设置房间的自动压缩系统
 * @param roomName 房间名称
 */
export function setupAutoCompression(roomName: string): void {
    console.log(`为房间 ${roomName} 设置自动压缩系统`);

    // 设置压缩阈值
    const compressionThreshold = {
        [RESOURCE_HYDROGEN]: 20000,
        [RESOURCE_OXYGEN]: 20000,
        [RESOURCE_UTRIUM]: 10000,
        [RESOURCE_LEMERGIUM]: 10000,
        [RESOURCE_KEANIUM]: 10000,
        [RESOURCE_ZYNTHIUM]: 10000,
    };

    // 可以将配置保存到Memory中
    if (!Memory.factoryConfig) {
        Memory.factoryConfig = {};
    }
    Memory.factoryConfig[roomName] = {
        compressionThreshold,
        decompressResources: {
            [RESOURCE_HYDROGEN]: 5000,   // 最少保持5000 H
            [RESOURCE_OXYGEN]: 5000,     // 最少保持5000 O
            [RESOURCE_UTRIUM]: 1000,    // 最少保持1000 U
            [RESOURCE_ENERGY]: 10000,   // 最少保持10000能量
        }
    };
}

/**
 * 创建专门的Factory操作员creep
 * @param spawnName spawn名称
 * @param roomName 目标房间
 */
export function createFactoryOperator(spawnName: string, roomName: string): void {
    const spawn = Game.spawns[spawnName];
    if (!spawn) {
        console.log(`找不到spawn: ${spawnName}`);
        return;
    }

    // Factory操作员身体配置：主要是CARRY和MOVE
    const body: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

    const existingOperators = _.filter(Game.creeps, creep =>
        creep.memory.role === 'factoryOperator' && creep.room.name === roomName
    );

    if (existingOperators.length < 1) {
        const newName = `FactoryOp_${Game.time}`;

        console.log(`创建Factory操作员: ${newName}`);

        const result = spawn.spawnCreep(body, newName, {
            memory: {
                role: 'factoryOperator',
                room: roomName,
                working: false,
                operation: 'manageFactory'
            }
        });

        if (result === OK) {
            console.log(`成功创建Factory操作员: ${newName}`);
        } else {
            console.log(`创建Factory操作员失败: ${result}`);
        }
    }
}

/**
 * Factory操作员运行逻辑
 * @param creep Factory操作员creep
 */
export function runFactoryOperator(creep: Creep): void {
    const room = creep.room;

    // 查找房间内的Factory
    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    if (!factory) {
        creep.say('❌ 无Factory');
        return;
    }

    // 1. 如果creep为空，从Storage或Terminal提取资源到Factory
    if (creep.store.getUsedCapacity() === 0) {
        creep.say('⚡ 取资源');

        // 优先从Storage提取
        const storage = room.storage;
        const neededResources = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM,
                                   RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM];
        if (storage) {
            // 提取Factory需要的资源
            for (const resource of neededResources) {
                const amount = storage.store.getUsedCapacity(resource);
                if (amount > 1000) { // 如果Storage中有超过1000的资源
                    const withdrawAmount = Math.min(amount, creep.store.getCapacity());
                    const result = creep.withdraw(storage, resource, withdrawAmount);
                    if (result === OK) {
                        creep.say(`📤 ${resource}`);
                        return;
                    } else if (result === ERR_NOT_IN_RANGE) {
                        creep.moveTo(storage, { visualizePathStyle: { stroke: '#ff00ff' } });
                        creep.say('🚶 移动中');
                        return;
                    }
                }
            }
        }

        // 如果Storage没有，从Terminal提取
        const terminal = room.terminal;
        if (terminal) {
            for (const resource of neededResources) {
                const amount = terminal.store.getUsedCapacity(resource);
                if (amount > 1000) {
                    const withdrawAmount = Math.min(amount, creep.store.getCapacity());
                    const result = creep.withdraw(terminal, resource, withdrawAmount);
                    if (result === OK) {
                        creep.say(`📤 ${resource}`);
                        return;
                    } else if (result === ERR_NOT_IN_RANGE) {
                        creep.moveTo(terminal, { visualizePathStyle: { stroke: '#ff00ff' } });
                        creep.say('🚶 移动中');
                        return;
                    }
                }
            }
        }

        creep.say('💤 无资源');
        return;
    }

    // 2. 如果creep有资源，将其存入Factory
    for (const resourceType in creep.store) {
        const amount = creep.store[resourceType as ResourceConstant];
        if (amount > 0) {
            const result = creep.transfer(factory, resourceType as ResourceConstant);
            if (result === OK) {
                creep.say(`📥 ${resourceType}`);
                return;
            } else if (result === ERR_NOT_IN_RANGE) {
                creep.moveTo(factory, { visualizePathStyle: { stroke: '#00ffff' } });
                creep.say('🚶 移动中');
                return;
            }
        }
    }

    creep.say('❌ 无任务');
}

/**
 * 智能压缩策略
 * 根据房间需求和资源状况自动进行压缩
 */
export function smartCompressionStrategy(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room) {
        return;
    }

    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    if (!factory) {
        return;
    }
    const config = Memory.factoryConfig?.[roomName];

    if (!config) {
        // 使用默认配置
        FactoryManager.autoCompressResources(roomName, 15000);
        return;
    }

    // 根据配置进行压缩
    const { compressionThreshold, decompressResources } = config;

    // 1. 先解压需要的资源
    if (decompressResources) {
        FactoryManager.autoDecompressResources(roomName, decompressResources);
    }

    // 2. 再压缩过剩的资源
    for (const resource in compressionThreshold) {
        const threshold = compressionThreshold[resource];
        const amount = factory.store.getUsedCapacity(resource as ResourceConstant);
        if (amount >= threshold) {
            const compressAmount = Math.floor((amount - threshold) / 100) * 100;
            if (compressAmount > 0) {
                FactoryManager.compressResource(roomName, resource as ResourceConstant, compressAmount);
                return; // 一次只执行一个压缩任务
            }
        }
    }

    // 3. 默认压缩逻辑
    FactoryManager.autoCompressResources(roomName, 20000);
}

/**
 * 特定压缩任务：压缩Ghodium
 * @param roomName 房间名称
 */
export function compressGhodium(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room) {
        console.log(`房间 ${roomName} 没有Factory`);
        return;
    }

    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    if (!factory) {
        console.log(`房间 ${roomName} 没有Factory`);
        return;
    }

    // 检查是否有足够的H和O
    const hydrogen = factory.store.getUsedCapacity(RESOURCE_HYDROGEN);
    const oxygen = factory.store.getUsedCapacity(RESOURCE_OXYGEN);

    if (hydrogen >= 100 && oxygen >= 100) {
        console.log(`开始压缩Ghodium: H=${hydrogen}, O=${oxygen}`);
        const result = factory.produce(RESOURCE_GHODIUM);
        if (result === OK) {
            console.log('✅ Ghodium压缩任务已启动');
        } else {
            console.log(`❌ Ghodium压缩失败: ${result}`);
        }
    } else {
        console.log(`资源不足压缩Ghodium: H=${hydrogen}, O=${oxygen} (需要各100)`);
    }
}

/**
 * 特定解压任务：解压bar
 * @param roomName 房间名称
 * @param barType bar类型
 */
export function decompressBar(roomName: string, barType: CommodityConstant | MineralConstant | RESOURCE_ENERGY | RESOURCE_GHODIUM): void {
    const room = Game.rooms[roomName];
    if (!room) {
        console.log(`房间 ${roomName} 没有Factory`);
        return;
    }

    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    if (!factory) {
        console.log(`房间 ${roomName} 没有Factory`);
        return;
    }

    // 检查是否有足够的bar
    const barAmount = factory.store.getUsedCapacity(barType);
    if (barAmount >= 1) {
        console.log(`开始解压 ${barType}: ${barAmount}`);
        const result = factory.produce(barType);
        if (result === OK) {
            console.log(`✅ ${barType} 解压任务已启动`);
        } else {
            console.log(`❌ ${barType} 解压失败: ${result}`);
        }
    } else {
        console.log(`资源不足解压 ${barType}: ${barAmount} (需要1)`);
    }
}

/**
 * 电池能量转换
 * @param roomName 房间名称
 * @param isCharging 是否为充电模式（true充电，false放电）
 */
export function batteryEnergyTransfer(roomName: string, isCharging: boolean = true): void {
    const room = Game.rooms[roomName];
    if (!room) {
        return;
    }

    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    if (!factory) {
        return;
    }

    // 优化后的充电逻辑（假设工厂等级足够生产电池）
    if (isCharging) {
        const energyAvailable = factory.store.getUsedCapacity(RESOURCE_ENERGY);
        const ENERGY_PER_BATTERY = 500; // 实际配方

        if (energyAvailable >= ENERGY_PER_BATTERY) {
            // 计算最多能生产多少电池
            const batteriesToProduce = Math.floor(energyAvailable / ENERGY_PER_BATTERY);

            // 尝试生产
            const result = factory.produce(RESOURCE_BATTERY);

            if (result === OK) {
                console.log(`✅ 开始充电: 生产 1 电池 (消耗 ${ENERGY_PER_BATTERY} 能量)`);
                // Screeps API 默认一次只生产一个单位
            }
        }
    } else {
        // 放电模式：电池 -> 能量
        const battery = factory.store.getUsedCapacity(RESOURCE_BATTERY);
        if (battery >= 1) {
            const result = factory.produce(RESOURCE_ENERGY);
            if (result === OK) {
                console.log(`✅ 开始放电: ${battery} 电池 -> 能量`);
            }
        }
    }
}

/**
 * 全局Factory管理函数（在main loop中调用）
 */
export function manageAllFactories(): void {
    // 为每个房间进行Factory管理
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        // 只管理我控制的房间
        if (room.controller && room.controller.my) {
            // 检查是否有Factory
            const factory = room.find(FIND_STRUCTURES, {
                filter: (structure): structure is StructureFactory => {
                    return structure.structureType === STRUCTURE_FACTORY;
                }
            })[0] as StructureFactory;

            if (factory) {
                // 处理生产任务
                FactoryManager.processProductionTasks(roomName);

                // 智能压缩策略
                if (Game.time % 50 === 0) { // 每50tick执行一次
                    smartCompressionStrategy(roomName);
                }

                // 检查Factory状态
                if (Game.time % 100 === 0) { // 每100tick检查一次
                    const status = FactoryManager.getFactoryStatus(roomName);
                    if (status && status.cooldown === 0) {
                        // Factory空闲，可以接受新任务
                    }
                }
            }
        }
    }

    // 运行所有Factory操作员
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.memory.role === 'factoryOperator') {
            runFactoryOperator(creep);
        }
    }

    // 清理过期任务
    if (Game.time % 1000 === 0) {
        FactoryManager.cleanup();
    }

    // 定期显示状态
    if (Game.time % 500 === 0) {
        FactoryManager.debugFactories();
    }
}

/**
 * 调试命令：全局Factory命令
 */
export const GlobalFactoryCommands = {
    // 查看Factory状态
    debug: (roomName?: string) => {
        FactoryManager.debugFactories(roomName);
    },

    // 压缩资源
    compress: (roomName: string, resource: string, amount?: number) => {
        const compressAmount = amount || 1000;
        FactoryManager.compressResource(roomName, resource as ResourceConstant, compressAmount);
    },

    // 解压资源
    decompress: (roomName: string, resource: string, amount?: number) => {
        const decompressAmount = amount || 1;
        FactoryManager.decompressResource(roomName, resource as ResourceConstant, decompressAmount);
    },

    // 自动压缩
    autoCompress: (roomName?: string) => {
        if (roomName) {
            FactoryManager.autoCompressResources(roomName);
        } else {
            // 为所有房间执行自动压缩
            for (const name in Game.rooms) {
                const room = Game.rooms[name];
                if (room.controller && room.controller.my) {
                    const factory = room.find(FIND_STRUCTURES, {
                        filter: (structure): structure is StructureFactory => {
                            return structure.structureType === STRUCTURE_FACTORY;
                        }
                    })[0] as StructureFactory;

                    if (factory) {
                        FactoryManager.autoCompressResources(name);
                    }
                }
            }
        }
    },

    // 压缩Ghodium
    compressG: (roomName: string) => {
        compressGhodium(roomName);
    },

    // 解压bar
    decompressBar: (roomName: string, barType: CommodityConstant | MineralConstant | RESOURCE_ENERGY | RESOURCE_GHODIUM) => {
        decompressBar(roomName, barType);
    },

    // 电池操作
    battery: (roomName: string, charge: boolean = true) => {
        batteryEnergyTransfer(roomName, charge);
    },

    // 创建操作员
    createOperator: (spawnName: string, roomName: string) => {
        createFactoryOperator(spawnName, roomName);
    },

    // 设置自动压缩
    setupAuto: (roomName: string) => {
        setupAutoCompression(roomName);
    }
};

export default {
    setupAutoCompression,
    createFactoryOperator,
    runFactoryOperator,
    smartCompressionStrategy,
    compressGhodium,
    decompressBar,
    batteryEnergyTransfer,
    manageAllFactories,
    GlobalFactoryCommands
};
