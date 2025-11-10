/**
 * Terminal使用示例
 * 展示如何使用TerminalManager进行Terminal操作
 */

import TerminalManager from '../utils/TerminalManager';

/**
 * 设置房间资源自动平衡
 * @param resourceType 资源类型
 * @param threshold 平衡阈值
 */
export function setupResourceBalance(resourceType: ResourceConstant, threshold: number = 70): void {
    console.log(`设置 ${resourceType} 自动平衡，阈值: ${threshold}%`);

    // 这里可以设置定时任务
    // 例如：每100tick执行一次自动平衡
}

/**
 * 创建专门的Terminal运输creep
 * @param spawnName spawn名称
 * @param roomName 目标房间
 */
export function createTerminalOperator(spawnName: string, roomName: string): void {
    const spawn = Game.spawns[spawnName];
    if (!spawn) {
        console.log(`找不到spawn: ${spawnName}`);
        return;
    }

    // Terminal操作员身体配置：主要是CARRY和MOVE
    const body: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

    const existingOperators = _.filter(Game.creeps, creep =>
        creep.memory.role === 'terminalOperator' && creep.room.name === roomName
    );

    if (existingOperators.length < 1) {
        const newName = `TerminalOp_${Game.time}`;

        console.log(`创建Terminal操作员: ${newName}`);

        const result = spawn.spawnCreep(body, newName, {
            memory: {
                role: 'terminalOperator',
                room: roomName,
                working: false,
                operation: 'manageTerminal'
            }
        });

        if (result === OK) {
            console.log(`成功创建Terminal操作员: ${newName}`);
        } else {
            console.log(`创建Terminal操作员失败: ${result}`);
        }
    }
}

/**
 * Terminal操作员运行逻辑
 * @param creep Terminal操作员creep
 */
export function runTerminalOperator(creep: Creep): void {
    const room = creep.room;
    const terminal = room.terminal;

    if (!terminal) {
        creep.say('❌ 无Terminal');
        return;
    }

    // 1. 如果Terminal在冷却中，等待
    if (terminal.cooldown > 0) {
        creep.say(`⏰ ${terminal.cooldown}`);
        return;
    }

    // 2. 如果creep为空，从Terminal提取资源
    if (creep.store.getUsedCapacity() === 0) {
        // 优先提取能量
        if (terminal.store.getUsedCapacity(RESOURCE_ENERGY) > 50000) {
            if (TerminalManager.receiveResource(room.name, creep, RESOURCE_ENERGY, creep.store.getCapacity())) {
                return;
            }
        }

        // 检查是否有其他过剩资源需要提取
        const importantResources = ['H', 'O', 'U', 'L', 'K', 'Z', 'X'];
        for (const resource of importantResources) {
            const amount = terminal.store.getUsedCapacity(resource as ResourceConstant);
            if (amount > 10000) { // 超过10k认为是过剩
                if (TerminalManager.receiveResource(room.name, creep, resource as ResourceConstant, Math.min(amount, creep.store.getCapacity()))) {
                    return;
                }
            }
        }

        creep.say('💤 无需处理');
        return;
    }

    // 3. 如果creep有资源，将其存入Storage或处理
    const storage = room.storage;
    if (storage) {
        for (const resourceType in creep.store) {
            const amount = creep.store[resourceType as ResourceConstant];
            if (amount > 0) {
                const result = creep.transfer(storage, resourceType as ResourceConstant);
                if (result === OK) {
                    creep.say(`📥 ${resourceType}`);
                    return;
                } else if (result === ERR_NOT_IN_RANGE) {
                    creep.moveTo(storage, { visualizePathStyle: { stroke: '#00ff00' } });
                    creep.say('🚶 移动中');
                    return;
                }
            }
        }
    }

    creep.say('❌ 无存储目标');
}

/**
 * 智能资源分配系统
 * 根据房间需求自动分配资源
 */
