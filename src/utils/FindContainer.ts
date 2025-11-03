import { handleStuckDetection } from "./StuckDetection";

// 辅助函数：检查container是否有足够的实际能量给当前creep（考虑预扣缓存）
function hasEnoughActualEnergy(container: StructureContainer | StructureStorage, creepNeeded: number): boolean {
    const containerId = container.id;
    const actualEnergy = container.store.getUsedCapacity(RESOURCE_ENERGY);
    const reservedEnergy = Memory.containerEnergy?.[containerId] || 0;

    // 可用能量 = 实际能量 - 已预扣的能量
    const availableEnergy = actualEnergy - reservedEnergy;

    // console.log(`Container ${containerId}: 实际能量=${actualEnergy}, 预扣能量=${reservedEnergy}, 可用能量=${availableEnergy}, creep需要=${creepNeeded}`);

    return availableEnergy >= creepNeeded;
}

// 辅助函数：预扣container的能量
function reserveContainerEnergy(containerId: Id<StructureContainer | StructureStorage>, creepNeeded: number): void {
    // 安全检查：确保containerEnergy存在
    if (!Memory.containerEnergy) {
        Memory.containerEnergy = {};
    }

    const currentReserved = Memory.containerEnergy[containerId] || 0;
    const newReserved = currentReserved + creepNeeded;

    Memory.containerEnergy[containerId] = newReserved;

    // console.log(`Container ${containerId}: 预扣能量=${creepNeeded}，总预扣能量=${newReserved}`);
}

// 辅助函数：释放container的预扣能量（当creep成功获取能量时）
function releaseContainerEnergy(containerId: Id<StructureContainer | StructureStorage>, creepNeeded: number): void {
    if (!Memory.containerEnergy || !Memory.containerEnergy[containerId]) {
        return;
    }

    const currentReserved = Memory.containerEnergy[containerId];
    const newReserved = Math.max(0, currentReserved - creepNeeded);

    Memory.containerEnergy[containerId] = newReserved;

    // console.log(`Container ${containerId}: 释放预扣能量=${creepNeeded}，剩余预扣能量=${newReserved}`);
}


function findContainer(creep: Creep): boolean {
    // console.log(`${creep.name}: 开始寻找container，当前能量=${creep.store.getUsedCapacity(RESOURCE_ENERGY)}`);

    // 如果已经有分配的container，继续执行移动和取能量
    const existingTargetId = creep.memory.targetContainerId;
    if (existingTargetId) {
        const targetContainer = Game.getObjectById(existingTargetId);
        if (targetContainer) {
            return handleExistingContainer(creep, targetContainer);
        } else {
            // 目标container不存在，清除分配
            creep.memory.targetContainerId = null;
        }
    }

    const creepNeeded = creep.store.getFreeCapacity(RESOURCE_ENERGY);
    // console.log(`${creep.name}: 需要能量=${creepNeeded}`);

    // 1. 获取所有container
    const allContainers = creep.room.find(FIND_STRUCTURES, {
        filter: (s) => s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE
    }) as (StructureContainer | StructureStorage)[];

    if (allContainers.length === 0) {
        console.log(`${creep.name}: 房间内没有container或storage`);
        return false;
    }

    // console.log(`${creep.name}: 找到${allContainers.length}个container`);

    // 2. 对每个container进行检查
    for (const container of allContainers) {
        const containerId = container.id;
        const currentEnergy = container.store.getUsedCapacity(RESOURCE_ENERGY);

        // console.log(`检查Container ${containerId}: 当前能量=${currentEnergy}`);

        // 3. 判断container中的实际可用能量是否足够creep的需求
        if (hasEnoughActualEnergy(container, creepNeeded)) {
            // 预扣能量给这个creep
            reserveContainerEnergy(containerId, creepNeeded);

            // console.log(`${creep.name}: Container ${containerId}能量充足，已预扣能量=${creepNeeded}`);

            // 记录目标container
            creep.memory.targetContainerId = containerId;

            // 开始移动和取能量的过程
            return handleExistingContainer(creep, container);
        }

        // console.log(`${creep.name}: Container ${containerId}能量不足，跳过`);
    }

    // 3. 如果没有找到足够的container，不让creep到达
    // console.log(`${creep.name}: 没有找到能量充足的container，无法获取能量`);
    return false;
}

// 处理已有container的移动和取能量过程
function handleExistingContainer(creep: Creep, container: StructureContainer | StructureStorage): boolean {
    const distance = creep.pos.getRangeTo(container);
    // console.log(`${creep.name}: 处理container ${container.id}，距离=${distance}`);

    // 尝试取能量
    const withdrawResult = creep.withdraw(container, RESOURCE_ENERGY);

    // 放入状态
    creep.memory.energySourceType = container.structureType

    if (withdrawResult === OK) {
        // console.log(`${creep.name}: 成功从container获取能量`);
        // 释放预扣的能量
        releaseContainerEnergy(container.id, creep.store.getCapacity(RESOURCE_ENERGY));
        creep.memory.targetContainerId = null; // 清除目标
        delete creep.memory.containerLastPosition; // 清除卡住检测
        return true;
    } else if (withdrawResult === ERR_NOT_IN_RANGE) {
        // console.log(`${creep.name}: 移动到container ${container.id}，当前距离=${distance}`);

        const moveResult = creep.moveTo(container, {
            visualizePathStyle: { stroke: '#00ff00' },
            ignoreCreeps: false,
            range: 1
        });

        if (moveResult === OK) {
            // console.log(`${creep.name}: 已到达container附近`);
        } else if (moveResult !== ERR_TIRED) {
            console.log(`${creep.name}: 移动失败，结果=${moveResult}`);
        }

        return true; // 继续处理
    } else {
        // console.log(`${creep.name}: 从container取能量失败，结果=${withdrawResult}`);
        creep.memory.targetContainerId = null; // 清除目标
        delete creep.memory.containerLastPosition; // 清除卡住检测

        // 如果取能量失败，释放预扣的能量
        releaseContainerEnergy(container.id, creep.store.getFreeCapacity(RESOURCE_ENERGY));
        // console.log(`${creep.name}: 取能量失败，已释放预扣能量`);

        return false;
    }
}

export default findContainer;
