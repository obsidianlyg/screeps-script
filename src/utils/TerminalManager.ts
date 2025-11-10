/**
 * Terminal管理工具类
 * 负责Terminal的资源发送、接收和市场交易
 */

// 资源发送订单接口
interface ResourceOrder {
    resourceType: ResourceConstant;
    amount: number;
    targetRoomName: string;
    priority: number; // 优先级，数字越小优先级越高
}

// 终端状态接口
interface TerminalStatus {
    id: Id<StructureTerminal>;
    roomName: string;
    pos: RoomPosition;
    store: Store<ResourceConstant, false>;
    totalResources: number;
    capacity: number;
    percentage: number;
    cooldown: number;
}

// 交易记录接口
interface TradeRecord {
    timestamp: number;
    type: 'send' | 'receive' | 'buy' | 'sell';
    resourceType: ResourceConstant;
    amount: number;
    fromRoom?: string;
    toRoom?: string;
    price?: number;
}

const TerminalManager = {
    /**
     * 1. 发送资源到指定房间的Terminal
     * @param sourceRoomName 源房间名称
     * @param targetRoomName 目标房间名称
     * @param resourceType 资源类型
     * @param amount 发送数量
     * @param priority 优先级（可选）
     * @returns 发送结果码
     */
    sendResource(
        sourceRoomName: string,
        targetRoomName: string,
        resourceType: ResourceConstant,
        amount: number,
        priority: number = 5
    ): ScreepsReturnCode {
        const sourceRoom = Game.rooms[sourceRoomName];
        if (!sourceRoom) {
            console.log(`找不到源房间: ${sourceRoomName}`);
            return ERR_INVALID_TARGET;
        }

        const terminal = sourceRoom.terminal;
        if (!terminal) {
            console.log(`房间 ${sourceRoomName} 没有Terminal`);
            return ERR_INVALID_TARGET;
        }

        // 检查Terminal是否在冷却中
        if (terminal.cooldown > 0) {
            console.log(`Terminal在冷却中，还需等待 ${terminal.cooldown} tick`);
            return ERR_TIRED;
        }

        // 检查是否有足够的资源
        const availableAmount = terminal.store.getUsedCapacity(resourceType);
        if (availableAmount < amount) {
            console.log(`资源不足: 需要 ${amount} ${resourceType}，只有 ${availableAmount}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 检查Terminal容量限制（每次发送最多100k资源）
        const maxSendAmount = Math.min(amount, 100000);
        if (maxSendAmount < amount) {
            console.log(`调整发送数量: 从 ${amount} 调整为 ${maxSendAmount}`);
        }

        // 执行发送
        const result = terminal.send(resourceType, maxSendAmount, targetRoomName);

        if (result === OK) {
            console.log(`✅ 发送成功: ${maxSendAmount} ${resourceType} 从 ${sourceRoomName} 到 ${targetRoomName}`);
            this.recordTrade('send', resourceType, maxSendAmount, sourceRoomName, targetRoomName);

        } else if (result === ERR_NOT_ENOUGH_RESOURCES) {
            console.log("Terminal 资源不足或运输能量不足。");
        } else {
            console.log(`❌ 发送失败: ${result} ${resourceType} 从 ${sourceRoomName} 到 ${targetRoomName}`);
        }

        return result;
    },

    /**
     * 2. 从指定房间的Terminal接收资源（通过creep提取）
     * @param roomName 房间名称
     * @param creep 执行提取的creep
     * @param resourceType 资源类型
     * @param amount 提取数量，默认为creep的空余容量
     * @returns 是否成功执行提取操作
     */
    receiveResource(
        roomName: string,
        creep: Creep,
        resourceType: ResourceConstant = RESOURCE_ENERGY,
        amount?: number
    ): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`找不到房间: ${roomName}`);
            return false;
        }

        const terminal = room.terminal;
        if (!terminal) {
            creep.say('❌ 无Terminal');
            return false;
        }

        // 检查Terminal是否有指定资源
        const availableAmount = terminal.store.getUsedCapacity(resourceType);
        if (availableAmount === 0) {
            creep.say('❌ 无资源');
            return false;
        }

        // 计算提取数量
        const withdrawAmount = amount || Math.min(
            creep.store.getFreeCapacity(resourceType),
            availableAmount
        );

        if (withdrawAmount <= 0) {
            creep.say('❌ 容量不足');
            return false;
        }

        // 执行提取
        const result = creep.withdraw(terminal, resourceType, withdrawAmount);

        if (result === OK) {
            creep.say(`📤 ${withdrawAmount}`);
            console.log(`${creep.name} 从Terminal提取 ${withdrawAmount} ${resourceType}`);
            this.recordTrade('receive', resourceType, withdrawAmount, roomName);
            return true;
        } else if (result === ERR_NOT_IN_RANGE) {
            creep.moveTo(terminal, {
                visualizePathStyle: { stroke: '#ff00ff' },
                range: 1
            });
            creep.say('🚶 移动中');
            return true;
        } else {
            console.log(`${creep.name} 从Terminal提取失败: ${result}`);
            creep.say('❌ 提取失败');
            return false;
        }
    },

    /**
     * 3. 批量处理待发送的订单
     * @param roomName 房间名称
     * @returns 是否处理了订单
     */
    processSendOrders(roomName: string): boolean {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) {
            return false;
        }

        // 初始化内存结构
        if (!Memory.terminalOrders) {
            Memory.terminalOrders = {};
        }
        if (!Memory.terminalOrders[roomName]) {
            Memory.terminalOrders[roomName] = [];
        }

        const roomOrders = Memory.terminalOrders[roomName];
        if (roomOrders.length === 0) {
            return false;
        }

        // 按优先级排序
        roomOrders.sort((a: ResourceOrder, b: ResourceOrder) => a.priority - b.priority);

        // 处理最高优先级的订单
        const order = roomOrders[0];
        const result = this.sendResource(roomName, order.targetRoomName, order.resourceType, order.amount, order.priority);

        if (result === OK) {
            // 移除已处理的订单
            roomOrders.shift();
            Memory.terminalOrders[roomName] = roomOrders;
            return true;
        } else if (result === ERR_TIRED) {
            // Terminal在冷却中，等待下次处理
            return false;
        } else {
            // 订单无效，移除
            roomOrders.shift();
            Memory.terminalOrders[roomName] = roomOrders;
            return false;
        }
    },

    /**
     * 4. 添加发送订单到队列
     * @param roomName 房间名称
     * @param resourceType 资源类型
     * @param amount 数量
     * @param targetRoomName 目标房间
     * @param priority 优先级
     */
    addSendOrder(
        roomName: string,
        resourceType: ResourceConstant,
        amount: number,
        targetRoomName: string,
        priority: number = 5
    ): void {
        // 初始化内存结构
        if (!Memory.terminalOrders) {
            Memory.terminalOrders = {};
        }
        if (!Memory.terminalOrders[roomName]) {
            Memory.terminalOrders[roomName] = [];
        }

        const order: ResourceOrder = {
            resourceType,
            amount,
            targetRoomName,
            priority
        };

        Memory.terminalOrders[roomName].push(order);
        console.log(`添加发送订单: ${amount} ${resourceType} 从 ${roomName} 到 ${targetRoomName} (优先级: ${priority})`);
    },

    /**
     * 5. 从市场购买资源
     * @param roomName 房间名称
     * @param resourceType 资源类型
     * @param amount 购买数量
     * @param maxPrice 最高价格
     * @returns 购买结果码
     */
    buyFromMarket(
        roomName: string,
        resourceType: ResourceConstant,
        amount: number,
        maxPrice: number
    ): ScreepsReturnCode {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) {
            return ERR_INVALID_TARGET;
        }

        // 检查终端是否有足够的信用点
        if (Game.market.credits < maxPrice * amount) {
            console.log(`信用点不足: 需要 ${maxPrice * amount}，只有 ${Game.market.credits}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 执行购买
        const orders = Game.market.getAllOrders({
            type: ORDER_SELL,
            resourceType: resourceType
        });

        // 按价格排序，选择最便宜的
        orders.sort((a, b) => a.price - b.price);

        if (orders.length === 0) {
            console.log(`市场上没有 ${resourceType} 的出售订单`);
            return ERR_NOT_FOUND;
        }

        const bestOrder = orders[0];
        if (bestOrder.price > maxPrice) {
            console.log(`市场价格过高: ${bestOrder.price} > ${maxPrice}`);
            return ERR_INVALID_ARGS;
        }

        const result = Game.market.deal(bestOrder.id, amount, roomName);

        if (result === OK) {
            console.log(`✅ 购买成功: ${amount} ${resourceType} 价格 ${bestOrder.price}`);
            this.recordTrade('buy', resourceType, amount, roomName, undefined, bestOrder.price);
        } else {
            console.log(`❌ 购买失败: ${result}`);
        }

        return result;
    },

    /**
     * 6. 向市场出售资源
     * @param roomName 房间名称
     * @param resourceType 资源类型
     * @param amount 出售数量
     * @param minPrice 最低价格
     * @returns 出售结果码
     */
    sellToMarket(
        roomName: string,
        resourceType: ResourceConstant,
        amount: number,
        minPrice: number
    ): ScreepsReturnCode {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) {
            return ERR_INVALID_TARGET;
        }

        const terminal = room.terminal;

        // 检查是否有足够的资源
        const availableAmount = terminal.store.getUsedCapacity(resourceType);
        if (availableAmount < amount) {
            console.log(`资源不足: 需要 ${amount} ${resourceType}，只有 ${availableAmount}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 查找市场收购订单
        const orders = Game.market.getAllOrders({
            type: ORDER_BUY,
            resourceType: resourceType
        });

        // 按价格排序，选择最高的
        orders.sort((a, b) => b.price - a.price);

        if (orders.length === 0) {
            console.log(`市场上没有 ${resourceType} 的收购订单`);
            return ERR_NOT_FOUND;
        }

        const bestOrder = orders[0];
        if (bestOrder.price < minPrice) {
            console.log(`市场收购价过低: ${bestOrder.price} < ${minPrice}`);
            return ERR_INVALID_ARGS;
        }

        const result = Game.market.deal(bestOrder.id, amount, roomName);

        if (result === OK) {
            console.log(`✅ 出售成功: ${amount} ${resourceType} 价格 ${bestOrder.price}`);
            this.recordTrade('sell', resourceType, amount, roomName, undefined, bestOrder.price);
        } else {
            console.log(`❌ 出售失败: ${result}`);
        }

        return result;
    },

    /**
     * 7. 获取房间Terminal状态
     * @param roomName 房间名称
     * @returns Terminal状态或null
     */
    getTerminalStatus(roomName: string): TerminalStatus | null {
        const room = Game.rooms[roomName];
        if (!room || !room.terminal) {
            return null;
        }

        const terminal = room.terminal;
        const totalResources = Object.values(terminal.store).reduce((sum, amount) => sum + amount, 0);

        return {
            id: terminal.id,
            roomName: roomName,
            pos: terminal.pos,
            store: terminal.store,
            totalResources,
            capacity: terminal.store.getCapacity(),
            percentage: totalResources > 0 ? (totalResources / terminal.store.getCapacity()) * 100 : 0,
            cooldown: terminal.cooldown
        };
    },

    /**
     * 8. 自动平衡资源：在房间间自动分配资源
     * @param resourceType 资源类型
     * @param threshold 阈值百分比
     * @returns 是否执行了传输
     */
    autoBalanceResource(resourceType: ResourceConstant, threshold: number = 70): boolean {
        const terminals: TerminalStatus[] = [];

        // 收集所有有Terminal的房间状态
        for (const roomName in Game.rooms) {
            const room = Game.rooms[roomName];
            if (room.controller && room.controller.my && room.terminal) {
                const status = this.getTerminalStatus(roomName);
                if (status) {
                    terminals.push(status);
                }
            }
        }

        if (terminals.length < 2) {
            return false;
        }

        // 找到资源最多和最少的Terminal
        const sortedTerminals = [...terminals].sort((a, b) => {
            const amountA = a.store.getUsedCapacity(resourceType) || 0;
            const amountB = b.store.getUsedCapacity(resourceType) || 0;
            return amountB - amountA;
        });

        const richest = sortedTerminals[0];
        const poorest = sortedTerminals[sortedTerminals.length - 1];

        const richestAmount = richest.store.getUsedCapacity(resourceType) || 0;
        const poorestAmount = poorest.store.getUsedCapacity(resourceType) || 0;

        const richestPercentage = richestAmount > 0 ? (richestAmount / richest.capacity) * 100 : 0;
        const poorestPercentage = poorestAmount > 0 ? (poorestAmount / poorest.capacity) * 100 : 0;

        // 检查是否需要传输
        if (richestPercentage > threshold && poorestPercentage < threshold - 20) {
            const surplus = richestAmount - (richest.capacity * threshold / 100);
            const transferAmount = Math.floor(Math.min(surplus / 2, 50000)); // 最多传输50k

            if (transferAmount > 0) {
                const result = this.sendResource(richest.roomName, poorest.roomName, resourceType, transferAmount);
                return result === OK;
            }
        }

        return false;
    },

    /**
     * 9. 记录交易历史
     * @param type 交易类型
     * @param resourceType 资源类型
     * @param amount 数量
     * @param fromRoom 源房间
     * @param toRoom 目标房间
     * @param price 价格（市场交易）
     */
    recordTrade(
        type: 'send' | 'receive' | 'buy' | 'sell',
        resourceType: ResourceConstant,
        amount: number,
        fromRoom?: string,
        toRoom?: string,
        price?: number
    ): void {
        // 初始化交易历史
        if (!Memory.tradeHistory) {
            Memory.tradeHistory = [];
        }

        const record: TradeRecord = {
            timestamp: Game.time,
            type,
            resourceType,
            amount,
            fromRoom,
            toRoom,
            price
        };

        Memory.tradeHistory.push(record);

        // 保持历史记录不超过100条
        if (Memory.tradeHistory.length > 100) {
            Memory.tradeHistory = Memory.tradeHistory.slice(-100);
        }
    },

    /**
     * 10. 获取交易历史
     * @param limit 限制条数
     * @returns 交易历史记录
     */
    getTradeHistory(limit: number = 20): TradeRecord[] {
        // 初始化交易历史
        if (!Memory.tradeHistory) {
            Memory.tradeHistory = [];
        }

        return Memory.tradeHistory.slice(-limit);
    },

    /**
     * 11. 调试函数：显示Terminal状态
     * @param roomName 房间名称，可选
     */
    debugTerminals(roomName?: string): void {
        console.log('=== Terminal状态报告 ===');

        if (roomName) {
            // 显示指定房间的Terminal状态
            const status = this.getTerminalStatus(roomName);
            if (status) {
                this.printTerminalStatus(status);
            } else {
                console.log(`房间 ${roomName} 没有Terminal`);
            }
        } else {
            // 显示所有房间的Terminal状态
            let totalTerminals = 0;
            let totalResources = 0;
            let totalCapacity = 0;

            for (const name in Game.rooms) {
                const room = Game.rooms[name];
                if (room.controller && room.controller.my && room.terminal) {
                    const status = this.getTerminalStatus(name);
                    if (status) {
                        totalTerminals++;
                        totalResources += status.totalResources;
                        totalCapacity += status.capacity;
                        this.printTerminalStatus(status);
                    }
                }
            }

            console.log(`\n=== 总体统计 ===`);
            console.log(`Terminal总数: ${totalTerminals}`);
            console.log(`总资源: ${totalResources}`);
            console.log(`总容量: ${totalCapacity}`);
            console.log(`平均利用率: ${totalCapacity > 0 ? ((totalResources / totalCapacity) * 100).toFixed(1) : 0}%`);
        }

        // 显示待发送订单
        if (Memory.terminalOrders) {
            console.log(`\n=== 待发送订单 ===`);
            let hasOrders = false;
            for (const room in Memory.terminalOrders) {
                const orders = Memory.terminalOrders[room];
                if (orders && orders.length > 0) {
                    hasOrders = true;
                    console.log(`房间 ${room}: ${orders.length} 个订单`);
                    orders.forEach((order, index) => {
                        console.log(`  ${index + 1}. ${order.amount} ${order.resourceType} -> ${order.targetRoomName} (优先级: ${order.priority})`);
                    });
                }
            }
            if (!hasOrders) {
                console.log('暂无待发送订单');
            }
        } else {
            console.log('\n=== 待发送订单 ===');
            console.log('暂无待发送订单');
        }

        console.log('=== 报告结束 ===');
    },

    /**
     * 辅助函数：打印单个Terminal状态
     * @param status Terminal状态
     */
    printTerminalStatus(status: TerminalStatus): void {
        console.log(`\n房间 ${status.roomName}:`);
        console.log(`  - 位置: (${status.pos.x}, ${status.pos.y})`);
        console.log(`  - 利用率: ${status.percentage.toFixed(1)}% (${status.totalResources}/${status.capacity})`);
        console.log(`  - 冷却: ${status.cooldown} tick`);

        // 显示主要资源
        const importantResources = [RESOURCE_ENERGY, RESOURCE_POWER, 'H', 'O', 'U', 'L', 'K', 'Z', 'X'];
        const resources: string[] = [];

        importantResources.forEach(resource => {
            const amount = status.store.getUsedCapacity(resource as ResourceConstant);
            if (amount && amount > 0) {
                resources.push(`${resource}: ${amount}`);
            }
        });

        if (resources.length > 0) {
            console.log(`  - 资源: ${resources.join(', ')}`);
        }
    },

    /**
     * 12. 初始化Memory结构
     */
    initializeMemory(): void {
        // 初始化terminalOrders
        if (!Memory.terminalOrders) {
            Memory.terminalOrders = {};
        }

        // 初始化tradeHistory
        if (!Memory.tradeHistory) {
            Memory.tradeHistory = [];
        }

        console.log('Terminal Memory结构已初始化');
    },

    /**
     * 13. 清理过期记录和订单
     */
    cleanup(): void {
        // 确保Memory结构存在
        this.initializeMemory();

        // 清理过期的交易记录
        if (Memory.tradeHistory && Memory.tradeHistory.length > 100) {
            Memory.tradeHistory = Memory.tradeHistory.slice(-100);
        }

        // 清理空的订单列表
        if (Memory.terminalOrders) {
            for (const room in Memory.terminalOrders) {
                if (Memory.terminalOrders[room] && Memory.terminalOrders[room].length === 0) {
                    delete Memory.terminalOrders[room];
                }
            }
        }
    }
};

export default TerminalManager;
