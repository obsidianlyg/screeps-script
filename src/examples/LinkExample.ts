/**
 * Link使用示例
 * 展示如何使用LinkManager进行各种Link操作
 */

import LinkManager from '../utils/LinkManager';

/**
 * 设置房间内的Link能量传输系统
 * @param roomName 房间名称
 */
export function setupLinkSystem(roomName: string): void {
    const room = Game.rooms[roomName];
    if (!room) {
        console.log(`找不到房间: ${roomName}`);
        return;
    }

    console.log(`为房间 ${roomName} 设置Link能量系统`);

    // 获取房间内所有Link状态
    const links = LinkManager.getAllLinksStatus(room);

    if (links.length < 2) {
        console.log(`房间 ${roomName} Link数量不足 (${links.length}个)，无法设置传输系统`);
        return;
    }

    // 示例：设置自动均衡
    console.log('启用Link自动均衡功能');
}

/**
 * 为指定creep配置Link操作
 * @param creepName creep名称
 * @param operation 操作类型
 */
export function configureCreepLinkOperation(creepName: string, operation: 'withdraw' | 'deposit' | 'auto'): void {
    const creep = Game.creeps[creepName];
    if (!creep) {
        console.log(`找不到creep: ${creepName}`);
        return;
    }

    console.log(`为creep ${creepName} 配置Link操作: ${operation}`);

    switch (operation) {
        case 'withdraw':
            // 配置为从Link提取能量
            creep.memory.operation = 'withdrawFromLink';
            break;
        case 'deposit':
            // 配置为向Link存入能量
            creep.memory.operation = 'depositToLink';
            break;
        case 'auto':
            // 自动判断操作
            creep.memory.operation = 'autoLink';
            break;
    }
}

/**
 * 创建专门的Link运输creep
 * @param spawnName spawn名称
 * @param roomName 目标房间
 */
export function createLinkTransporter(spawnName: string, roomName: string): void {
    const spawn = Game.spawns[spawnName];
    if (!spawn) {
        console.log(`找不到spawn: ${spawnName}`);
        return;
    }

    // Link运输者身体配置：主要是CARRY和MOVE
    const body: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

    const existingTransporters = _.filter(Game.creeps, creep =>
        creep.memory.role === 'linkTransporter' && creep.room.name === roomName
    );

    if (existingTransporters.length < 1) {
        const newName = `LinkTransporter_${Game.time}`;

        console.log(`创建Link运输者: ${newName}`);

        const result = spawn.spawnCreep(body, newName, {
            memory: {
                role: 'linkTransporter',
                room: roomName,
                working: false,
                operation: 'autoLink'
            }
        });

        if (result === OK) {
            console.log(`成功创建Link运输者: ${newName}`);
        } else {
            console.log(`创建Link运输者失败: ${result}`);
        }
    }
}

/**
 * Link运输者运行逻辑
 * @param creep Link运输者creep
 */
export function runLinkTransporter(creep: Creep): void {
    const room = creep.room;
    const operation = creep.memory.operation as string;

    // 如果没有能量，尝试从Link提取
    if (creep.store.getUsedCapacity(RESOURCE_ENERGY) === 0) {
        creep.say('⚡ 取能量');

        if (operation === 'withdrawFromLink' || operation === 'autoLink') {
            // 尝试从Link提取能量
            if (LinkManager.withdrawEnergyFromLink(room, creep)) {
                return; // 成功开始提取操作
            }
        }

        // 如果无法从Link提取，尝试从其他源获取能量
        // 这里可以添加其他能量源逻辑
        creep.say('❌ 无能量源');
        return;
    }

    // 如果有能量，尝试存入Link或其他目标
    creep.say('📦 存能量');

    if (operation === 'depositToLink' || operation === 'autoLink') {
        // 尝试向Link存入能量
        if (LinkManager.depositEnergyToLink(room, creep)) {
            return; // 成功开始存入操作
        }
    }

    // 如果无法存入Link，尝试其他目标
    // 这里可以添加其他存储逻辑
    creep.say('❌ 无存储目标');
}

/**
 * 手动控制Link间传输
 * @param sourceRoomName 源房间名称
 * @param targetRoomName 目标房间名称
 * @param amount 传输数量
 */
