// /**
//  * 矿物运输系统使用示例
//  * 展示如何设置和使用矿物运输功能
//  */

// import transporterRole from '../roles/transporter';
// import { CreepRole } from '../utils/bodyUtils';

// // 矿物类型常量
// const MINERAL_TYPES = {
//     UTRIUM: RESOURCE_UTRIUM,
//     LEMERGIUM: RESOURCE_LEMERGIUM,
//     KELANIUM: RESOURCE_KELANIUM,
//     ZYNTHIUM: RESOURCE_ZYNTHIUM,
//     OXYGEN: RESOURCE_OXYGEN,
//     HYDROGEN: RESOURCE_HYDROGEN,
//     CATIUM: RESOURCE_CATIUM,
//     KEANIUM: RESOURCE_KEANIUM,
//     GHODIUM: RESOURCE_GHODIUM
// } as const;

// /**
//  * 检查房间是否有矿物需要运输
//  */
// export function checkRoomMinerals(roomName: string): { hasMinerals: boolean, mineralType?: ResourceConstant } {
//     const room = Game.rooms[roomName];
//     if (!room) return { hasMinerals: false };

//     // 查找房间中的矿物
//     const minerals = room.find(FIND_MINERALS);
//     if (minerals.length === 0) return { hasMinerals: false };

//     const mineral = minerals[0];
//     const mineralType = mineral.mineralType;

//     // 检查是否有容器中的矿物需要搬运
//     const containersWithMinerals = room.find(FIND_STRUCTURES, {
//         filter: (structure) => {
//             return (structure.structureType === STRUCTURE_CONTAINER || structure.structureType === STRUCTURE_STORAGE) &&
//                    structure.store.getUsedCapacity(mineralType) > 100; // 至少有100个单位才值得搬运
//         }
//     });

//     return {
//         hasMinerals: containersWithMinerals.length > 0,
//         mineralType: mineralType
//     };
// }

// /**
//  * 为房间设置矿物运输系统
//  */
// export function setupMineralTransport(spawnName: string, sourceRoomName?: string, targetRoomName?: string) {
//     const spawn = Game.spawns[spawnName];
//     if (!spawn) {
//         console.log(`找不到 Spawn: ${spawnName}`);
//         return;
//     }

//     const room = spawn.room;
//     const sourceRoom = sourceRoomName ? Game.rooms[sourceRoomName] : room;
//     const targetRoom = targetRoomName ? Game.rooms[targetRoomName] : room;

//     // 检查源房间是否有矿物
//     const { hasMinerals, mineralType } = checkRoomMinerals(sourceRoom.name);
//     if (!hasMinerals || !mineralType) {
//         console.log(`房间 ${sourceRoom.name} 没有矿物需要运输`);
//         return;
//     }

//     console.log(`为房间 ${room.name} 设置 ${mineralType} 矿物运输系统`);
//     console.log(`源房间: ${sourceRoom.name}, 目标房间: ${targetRoom.name}`);

//     // 创建专门的矿物运输者
//     transporterRole.createMineralTransporter(spawn, mineralType, sourceRoom.name, targetRoom.name);
// }

// /**
//  * 创建智能运输者（可以同时处理能量和矿物）
//  */
// export function createSmartTransporter(spawn: StructureSpawn, count: number = 1) {
//     const spawnName = spawn.name;

//     // 统计当前智能运输者数量
//     const smartTransporters = _.filter(Game.creeps, (creep) =>
//         creep.memory.role === 'transporter' + spawnName &&
//         creep.memory.transportMode === 'smart'
//     );

//     const availableEnergy = spawn.store.getUsedCapacity(RESOURCE_ENERGY);

//     if (smartTransporters.length < count && availableEnergy >= 200) {
//         const newName = `SmartTransporter_${Game.time}`;

//         console.log(`尝试生成新的智能运输者: ${newName}`);

//         const result = spawn.spawnCreep([CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE], newName, {
//             memory: {
//                 role: 'transporter' + spawnName,
//                 room: spawnName,
//                 working: false,
//                 transportTarget: null,
//                 isGettingEnergy: false,
//                 transportMode: 'smart' // 设置为智能模式
//             }
//         });

//         if (result === OK) {
//             console.log(`成功将 ${newName} 加入到生成队列。`);
//         } else if (result === ERR_NOT_ENOUGH_ENERGY) {
//             console.log(`能量不足，无法生成智能运输者。`);
//         } else if (result === ERR_BUSY) {
//             // 正常情况，Spawn 正在忙碌
//         } else {
//             console.log(`生成智能运输者时发生错误: ${result}`);
//         }
//     }
// }

