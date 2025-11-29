// // 实验室反应配方
// export interface LabReaction {
//     resultType: ResourceConstant;
//     reagent1: ResourceConstant;
//     reagent2: ResourceConstant;
// }

// // 实验室状态
// export interface LabState {
//     id: Id<StructureLab>;
//     pos: RoomPosition;
//     resourceType?: ResourceConstant;
//     amount: number;
//     cooldown: number;
// }

// // 反应任务
// export interface ReactionTask {
//     id: string;
//     resultType: ResourceConstant;
//     reagent1: ResourceConstant;
//     reagent2: ResourceConstant;
//     amount: number;
//     priority: number;
//     status: 'pending' | 'running' | 'completed' | 'failed';
//     created: number;
//     lab1Id?: Id<StructureLab>;
//     lab2Id?: Id<StructureLab>;
//     resultLabId?: Id<StructureLab>;
// }

// export default class LabManager {
//     // 可用的基础反应配方
//     private static readonly BASIC_REACTIONS: LabReaction[] = [
//         // --- 基础化合物 (Tier 1) ---
//         // H + O = OH (Oxidant)
//         { resultType: RESOURCE_OXIDANT, reagent1: RESOURCE_OXYGEN, reagent2: RESOURCE_HYDROGEN },
//         // U + L = UL (Utrium_Lemergite)
//         { resultType: RESOURCE_UTRIUM_LEMERGITE, reagent1: RESOURCE_UTRIUM, reagent2: RESOURCE_LEMERGIUM },

//         // ZK + UL = G
//         {resultType: RESOURCE_GHODIUM, reagent1: RESOURCE_ZYNTHIUM_KEANITE, reagent2: RESOURCE_UTRIUM_LEMERGITE },

//         // U + H = UH (Utrium_Hydride)
//         { resultType: RESOURCE_UTRIUM_HYDRIDE, reagent1: RESOURCE_UTRIUM, reagent2: RESOURCE_HYDROGEN },
//         // U + O = UO (Utrium_Oxide)
//         { resultType: RESOURCE_UTRIUM_OXIDE, reagent1: RESOURCE_UTRIUM, reagent2: RESOURCE_OXYGEN },

//         // K + H = KH (Keanium_Hydride)
//         { resultType: RESOURCE_KEANIUM_HYDRIDE, reagent1: RESOURCE_KEANIUM, reagent2: RESOURCE_HYDROGEN },
//         // K + O = KO (Keanium_Oxide)
//         { resultType: RESOURCE_KEANIUM_OXIDE, reagent1: RESOURCE_KEANIUM, reagent2: RESOURCE_OXYGEN },

//         // L + H = LH (Lemergium_Hydride)
//         { resultType: RESOURCE_LEMERGIUM_HYDRIDE, reagent1: RESOURCE_LEMERGIUM, reagent2: RESOURCE_HYDROGEN },
//         // L + O = LO (Lemergium_Oxide)
//         { resultType: RESOURCE_LEMERGIUM_OXIDE, reagent1: RESOURCE_LEMERGIUM, reagent2: RESOURCE_OXYGEN },

//         // Z + H = ZH (Zynthium_Hydride)
//         { resultType: RESOURCE_ZYNTHIUM_HYDRIDE, reagent1: RESOURCE_ZYNTHIUM, reagent2: RESOURCE_HYDROGEN },
//         // Z + O = ZO (Zynthium_Oxide)
//         { resultType: RESOURCE_ZYNTHIUM_OXIDE, reagent1: RESOURCE_ZYNTHIUM, reagent2: RESOURCE_OXYGEN },

//         // G + H = GH (Ghodium_Hydride)
//         { resultType: RESOURCE_GHODIUM_HYDRIDE, reagent1: RESOURCE_GHODIUM, reagent2: RESOURCE_HYDROGEN },
//         // G + O = GO (Ghodium_Oxide)
//         { resultType: RESOURCE_GHODIUM_OXIDE, reagent1: RESOURCE_GHODIUM, reagent2: RESOURCE_OXYGEN },
//     ];