export function manualLinkTransfer(sourceRoomName: string, targetRoomName: string, amount?: number): void {
    const sourceRoom = Game.rooms[sourceRoomName];
    const targetRoom = Game.rooms[targetRoomName];

    if (!sourceRoom || !targetRoom) {
        console.log('找不到指定房间');
        return;
    }

    // 查找源房间中最有能量的Link
    const sourceLink = LinkManager.findBestSourceLink(sourceRoom);
    if (!sourceLink) {
        console.log(`源房间 ${sourceRoomName} 没有可用的Link`);
        return;
    }

    // 查找目标房间中最需要能量的Link
    const targetLink = LinkManager.findBestReceiverLink(targetRoom);
    if (!targetLink) {
        console.log(`目标房间 ${targetRoomName} 没有可用的Link`);
        return;
    }

    // 执行传输
    const result = LinkManager.transferEnergyToLink(sourceLink.id, targetLink.id, amount);

    if (result === OK) {
        console.log(`手动传输成功: ${sourceRoomName} -> ${targetRoomName}`);
    } else {
        console.log(`手动传输失败: ${result}`);
    }
}

/**
 * 全局Link管理函数（在main loop中调用）
 */
export function manageAllLinks(): void {
    // 为每个房间进行Link管理
    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];

        // 只管理我控制的房间
        if (room.controller && room.controller.my) {
            // 自动均衡Link能量
            LinkManager.autoBalanceLinks(room);

            // 每隔一段时间显示Link状态
            if (Game.time % 100 === 0) {
                LinkManager.debugLinksStatus(room);
            }
        }
    }

    // 运行所有Link运输者
    for (const creepName in Game.creeps) {
        const creep = Game.creeps[creepName];
        if (creep.memory.role === 'linkTransporter') {
            runLinkTransporter(creep);
        }
    }
}

/**
 * 调试命令：显示所有房间的Link状态
 */
export function debugAllLinks(): void {
    console.log('=== 全局Link状态报告 ===');

    let totalLinks = 0;
    let totalEnergy = 0;
    let totalCapacity = 0;

    for (const roomName in Game.rooms) {
        const room = Game.rooms[roomName];
        if (room.controller && room.controller.my) {
            const links = LinkManager.getAllLinksStatus(room);
            totalLinks += links.length;

            links.forEach(link => {
                totalEnergy += link.energy;
                totalCapacity += link.capacity;
            });

            if (links.length > 0) {
                console.log(`\n房间 ${roomName}:`);
                LinkManager.debugLinksStatus(room);
            }
        }
    }

    console.log('\n=== 全局统计 ===');
    console.log(`总Link数量: ${totalLinks}`);
    console.log(`总能量: ${totalEnergy}`);
    console.log(`总容量: ${totalCapacity}`);
    console.log(`总体利用率: ${totalCapacity > 0 ? ((totalEnergy / totalCapacity) * 100).toFixed(1) : 0}%`);
    console.log('=== 报告结束 ===');
}

// 导出给全局使用的调试命令
export const GlobalLinkCommands = {
    debugLinks: (roomName?: string) => {
        if (roomName) {
            const room = Game.rooms[roomName];
            if (room) {
                LinkManager.debugLinksStatus(room);
            } else {
                console.log(`找不到房间: ${roomName}`);
            }
        } else {
            debugAllLinks();
        }
    },

    transfer: (sourceRoom: string, targetRoom: string, amount?: number) => {
        manualLinkTransfer(sourceRoom, targetRoom, amount);
    },

    balance: (roomName?: string) => {
        if (roomName) {
            const room = Game.rooms[roomName];
            if (room) {
                const result = LinkManager.autoBalanceLinks(room);
                console.log(`房间 ${roomName} 均衡结果: ${result ? '已执行' : '无需执行'}`);
            }
        } else {
            // 为所有房间执行均衡
            for (const name in Game.rooms) {
                const room = Game.rooms[name];
                if (room.controller && room.controller.my) {
                    LinkManager.autoBalanceLinks(room);
                }
            }
            console.log('已为所有房间执行Link均衡');
        }
    },

    createTransporter: (spawnName: string, roomName: string) => {
        createLinkTransporter(spawnName, roomName);
    }
};

export default {
    setupLinkSystem,
    configureCreepLinkOperation,
    createLinkTransporter,
    runLinkTransporter,
    manualLinkTransfer,
    manageAllLinks,
    debugAllLinks,
    GlobalLinkCommands
};