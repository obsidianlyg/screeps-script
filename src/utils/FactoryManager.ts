/**
 * Factory管理工具类
 * 负责资源的压缩、解压和产物管理
 */

// 压缩配方接口
interface CompressionRecipe {
    resourceType: ResourceConstant;
    amount: number;
    resultResource: ResourceConstant;
    resultAmount: number;
}

// 解压配方接口
interface DecompressionRecipe {
    resourceType: ResourceConstant;
    amount: number;
    resultResource: ResourceConstant;
    resultAmount: number;
}

// Factory状态接口
interface FactoryStatus {
    id: Id<StructureFactory>;
    roomName: string;
    pos: RoomPosition;
    level: number;
    store: Store<ResourceConstant, false>;
    cooldown: number;
    isProducing: boolean;
    currentProduct?: ResourceConstant;
    progress?: number;
}

// 生产任务接口
interface ProductionTask {
    resourceType: ResourceConstant;
    amount: number;
    resultResource: ResourceConstant;
    resultAmount: number;
    priority: number;
    isCompression: boolean;
}

// 辅助函数：获取房间内的Factory
function getFactoryInRoom(room: Room): StructureFactory | null {
    const factory = room.find(FIND_STRUCTURES, {
        filter: (structure): structure is StructureFactory => {
            return structure.structureType === STRUCTURE_FACTORY;
        }
    })[0] as StructureFactory;

    return factory || null;
}

