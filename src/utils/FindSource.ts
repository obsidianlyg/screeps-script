function findSource(creep:Creep) {
    // 如果没有 Container/Storage，就 fallback 到从 Source 采集

    let targetSource: Source | null = null;

    // A. 尝试从内存中获取已分配的 Source ID
    const assignedSourceId = creep.memory.assignedSource;

    if (assignedSourceId) {
        // 尝试通过 ID 获取 Source 对象
        targetSource = Game.getObjectById(assignedSourceId);
    }

    // B. 如果没有 targetSource (ID不存在或对象无效)，则重新查找和分配
    if (!targetSource || targetSource.energy === 0) { // 检查 source.energy === 0 避免空跑

        // 清除旧的分配
        creep.memory.assignedSource = null;

        // 查找房间内所有活跃的 Source
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);

        if (sources.length > 0) {
            // 使用 findClosestByPath 查找最近的 Source（只在需要重新分配时运行）
            const closestSource = creep.pos.findClosestByPath(sources);

            if (closestSource) {
                // 分配并存储到内存
                creep.memory.assignedSource = closestSource.id;
                targetSource = closestSource;
            }
        }
        // 注意：更高级的优化是根据 Harvester 数量来分配，避免扎堆（见第三点）
    }

    // C. 执行采集任务
    if (targetSource) {
        if (creep.harvest(targetSource) === ERR_NOT_IN_RANGE) {
            // 使用您原有的优化寻路参数
            creep.moveTo(targetSource, {
                visualizePathStyle: { stroke: '#ffaa00' },
                ignoreCreeps: true,
                reusePath: 50 // 强烈建议添加路径缓存
            });
        }
    }
    // 否则，如果没有可采集的 Source（例如都已枯竭），Creep 会闲置。
}

export default findSource;