export function smartResourceDistribution(): void {
    const terminals: { [roomName: string]: any } = {};

    // 收集所有房间的Terminal和资源状态
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my && room.terminal) {
            const status = TerminalManager.getTerminalStatus(roomName);
            if (status) {
                terminals[roomName] = status;
            }
        }
    }

    // 能量分配：从能量充足的房间分配到能量不足的房间
    distributeEnergy(terminals);

    // 矿物分配：根据房间RCL等级和需求分配
    distributeMinerals(terminals);
}

/**
 * 能量分配逻辑
 * @param terminals 所有Terminal状态
 */
function distributeEnergy(terminals: { [roomName: string]: any }): void {
    const energyThreshold = 100000; // 100k能量阈值
    const transferAmount = 50000;   // 每次传输50k

    const energyRich: string[] = [];
    const energyPoor: string[] = [];

    // 分类房间
    for (const roomName in terminals) {
        const energy = terminals[roomName].store.getUsedCapacity(RESOURCE_ENERGY) || 0;
        if (energy > energyThreshold) {
            energyRich.push(roomName);
        } else if (energy < energyThreshold / 2) {
            energyPoor.push(roomName);
        }
    }

    // 执行分配
    energyRich.forEach(sourceRoom => {
        if (energyPoor.length > 0) {
            const targetRoom = energyPoor[0]; // 简单选择第一个需要能量的房间
            TerminalManager.addSendOrder(sourceRoom, RESOURCE_ENERGY, transferAmount, targetRoom, 1);
        }
    });
}

/**
 * 矿物分配逻辑
 * @param terminals 所有Terminal状态
 */
function distributeMinerals(terminals: { [roomName: string]: any }): void {
    // 基础矿物优先级
    const basicMinerals = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM];
    const advancedMinerals = [RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM, RESOURCE_OXIDANT];
    // const powerMinerals = [RESOURCE_ZYNTHIUM_KEANIUM, RESOURCE_UTRIUM_LEMERGIUM, RESOURCE_UTRIUM_HYDRIDE];

    // 为高级矿物设置传输订单
    for (const mineral of advancedMinerals) {
        const sources: string[] = [];
        const targets: string[] = [];

        for (const roomName in terminals) {
            const amount = terminals[roomName].store.getUsedCapacity(mineral) || 0;
            if (amount > 5000) {
                sources.push(roomName);
            } else if (amount < 1000 && terminals[roomName].store.getCapacity() > 0) {
                targets.push(roomName);
            }
        }

        if (sources.length > 0 && targets.length > 0) {
            const sourceRoom = sources[0];
            const targetRoom = targets[0];
            TerminalManager.addSendOrder(sourceRoom, mineral, 2000, targetRoom, 3);
        }
    }
}

/**
 * 市场交易策略
 * 自动进行买卖操作以优化资源配置
 */
export function marketTradingStrategy(): void {
    // 检查信用点余额
    if (Game.market.credits < 100000) {
        console.log('信用点不足，跳过市场交易');
        return;
    }

    // 买入策略：购买短缺的基础资源
    buyNeededResources();

    // 卖出策略：出售过剩的矿物
    sellExcessResources();
}

/**
 * 买入需要的资源
 */
function buyNeededResources(): void {
    const neededResources = [
        { resource: RESOURCE_HYDROGEN, maxPrice: 0.5, amount: 5000 },
        { resource: RESOURCE_OXYGEN, maxPrice: 0.5, amount: 5000 },
        { resource: RESOURCE_UTRIUM, maxPrice: 1.0, amount: 2000 }
    ];

    // 找到一个有Terminal的房间作为接收点
    let targetRoom: string | null = null;
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my && room.terminal) {
            targetRoom = roomName;
            break;
        }
    }

    if (!targetRoom) {
        console.log('没有可用的Terminal进行市场交易');
        return;
    }

    neededResources.forEach(({ resource, maxPrice, amount }) => {
        TerminalManager.buyFromMarket(targetRoom!, resource, amount, maxPrice);
    });
}

/**
 * 卖出过剩资源
 */
