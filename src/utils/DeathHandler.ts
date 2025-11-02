/**
 * Creep死亡处理工具
 * 用于在creep即将死亡时自动将资源转移到附近的容器中
 */

/**
 * 当 Creep 生命即将耗尽时，将携带的能量转移到附近的容器、Link 或 Storage 中。
 * @param creep 要检查和操作的 Creep 对象
 * @param threshold 死亡倒计时阈值 (例如 10 ticks)
 * @returns {boolean} 如果 Creep 处于死亡转移模式，则返回 true
 */
function transferOnDeath(creep: Creep, threshold: number = 15): boolean {
    // 1. 检查 Creep 是否即将死亡
    if (creep.ticksToLive !== undefined && creep.ticksToLive < threshold) {

        // 2. 检查 Creep 是否携带了任何资源 (不仅仅是能量)
        const totalCarried = creep.store.getUsedCapacity();
        if (totalCarried === 0) {
            // 没有携带资源，让它原地自然死亡即可
            creep.say('💀 待命');
            return true; // 处于死亡模式，但已清空
        }

        // 3. 查找最近的可存储资源的目标 (优先顺序：Link > Container > Storage/Terminal)
        const target = creep.pos.findClosestByPath(FIND_STRUCTURES, {
            filter: (s) => {
                // 1. 结构必须有 store 属性
                if ('store' in s) {
                    const storeStructure = s as AnyStoreStructure;

                    // 2. 定义我们想要的目标类型
                    const isTargetType = (
                        s.structureType === STRUCTURE_CONTAINER ||
                        s.structureType === STRUCTURE_STORAGE ||
                        s.structureType === STRUCTURE_TERMINAL ||
                        s.structureType === STRUCTURE_FACTORY ||
                        s.structureType === STRUCTURE_LAB
                    );

                    // 3. 排除 Link 和其他非存储/非自己的结构
                    if (isTargetType) {

                        // 4. 检查是否有总容量
                        const freeCapacity = storeStructure.store.getFreeCapacity();

                        // 确保有空间 (freeCapacity > 0) 且返回值不是 null
                        return freeCapacity !== null && freeCapacity > 0;
                    }
                }
                return false;
            }
        }) as AnyStoreStructure | null;

        // 4. 执行转移操作
        if (target) {
            // 找出 Creep 携带的所有资源类型
            for (const resourceType in creep.store) {
                const amount = creep.store[resourceType as ResourceConstant];

                if (amount > 0) {
                    const result = creep.transfer(target, resourceType as ResourceConstant);

                    if (result === ERR_NOT_IN_RANGE) {
                        // 移动到目标
                        creep.moveTo(target, { visualizePathStyle: { stroke: '#ff0000', lineStyle: 'dashed' } });
                        return true; // 正在移动中
                    }
                    // 如果成功转移，继续检查下一种资源
                }
            }
        } else {
            // 找不到可转移的目标 (所有存储结构都满了?)
            creep.say('💀 抛弃');
            // 可以选择让 Creep 使用 `creep.drop(RESOURCE_TYPE)` 将资源扔到地上
            // 或者只是等待死亡
        }

        return true; // Creep 处于死亡转移模式
    }

    return false; // Creep 健康，继续执行正常任务
}

export default transferOnDeath;