//     // 初始化实验室相关内存
//     static initializeMemory(roomName: string): void {
//         if (!Memory.reactionTasks) {
//             Memory.reactionTasks = {};
//         }
//         if (!Memory.reactionTasks[roomName]) {
//             Memory.reactionTasks[roomName] = [];
//         }
//     }

//     // 获取房间内所有实验室
//     static getLabs(roomName: string): StructureLab[] {
//         const room = Game.rooms[roomName];
//         if (!room) {
//             return [];
//         }
//         return room.find<StructureLab>(FIND_MY_STRUCTURES, {
//             filter: (structure): structure is StructureLab => structure.structureType === STRUCTURE_LAB
//         });
//     }

//     // 获取实验室状态
//     static getLabStates(roomName: string): LabState[] {
//         const labs = this.getLabs(roomName);
//         return labs.map(lab => ({
//             id: lab.id,
//             pos: lab.pos as RoomPosition,
//             resourceType: lab.mineralType,
//             amount: lab.mineralAmount || 0,
//             cooldown: lab.cooldown || 0
//         }));
//     }

//     // 查找指定资源的反应配方
//     static findReactionForProduct(productType: ResourceConstant): LabReaction | null {
//         return this.BASIC_REACTIONS.find(reaction => reaction.resultType === productType) || null;
//     }

//     // 检查是否可以执行反应
//     static canRunReaction(
//         lab1: StructureLab,
//         lab2: StructureLab,
//         resultLab: StructureLab,
//         reagent1: ResourceConstant,
//         reagent2: ResourceConstant
//     ): boolean {
//         // 检查冷却时间
//         if (lab1.cooldown > 0 || lab2.cooldown > 0 || resultLab.cooldown > 0) {
//             return false;
//         }

//         // 检查反应物
//         const hasReagent1 = lab1.mineralType === reagent1 && lab1.mineralAmount >= 5;
//         const hasReagent2 = lab2.mineralType === reagent2 && lab2.mineralAmount >= 5;

//         // 检查结果实验室是否有空间或正确的产物类型
//         const canAcceptResult = !resultLab.mineralType ||
//             resultLab.mineralType === REACTIONS[reagent1][reagent2];

//         return hasReagent1 && hasReagent2 && canAcceptResult;
//     }

//     // 执行实验室反应
//     static runReaction(
//         lab1: StructureLab,
//         lab2: StructureLab,
//         resultLab: StructureLab
//     ): ScreepsReturnCode {
//         return resultLab.runReaction(lab1, lab2);
//     }

//     // 添加反应任务
//     static addReactionTask(
//         roomName: string,
//         resultType: ResourceConstant,
//         amount: number,
//         priority: number = 1
//     ): string {
//         this.initializeMemory(roomName);

//         const reaction = this.findReactionForProduct(resultType);
//         if (!reaction) {
//             console.log(`ERROR: 未找到生产 ${resultType} 的配方`);
//             return '';
//         }

//         const taskId = `${roomName}_${resultType}_${Game.time}`;
//         const task: ReactionTask = {
//             id: taskId,
//             resultType: resultType,
//             reagent1: reaction.reagent1,
//             reagent2: reaction.reagent2,
//             amount: amount,
//             priority: priority,
//             status: 'pending',
//             created: Game.time
//         };

//         Memory.reactionTasks[roomName].push(task);

//         // 按优先级排序
//         Memory.reactionTasks[roomName].sort((a, b) => b.priority - a.priority);

//         console.log(`添加反应任务: ${resultType} x${amount}, 任务ID: ${taskId}`);
//         return taskId;
//     }

//     // 分配实验室给任务
//     static assignLabsToTask(roomName: string, task: ReactionTask): boolean {
//         const labStates = this.getLabStates(roomName);