function sellExcessResources(): void {
    const sellThreshold = 10000; // 10k以上认为过剩
    const minPrices: { [key: string]: number } = {
        [RESOURCE_HYDROGEN]: 0.8,
        [RESOURCE_OXYGEN]: 0.8,
        [RESOURCE_UTRIUM]: 1.5,
        [RESOURCE_LEMERGIUM]: 1.5,
        [RESOURCE_KEANIUM]: 1.5,
        [RESOURCE_ZYNTHIUM]: 1.5,
        [RESOURCE_POWER]: 10.0
    };

    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (!room.controller || !room.controller.my || !room.terminal) {
            continue;
        }

        for (const resource in minPrices) {
            const amount = room.terminal.store.getUsedCapacity(resource as ResourceConstant);
            if (amount > sellThreshold) {
                const sellAmount = Math.min(amount - sellThreshold, 5000); // 最多卖5k
                TerminalManager.sellToMarket(roomName, resource as ResourceConstant, sellAmount, minPrices[resource]);
            }
        }
    }
}

/**
 * 全局Terminal管理函数（在main loop中调用）
 */
export function manageAllTerminals(): void {
    // 处理所有房间的发送订单
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my && room.terminal) {
            TerminalManager.processSendOrders(roomName);
        }
    }

    // 运行所有Terminal操作员
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.memory.role === 'terminalOperator') {
            runTerminalOperator(creep);
        }
    }

    // 每隔一段时间执行高级管理
    if (Game.time % 100 === 0) {
        smartResourceDistribution();
        TerminalManager.cleanup();
    }

    // 每隔更长时间执行市场交易
    if (Game.time % 500 === 0) {
        marketTradingStrategy();
    }

    // 每隔一段时间显示状态
    if (Game.time % 1000 === 0) {
        TerminalManager.debugTerminals();
    }
}

/**
 * 调试命令：全局Terminal命令
 */
export const GlobalTerminalCommands = {
    // 查看Terminal状态
    debug: (roomName?: string) => {
        TerminalManager.debugTerminals(roomName);
    },

    // 发送资源
    send: (fromRoom: string, toRoom: string, resource: string, amount: number) => {
        TerminalManager.sendResource(fromRoom, toRoom, resource as ResourceConstant, amount);
    },

    // 添加发送订单
    addOrder: (fromRoom: string, toRoom: string, resource: string, amount: number, priority?: number) => {
        TerminalManager.addSendOrder(fromRoom, resource as ResourceConstant, amount, toRoom, priority);
    },

    // 市场买入
    buy: (roomName: string, resource: string, amount: number, maxPrice: number) => {
        TerminalManager.buyFromMarket(roomName, resource as ResourceConstant, amount, maxPrice);
    },

    // 市场卖出
    sell: (roomName: string, resource: string, amount: number, minPrice: number) => {
        TerminalManager.sellToMarket(roomName, resource as ResourceConstant, amount, minPrice);
    },

    // 查看交易历史
    history: (limit?: number) => {
        const history = TerminalManager.getTradeHistory(limit);
        console.log('=== 交易历史 ===');
        history.forEach(record => {
            const time = new Date(record.timestamp * 1000).toLocaleString();
            console.log(`${time} [${record.type}] ${record.amount} ${record.resourceType} ${record.price ? `@ ${record.price}` : ''}`);
        });
        console.log('=== 历史结束 ===');
    },

    // 创建Terminal操作员
    createOperator: (spawnName: string, roomName: string) => {
        createTerminalOperator(spawnName, roomName);
    },

    // 资源平衡
    balance: (resource?: string) => {
        if (resource) {
            TerminalManager.autoBalanceResource(resource as ResourceConstant);
        } else {
            smartResourceDistribution();
        }
    }
};

export default {
    setupResourceBalance,
    createTerminalOperator,
    runTerminalOperator,
    smartResourceDistribution,
    marketTradingStrategy,
    manageAllTerminals,
    GlobalTerminalCommands
};