const FactoryManager = {
    /**
     * 基础矿物压缩配方
     * G = H + O (2能量)
     * OH = O + H (2能量)
     * Z = O + H (2能量)
     * U = H + O (2能量)
     * L = O + H (2能量)
     * K = O + H (2能量)
     */
    getBasicCompressRecipes(): CompressionRecipe[] {
        return [
            { resourceType: RESOURCE_HYDROGEN, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_OXYGEN, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_UTRIUM, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_LEMERGIUM, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_KEANIUM, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_ZYNTHIUM, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_OXIDANT, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_REDUCTANT, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
            { resourceType: RESOURCE_PURIFIER, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 1 },
        ];
    },

    /**
     * 高级压缩配方（需要G）
     * UG = U + G (3能量)
     * UH2O = U + H + O (4能量)
     * UO = U + O (3能量)
     * UL = U + L (3能量)
     * UH = U + H (3能量)
     * UO2 = U + 2*O (4能量)
     * LH = L + H (3能量)
     * LH2O = L + H + O (4能量)
     * LO = L + O (3能量)
     * LHO2 = L + H + 2*O (5能量)
     * KH = K + H (3能量)
     * KH2O = K + H + O (4能量)
     * KO = K + O (3能量)
     * KHO2 = K + H + 2*O (5能量)
     * GH = G + H (3能量)
     * GHO2 = G + H + 2*O (5能量)
     * ZH = Z + H (3能量)
     * ZH2O = Z + H + O (4能量)
     * ZO = Z + O (3能量)
     * ZHO2 = Z + H + 2*O (5能量)
     * OH = O + H (2能量)
     * UH = U + H (3能量)
     * LH = L + H (3能量)
     * KH = K + H (3能量)
     * GH = G + H (3能量)
     * ZH = Z + H (3能量)
     */
    getAdvancedCompressRecipes(): CompressionRecipe[] {
        return [
            // UG相关
            { resourceType: RESOURCE_UTRIUM, amount: 100, resultResource: RESOURCE_UTRIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_LEMERGIUM, amount: 100, resultResource: RESOURCE_LEMERGIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_KEANIUM, amount: 100, resultResource: RESOURCE_KEANIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_ZYNTHIUM, amount: 100, resultResource: RESOURCE_ZYNTHIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_OXIDANT, amount: 100, resultResource: 'oxidant_bar' as CommodityConstant, resultAmount: 10 },
            { resourceType: RESOURCE_REDUCTANT, amount: 100, resultResource: 'reductant_bar' as CommodityConstant, resultAmount: 10 },
            { resourceType: RESOURCE_PURIFIER, amount: 100, resultResource: 'purifier_bar' as CommodityConstant, resultAmount: 10 },

            // 复合产物
            { resourceType: RESOURCE_UTRIUM_HYDRIDE, amount: 100, resultResource: RESOURCE_UTRIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_UTRIUM_OXIDE, amount: 100, resultResource: RESOURCE_UTRIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_LEMERGIUM_HYDRIDE, amount: 100, resultResource: RESOURCE_LEMERGIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_LEMERGIUM_OXIDE, amount: 100, resultResource: RESOURCE_LEMERGIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_KEANIUM_HYDRIDE, amount: 100, resultResource: RESOURCE_KEANIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_KEANIUM_OXIDE, amount: 100, resultResource: RESOURCE_KEANIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_ZYNTHIUM_HYDRIDE, amount: 100, resultResource: RESOURCE_ZYNTHIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_ZYNTHIUM_OXIDE, amount: 100, resultResource: RESOURCE_ZYNTHIUM_BAR, resultAmount: 10 },
            { resourceType: RESOURCE_GHODIUM_HYDRIDE, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 10 },
            { resourceType: RESOURCE_GHODIUM_OXIDE, amount: 100, resultResource: RESOURCE_GHODIUM, resultAmount: 10 },

            // 能量压缩
            { resourceType: RESOURCE_BATTERY, amount: 100, resultResource: RESOURCE_ENERGY, resultAmount: 500 },
        ];
    },

    /**
     * 1. 压缩资源
     * @param roomName 房间名称
     * @param resourceType 要压缩的资源类型
     * @param amount 压缩数量
     * @returns 压缩结果码
     */
    compressResource(roomName: string, resourceType: ResourceConstant, amount: number): ScreepsReturnCode {
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`找不到房间: ${roomName}`);
            return ERR_INVALID_TARGET;
        }

        // 获取房间内的Factory
        const factory = getFactoryInRoom(room);
        if (!factory) {
            console.log(`房间 ${roomName} 没有Factory`);
            return ERR_INVALID_TARGET;
        }

        // 查找压缩配方
        const recipe = this.findCompressionRecipe(resourceType);
        if (!recipe) {
            console.log(`找不到 ${resourceType} 的压缩配方`);
            return ERR_INVALID_ARGS;
        }

        // 检查压缩数量是否足够
        const actualAmount = Math.min(amount, Math.floor(factory.store.getUsedCapacity(resourceType) / recipe.amount) * recipe.amount);
        if (actualAmount < recipe.amount) {
            console.log(`资源不足: 需要 ${recipe.amount} ${resourceType}，只有 ${factory.store.getUsedCapacity(resourceType)}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 检查Factory是否在冷却中
        if (factory.cooldown > 0) {
            console.log(`Factory在冷却中，还需等待 ${factory.cooldown} tick`);
            return ERR_TIRED;
        }

        // 检查是否正在生产
        if (factory.store.getUsedCapacity(RESOURCE_ENERGY) < 20) {
            console.log(`Factory能量不足: 需要20能量，只有 ${factory.store.getUsedCapacity(RESOURCE_ENERGY)}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 执行压缩
        const result = factory.produce(recipe.resultResource as any);

        if (result === OK) {
            console.log(`✅ 开始压缩: ${actualAmount} ${resourceType} -> ${Math.floor(actualAmount / recipe.amount) * recipe.resultAmount} ${recipe.resultResource}`);
        } else {
            console.log(`❌ 压缩失败: ${result} ${resourceType}`);
        }

        return result;
    },

    /**
     * 2. 解压资源
     * @param roomName 房间名称
     * @param resourceType 要解压的资源类型
     * @param amount 解压数量
     * @returns 解压结果码
     */
    decompressResource(roomName: string, resourceType: ResourceConstant, amount: number): ScreepsReturnCode {
        const room = Game.rooms[roomName];
        if (!room) {
            console.log(`找不到房间: ${roomName}`);
            return ERR_INVALID_TARGET;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            console.log(`房间 ${roomName} 没有Factory`);
            return ERR_INVALID_TARGET;
        }

        // 查找解压配方
        const recipe = this.findDecompressionRecipe(resourceType);
        if (!recipe) {
            console.log(`找不到 ${resourceType} 的解压配方`);
            return ERR_INVALID_ARGS;
        }

        // 检查解压数量是否足够
        const actualAmount = Math.min(amount, Math.floor(factory.store.getUsedCapacity(resourceType) / recipe.amount) * recipe.amount);
        if (actualAmount < recipe.amount) {
            console.log(`资源不足: 需要 ${recipe.amount} ${resourceType}，只有 ${factory.store.getUsedCapacity(resourceType)}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 检查Factory是否在冷却中
        if (factory.cooldown > 0) {
            console.log(`Factory在冷却中，还需等待 ${factory.cooldown} tick`);
            return ERR_TIRED;
        }

        // 检查是否正在生产
        if (factory.store.getUsedCapacity(RESOURCE_ENERGY) < 20) {
            console.log(`Factory能量不足: 需要20能量，只有 ${factory.store.getUsedCapacity(RESOURCE_ENERGY)}`);
            return ERR_NOT_ENOUGH_RESOURCES;
        }

        // 执行解压
        const result = factory.produce(recipe.resultResource as any);

        if (result === OK) {
            console.log(`✅ 开始解压: ${actualAmount} ${resourceType} -> ${Math.floor(actualAmount / recipe.amount) * recipe.resultAmount} ${recipe.resultResource}`);
        } else {
            console.log(`❌ 解压失败: ${result} ${resourceType}`);
        }

        return result;
    },

    /**
     * 3. 自动压缩过剩资源
     * @param roomName 房间名称
     * @param threshold 压缩阈值（默认10000）
     * @returns 是否执行了压缩
     */
    autoCompressResources(roomName: string, threshold: number = 10000): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            return false;
        }

        let hasCompressed = false;

        // 检查基础矿物
        const basicMinerals = [RESOURCE_HYDROGEN, RESOURCE_OXYGEN, RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM];

        for (const mineral of basicMinerals) {
            const amount = factory.store.getUsedCapacity(mineral);
            if (amount >= threshold) {
                const compressAmount = Math.floor(amount / 100) * 100; // 按100的倍数压缩
                const result = this.compressResource(roomName, mineral, compressAmount);
                if (result === OK || result === ERR_BUSY) {
                    hasCompressed = true;
                    break; // 一次只执行一个压缩任务
                }
            }
        }

        // 如果没有基础矿物需要压缩，检查复合矿物
        if (!hasCompressed) {
            const advancedMinerals = [
                RESOURCE_UTRIUM_HYDRIDE, RESOURCE_UTRIUM_OXIDE, RESOURCE_LEMERGIUM_HYDRIDE,
                RESOURCE_LEMERGIUM_OXIDE, RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_OXIDE,
                RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_OXIDE, RESOURCE_GHODIUM_HYDRIDE, RESOURCE_GHODIUM_OXIDE
            ];

            for (const mineral of advancedMinerals) {
                const amount = factory.store.getUsedCapacity(mineral);
                if (amount >= threshold / 10) { // 复合矿物阈值较低
                    const compressAmount = Math.floor(amount / 100) * 100;
                    const result = this.compressResource(roomName, mineral, compressAmount);
                    if (result === OK || result === ERR_BUSY) {
                        hasCompressed = true;
                        break;
                    }
                }
            }
        }

        return hasCompressed;
    },

    /**
     * 4. 自动解压需要的资源
     * @param roomName 房间名称
     * @param neededResources 需要的资源类型和数量
     * @returns 是否执行了解压
     */
    autoDecompressResources(roomName: string, neededResources: { [key: string]: number }): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            return false;
        }
        let hasDecompressed = false;

        for (const resourceType in neededResources) {
            const needed = neededResources[resourceType];
            const have = factory.store.getUsedCapacity(resourceType as ResourceConstant);

            if (have < needed) {
                // 需要这种资源，尝试解压压缩版本
                const compressedVersion = this.getCompressedVersion(resourceType as ResourceConstant);
                if (compressedVersion) {
                    const haveCompressed = factory.store.getUsedCapacity(compressedVersion);
                    if (haveCompressed > 0) {
                        const decompressAmount = Math.min(haveCompressed, (needed - have) * 10); // 解压足够的量
                        const result = this.decompressResource(roomName, compressedVersion, decompressAmount);
                        if (result === OK || result === ERR_BUSY) {
                            hasDecompressed = true;
                            break;
                        }
                    }
                }
            }
        }

        return hasDecompressed;
    },

    /**
     * 5. 获取Factory状态
     * @param roomName 房间名称
     * @returns Factory状态或null
     */
    getFactoryStatus(roomName: string): FactoryStatus | null {
        const room = Game.rooms[roomName];
        if (!room) {
            return null;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            return null;
        }

        return {
            id: factory.id,
            roomName: roomName,
            pos: factory.pos,
            level: factory.level || 0,
            store: factory.store,
            cooldown: factory.cooldown,
            isProducing: factory.cooldown > 0,
            currentProduct: factory.store.getUsedCapacity() > 0 ?
                Object.keys(factory.store).find(resource => resource !== RESOURCE_ENERGY) as ResourceConstant : undefined,
            progress: factory.cooldown
        };
    },

    /**
     * 6. 查找压缩配方
     * @param resourceType 资源类型
     * @returns 压缩配方或null
     */
    findCompressionRecipe(resourceType: ResourceConstant): CompressionRecipe | null {
        // 从Screeps的COMMODITIES常量获取配方
        if (COMMODITIES[resourceType as keyof typeof COMMODITIES]) {
            const commodity = COMMODITIES[resourceType as keyof typeof COMMODITIES];
            if (commodity.components) {
                // 找到对应的压缩产物
                for (const productType in COMMODITIES) {
                    const product = COMMODITIES[productType as keyof typeof COMMODITIES];
                    if (product.components &&
                        Object.keys(product.components).includes(resourceType)) {
                        return {
                            resourceType,
                            amount: 100, // 标准压缩数量
                            resultResource: productType as ResourceConstant,
                            resultAmount: 1
                        };
                    }
                }
            }
        }
        return null;
    },

    /**
     * 7. 查找解压配方
     * @param resourceType 资源类型
     * @returns 解压配方或null
     */
    findDecompressionRecipe(resourceType: ResourceConstant): DecompressionRecipe | null {
        // 从Screeps的COMMODITIES常量获取解压配方
        if (COMMODITIES[resourceType as keyof typeof COMMODITIES]) {
            const commodity = COMMODITIES[resourceType as keyof typeof COMMODITIES];
            if (commodity.components && Object.keys(commodity.components).length === 1) {
                const componentKey = Object.keys(commodity.components)[0] as keyof typeof commodity.components;
                const componentAmount = commodity.components[componentKey];
                return {
                    resourceType,
                    amount: 1,
                    resultResource: componentKey as ResourceConstant,
                    resultAmount: componentAmount || 100
                };
            }
        }
        return null;
    },

    /**
     * 8. 获取压缩版本
     * @param resourceType 基础资源类型
     * @returns 压缩版本或null
     */
    getCompressedVersion(resourceType: ResourceConstant): ResourceConstant | null {
        const compressedMap: { [key: string]: ResourceConstant } = {
            [RESOURCE_HYDROGEN]: RESOURCE_UTRIUM_HYDRIDE,
            [RESOURCE_OXYGEN]: RESOURCE_UTRIUM_OXIDE,
            [RESOURCE_UTRIUM]: RESOURCE_UTRIUM_BAR,
            [RESOURCE_LEMERGIUM]: RESOURCE_LEMERGIUM_BAR,
            [RESOURCE_KEANIUM]: RESOURCE_KEANIUM_BAR,
            [RESOURCE_ZYNTHIUM]: RESOURCE_ZYNTHIUM_BAR,
        };

        return compressedMap[resourceType] || null;
    },

    /**
     * 9. 获取解压版本
     * @param compressedResource 压缩资源类型
     * @returns 解压版本或null
     */
    getDecompressedVersion(compressedResource: ResourceConstant): ResourceConstant | null {
        const decompressedMap: { [key: string]: ResourceConstant } = {
            [RESOURCE_UTRIUM_HYDRIDE]: RESOURCE_HYDROGEN,
            [RESOURCE_UTRIUM_OXIDE]: RESOURCE_OXYGEN,
            [RESOURCE_UTRIUM_BAR]: RESOURCE_UTRIUM,
            [RESOURCE_LEMERGIUM_BAR]: RESOURCE_LEMERGIUM,
            [RESOURCE_KEANIUM_BAR]: RESOURCE_KEANIUM,
            [RESOURCE_ZYNTHIUM_BAR]: RESOURCE_ZYNTHIUM,
        };

        return decompressedMap[compressedResource] || null;
    },

    /**
     * 10. 检查Factory是否可以生产指定产物
     * @param roomName 房间名称
     * @param productType 产物类型
     * @returns 是否可以生产
     */
    canProduce(roomName: string, productType: ResourceConstant): boolean {
        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            return false;
        }

        // 检查Factory等级
        if ((factory.level || 0) < this.getRequiredLevel(productType)) {
            return false;
        }

        // 检查能量
        if (factory.store.getUsedCapacity(RESOURCE_ENERGY) < 20) {
            return false;
        }

        // 检查原材料
        if (COMMODITIES[productType as keyof typeof COMMODITIES] && COMMODITIES[productType as keyof typeof COMMODITIES].components) {
            const components = COMMODITIES[productType as keyof typeof COMMODITIES].components;
            for (const componentKey in components) {
                const requiredAmount = components[componentKey as keyof typeof components];
                const haveAmount = factory.store.getUsedCapacity(componentKey as ResourceConstant);
                if ((haveAmount || 0) < requiredAmount) {
                    return false;
                }
            }
        }

        return true;
    },

    /**
     * 11. 获取生产所需的Factory等级
     * @param productType 产物类型
     * @returns 所需等级
     */
    getRequiredLevel(productType: ResourceConstant): number {
        // 基础压缩产物需要等级1
        const basicProducts: ResourceConstant[] = [RESOURCE_GHODIUM, RESOURCE_UTRIUM_BAR, RESOURCE_LEMERGIUM_BAR,
                                                   RESOURCE_KEANIUM_BAR, RESOURCE_ZYNTHIUM_BAR];
        if (basicProducts.includes(productType)) {
            return 1;
        }

        // 高级产物需要更高等级
        const advancedProducts: ResourceConstant[] = [RESOURCE_UTRIUM_HYDRIDE, RESOURCE_UTRIUM_OXIDE, RESOURCE_LEMERGIUM_HYDRIDE,
                                                 RESOURCE_LEMERGIUM_OXIDE, RESOURCE_KEANIUM_HYDRIDE, RESOURCE_KEANIUM_OXIDE,
                                                 RESOURCE_ZYNTHIUM_HYDRIDE, RESOURCE_ZYNTHIUM_OXIDE];
        if (advancedProducts.includes(productType)) {
            return 2;
        }

        // 最复杂的产物需要等级3
        return 3;
    },

    /**
     * 12. 批量管理生产任务
     * @param roomName 房间名称
     * @returns 是否处理了任务
     */
    processProductionTasks(roomName: string): boolean {
        // 从内存中获取生产任务
        if (!Memory.factoryTasks) {
            Memory.factoryTasks = {};
        }

        const roomTasks = Memory.factoryTasks[roomName] || [];
        if (roomTasks.length === 0) {
            return false;
        }

        const room = Game.rooms[roomName];
        if (!room) {
            return false;
        }

        const factory = getFactoryInRoom(room);
        if (!factory) {
            return false;
        }

        // 检查Factory是否在冷却中
        if (factory.cooldown > 0) {
            return false;
        }

        // 按优先级处理任务
        roomTasks.sort((a: ProductionTask, b: ProductionTask) => a.priority - b.priority);

        const task = roomTasks[0];

        // 检查是否可以执行任务
        if (task.isCompression) {
            const result = this.compressResource(roomName, task.resourceType, task.amount);
            if (result === OK || result === ERR_BUSY) {
                roomTasks.shift(); // 移除已处理的任务
                Memory.factoryTasks[roomName] = roomTasks;
                return true;
            }
        } else {
            const result = this.decompressResource(roomName, task.resourceType, task.amount);
            if (result === OK || result === ERR_BUSY) {
                roomTasks.shift();
                Memory.factoryTasks[roomName] = roomTasks;
                return true;
            }
        }

        // 任务无效，移除
        roomTasks.shift();
        Memory.factoryTasks[roomName] = roomTasks;
        return false;
    },

    /**
     * 13. 添加生产任务
     * @param roomName 房间名称
     * @param task 生产任务
     */
    addProductionTask(roomName: string, task: ProductionTask): void {
        if (!Memory.factoryTasks) {
            Memory.factoryTasks = {};
        }

        if (!Memory.factoryTasks[roomName]) {
            Memory.factoryTasks[roomName] = [];
        }

        Memory.factoryTasks[roomName].push(task);
        console.log(`添加生产任务: ${task.isCompression ? '压缩' : '解压'} ${task.resourceType} 在房间 ${roomName}`);
    },

    /**
     * 14. 调试函数：显示Factory状态
     * @param roomName 房间名称，可选
     */
    debugFactories(roomName?: string): void {
        console.log('=== Factory状态报告 ===');

        if (roomName) {
            // 显示指定房间的Factory状态
            const status = this.getFactoryStatus(roomName);
            if (status) {
                this.printFactoryStatus(status);
            } else {
                console.log(`房间 ${roomName} 没有Factory`);
            }
        } else {
            // 显示所有房间的Factory状态
            let totalFactories = 0;
            let activeFactories = 0;

            for (const name in Game.rooms) {
                const room = Game.rooms[name];
                if (room.controller && room.controller.my) {
                    const factory = getFactoryInRoom(room);
                    if (factory) {
                        totalFactories++;
                        const status = this.getFactoryStatus(name);
                        if (status) {
                            if (status.isProducing) activeFactories++;
                            this.printFactoryStatus(status);
                        }
                    }
                }
            }

            console.log(`\n=== 总体统计 ===`);
            console.log(`Factory总数: ${totalFactories}`);
            console.log(`正在生产: ${activeFactories}`);
            console.log(`空闲: ${totalFactories - activeFactories}`);
        }

        // 显示生产任务
        if (Memory.factoryTasks) {
            console.log(`\n=== 生产任务 ===`);
            let hasTasks = false;
            for (const room in Memory.factoryTasks) {
                const tasks = Memory.factoryTasks[room];
                if (tasks && tasks.length > 0) {
                    hasTasks = true;
                    console.log(`房间 ${room}: ${tasks.length} 个任务`);
                    tasks.forEach((task, index) => {
                        console.log(`  ${index + 1}. ${task.isCompression ? '压缩' : '解压'} ${task.resourceType} (${task.amount})`);
                    });
                }
            }
            if (!hasTasks) {
                console.log('暂无生产任务');
            }
        }

        console.log('=== 报告结束 ===');
    },

    /**
     * 辅助函数：打印单个Factory状态
     * @param status Factory状态
     */
    printFactoryStatus(status: FactoryStatus): void {
        console.log(`\n房间 ${status.roomName}:`);
        console.log(`  - 位置: (${status.pos.x}, ${status.pos.y})`);
        console.log(`  - 等级: ${status.level}`);
        console.log(`  - 状态: ${status.isProducing ? '生产中' : '空闲'}`);
        console.log(`  - 冷却: ${status.cooldown} tick`);
        console.log(`  - 能量: ${status.store.getUsedCapacity(RESOURCE_ENERGY)}`);

        // 显示主要资源
        const importantResources = [RESOURCE_ENERGY, RESOURCE_HYDROGEN, RESOURCE_OXYGEN,
                                  RESOURCE_UTRIUM, RESOURCE_LEMERGIUM, RESOURCE_KEANIUM, RESOURCE_ZYNTHIUM];
        const resources: string[] = [];

        importantResources.forEach(resource => {
            const amount = status.store.getUsedCapacity(resource);
            if (amount > 0) {
                resources.push(`${resource}: ${amount}`);
            }
        });

        if (resources.length > 0) {
            console.log(`  - 资源: ${resources.join(', ')}`);
        }
    },

    /**
     * 15. 清理过期任务
     */
    cleanup(): void {
        if (Memory.factoryTasks) {
            for (const room in Memory.factoryTasks) {
                if (Memory.factoryTasks[room] && Memory.factoryTasks[room].length === 0) {
                    delete Memory.factoryTasks[room];
                }
            }
        }
    }
};

export default FactoryManager;