// /**
//  * 设置跨房间矿物贸易
//  */
// export function setupMineralTrading() {
//     // 定义贸易路线配置
//     const tradeRoutes = [
//         {
//             sourceRoom: 'W5N3',  // 采矿房间
//             targetRoom: 'W5N2',  // 存储房间
//             mineralType: RESOURCE_UTRIUM
//         },
//         {
//             sourceRoom: 'W6N3',  // 采矿房间
//             targetRoom: 'W5N2',  // 存储房间
//             mineralType: RESOURCE_LEMERGIUM
//         }
//     ];

//     for (const route of tradeRoutes) {
//         const sourceSpawn = Game.spawns[Object.keys(Game.spawns).find(spawnName =>
//             Game.spawns[spawnName].room.name === route.sourceRoom
//         )];

//         const targetSpawn = Game.spawns[Object.keys(Game.spawns).find(spawnName =>
//             Game.spawns[spawnName].room.name === route.targetRoom
//         )];

//         if (sourceSpawn && targetSpawn) {
//             // 从源房间创建矿物运输者
//             transporterRole.createMineralTransporter(
//                 sourceSpawn,
//                 route.mineralType,
//                 route.sourceRoom,
//                 route.targetRoom
//             );

//             console.log(`设置矿物贸易路线: ${route.sourceRoom} -> ${route.targetRoom} (${route.mineralType})`);
//         }
//     }
// }

// /**
//  * 监控和调试矿物运输状态
//  */
// export function debugMineralTransport() {
//     console.log('=== 矿物运输系统状态 ===');

//     // 统计各种模式的运输者
//     const energyTransporters = _.filter(Game.creeps, creep =>
//         creep.memory.role && creep.memory.role.includes('transporter') &&
//         (!creep.memory.transportMode || creep.memory.transportMode === 'energy')
//     );

//     const mineralTransporters = _.filter(Game.creeps, creep =>
//         creep.memory.role && creep.memory.role.includes('transporter') &&
//         creep.memory.transportMode === 'mineral'
//     );

//     const smartTransporters = _.filter(Game.creeps, creep =>
//         creep.memory.role && creep.memory.role.includes('transporter') &&
//         creep.memory.transportMode === 'smart'
//     );

//     console.log(`能量运输者: ${energyTransporters.length}`);
//     console.log(`矿物运输者: ${mineralTransporters.length}`);
//     console.log(`智能运输者: ${smartTransporters.length}`);

//     // 显示矿物运输者详情
//     for (const transporter of mineralTransporters) {
//         const mineralType = transporter.memory.targetMineral;
//         const sourceRoom = transporter.memory.sourceRoom;
//         const targetRoom = transporter.memory.targetRoom;
//         const currentLoad = transporter.store.getUsedCapacity(mineralType as ResourceConstant);

//         console.log(`矿物运输者 ${transporter.name}:`);
//         console.log(`  - 矿物类型: ${mineralType}`);
//         console.log(`  - 源房间: ${sourceRoom}`);
//         console.log(`  - 目标房间: ${targetRoom}`);
//         console.log(`  - 当前负载: ${currentLoad}`);
//         console.log(`  - 状态: ${transporter.memory.isGettingMineral ? '获取矿物' : '运输矿物'}`);
//     }

//     // 检查各房间矿物状态
//     for (const roomName of Object.keys(Game.rooms)) {
//         const { hasMinerals, mineralType } = checkRoomMinerals(roomName);
//         if (hasMinerals) {
//             console.log(`房间 ${roomName} 有 ${mineralType} 矿物可运输`);
//         }
//     }

//     console.log('=== 状态报告结束 ===');
// }

// /**
//  * 手动控制运输者模式切换
//  */
// export function switchTransporterMode(creepName: string, newMode: 'energy' | 'mineral' | 'smart') {
//     const creep = Game.creeps[creepName];
//     if (!creep) {
//         console.log(`找不到 Creep: ${creepName}`);
//         return;
//     }

//     creep.memory.transportMode = newMode;
//     console.log(`已将 ${creepName} 切换到 ${newMode} 模式`);

//     // 如果切换到矿物模式，需要设置矿物类型
//     if (newMode === 'mineral' && !creep.memory.targetMineral) {
//         const room = creep.room;
//         const minerals = room.find(FIND_MINERALS);
//         if (minerals.length > 0) {
//             creep.memory.targetMineral = minerals[0].mineralType;
//             console.log(`自动设置矿物类型: ${minerals[0].mineralType}`);
//         }
//     }
// }

// // 导出函数供其他模块使用
// export default {
//     checkRoomMinerals,
//     setupMineralTransport,
//     createSmartTransporter,
//     setupMineralTrading,
//     debugMineralTransport,
//     switchTransporterMode,
//     MINERAL_TYPES
// };