//         // 分类实验室
//         const emptyLabs = labStates.filter(lab => !lab.resourceType);
//         const labsWithReagent1 = labStates.filter(lab => lab.resourceType === task.reagent1);
//         const labsWithReagent2 = labStates.filter(lab => lab.resourceType === task.reagent2);
//         const resultLabs = emptyLabs.filter(lab => !lab.resourceType);

//         // 需要至少2个反应物实验室和1个结果实验室
//         if (labStates.length < 3) {
//             console.log(`ERROR: 房间 ${roomName} 实验室数量不足`);
//             return false;
//         }

//         // 分配反应物实验室
//         let lab1Id: Id<StructureLab> | undefined;
//         let lab2Id: Id<StructureLab> | undefined;
//         let resultLabId: Id<StructureLab> | undefined;

//         // 查找有正确反应物的实验室
//         if (labsWithReagent1.length > 0) {
//             lab1Id = labsWithReagent1[0].id;
//         } else if (emptyLabs.length > 0) {
//             lab1Id = emptyLabs[0].id;
//         }

//         if (labsWithReagent2.length > 0) {
//             lab2Id = labsWithReagent2[0].id;
//         } else if (emptyLabs.length > 1) {
//             lab2Id = emptyLabs[1].id;
//         }

//         // 分配结果实验室
//         if (resultLabs.length > 0) {
//             resultLabId = resultLabs[0].id;
//         } else {
//             // 如果没有空实验室，尝试找一个有正确产物类型的实验室
//             const labsWithProduct = labStates.filter(lab => lab.resourceType === task.resultType);
//             if (labsWithProduct.length > 0) {
//                 resultLabId = labsWithProduct[0].id;
//             }
//         }

//         if (lab1Id && lab2Id && resultLabId) {
//             task.lab1Id = lab1Id;
//             task.lab2Id = lab2Id;
//             task.resultLabId = resultLabId;
//             task.status = 'running';
//             return true;
//         }

//         console.log(`ERROR: 无法为任务 ${task.id} 分配合适的实验室`);
//         return false;
//     }

//     // 执行反应任务
//     static executeReactionTask(roomName: string, task: ReactionTask): boolean {
//         if (!task.lab1Id || !task.lab2Id || !task.resultLabId) {
//             return false;
//         }

//         const lab1 = Game.getObjectById(task.lab1Id);
//         const lab2 = Game.getObjectById(task.lab2Id);
//         const resultLab = Game.getObjectById(task.resultLabId);

//         if (!lab1 || !lab2 || !resultLab) {
//             console.log(`ERROR: 无法找到任务 ${task.id} 的实验室`);
//             task.status = 'failed';
//             return false;
//         }

//         // 检查是否可以运行反应
//         if (!this.canRunReaction(lab1, lab2, resultLab, task.reagent1, task.reagent2)) {
//             return false;
//         }

//         // 执行反应
//         const result = this.runReaction(lab1, lab2, resultLab);
//         if (result === OK) {
//             task.amount -= 5; // 每次反应消耗5个单位
//             console.log(`执行反应: ${task.resultType}, 剩余数量: ${task.amount}`);

//             if (task.amount <= 0) {
//                 task.status = 'completed';
//                 console.log(`反应任务完成: ${task.id}`);
//             }
//             return true;
//         }

//         return false;
//     }

//     // 处理房间内的所有反应任务
//     static processReactionTasks(roomName: string): void {
//         this.initializeMemory(roomName);

//         if (!Memory.reactionTasks[roomName] || Memory.reactionTasks[roomName].length === 0) {
//             return;
//         }

//         // 清理过期或完成的任务
//         Memory.reactionTasks[roomName] = Memory.reactionTasks[roomName].filter(task => {
//             const isExpired = Game.time - task.created > 10000; // 10000 ticks 过期
//             const isCompleted = task.status === 'completed';
//             const isFailed = task.status === 'failed';

//             return !isExpired && !isCompleted && !isFailed;
//         });

//         // 执行任务
//         for (const task of Memory.reactionTasks[roomName]) {
//             if (task.status === 'pending') {
//                 this.assignLabsToTask(roomName, task);
//             } else if (task.status === 'running') {
//                 this.executeReactionTask(roomName, task);
//             }
//         }
//     }

//     // 获取房间资源状态
//     static getResourceStatus(roomName: string): Record<ResourceConstant, number> {
//         const room = Game.rooms[roomName];
//         if (!room) {
//             return {} as Record<ResourceConstant, number>;
//         }

//         const resources: Record<ResourceConstant, number> = {} as Record<ResourceConstant, number>;

//         // 检查存储
//         const storage = room.storage;
//         if (storage) {
//             for (const resource in storage.store) {
//                 const resourceType = resource as ResourceConstant;
//                 resources[resourceType] = (resources[resourceType] || 0) + storage.store[resourceType];
//             }
//         }

//         // 检查终端
//         const terminal = room.terminal;
//         if (terminal) {
//             for (const resource in terminal.store) {
//                 const resourceType = resource as ResourceConstant;
//                 resources[resourceType] = (resources[resourceType] || 0) + terminal.store[resourceType];
//             }
//         }

//         // 检查实验室
//         const labs = this.getLabs(roomName);
//         for (const lab of labs) {
//             if (lab.mineralType && lab.mineralAmount > 0) {
//                 resources[lab.mineralType] = (resources[lab.mineralType] || 0) + lab.mineralAmount;
//             }
//         }

//         return resources;
//     }

//     // 创建基础反应物的快捷方法
//     static createBasicReactions(roomName: string): void {
//         // 创建一些基础反应
//         this.addReactionTask(roomName, RESOURCE_HYDROGEN, 1000, 2);
//         this.addReactionTask(roomName, RESOURCE_OXYGEN, 1000, 2);
//         this.addReactionTask(roomName, RESOURCE_UTRIUM, 500, 1);
//         this.addReactionTask(roomName, RESOURCE_LEMERGIUM, 500, 1);
//         this.addReactionTask(roomName, RESOURCE_KEANIUM, 500, 1);
//         this.addReactionTask(roomName, RESOURCE_ZYNTHIUM, 500, 1);
//         this.addReactionTask(roomName, RESOURCE_CATALYST, 500, 1);
//         this.addReactionTask(roomName, RESOURCE_GHODIUM, 300, 1);
//     }

//     // 创建高级反应物的快捷方法
//     static createAdvancedReactions(roomName: string): void {
//         // 创建一些高级反应
//         this.addReactionTask(roomName, RESOURCE_UTRIUM_LEMERGITE, 200, 3);
//         this.addReactionTask(roomName, RESOURCE_UTRIUM_HYDRIDE, 200, 3);
//         this.addReactionTask(roomName, RESOURCE_UTRIUM_OXIDE, 200, 3);
//         this.addReactionTask(roomName, RESOURCE_LEMERGIUM_OXIDE, 200, 3);
//         this.addReactionTask(roomName, RESOURCE_ZYNTHIUM_HYDRIDE, 200, 3);
//         this.addReactionTask(roomName, RESOURCE_GHODIUM_HYDRIDE, 100, 4);
//     }

//     // 获取任务列表
//     static getReactionTasks(roomName: string): ReactionTask[] {
//         this.initializeMemory(roomName);
//         return Memory.reactionTasks[roomName] || [];
//     }

//     // 清空任务列表
//     static clearTasks(roomName: string): void {
//         this.initializeMemory(roomName);
//         Memory.reactionTasks[roomName] = [];
//     }

//     // 取消特定任务
//     static cancelTask(roomName: string, taskId: string): boolean {
//         this.initializeMemory(roomName);
//         const tasks = Memory.reactionTasks[roomName];
//         const index = tasks.findIndex(task => task.id === taskId);

//         if (index !== -1) {
//             tasks.splice(index, 1);
//             console.log(`取消任务: ${taskId}`);
//             return true;
//         }

//         return false;
//     }
// }
