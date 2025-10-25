function findSource(creep:Creep) {
    let targetSource: Source | null = null;
    let assignmentChanged = false; // 用于跟踪是否重新分配了目标

    // --- 1. 尝试从内存中恢复目标 ---
    if (creep.memory.assignedSource) {
        // 尝试获取对象，并检查其能量是否耗尽
        targetSource = Game.getObjectById(creep.memory.assignedSource);

        // 如果目标不存在（被摧毁）或当前能量为 0，则清除分配
        if (!targetSource || targetSource.energy === 0) {
            creep.memory.assignedSource = null;
            targetSource = null;
        }
    }


    // --- 2. 如果没有有效目标（需要重新分配） ---
    if (!targetSource) {
        const sources = creep.room.find(FIND_SOURCES_ACTIVE);

        if (sources.length > 0) {

            // 预先计算所有 Source 的占用数量（修正了之前的高 CPU 问题）
            const sourcesWithCreepCount = sources.map(source => {
                const creepsNearSource = creep.room.lookForAtArea(LOOK_CREEPS,
                    Math.max(0, source.pos.y - 1), Math.max(0, source.pos.x - 1),
                    Math.min(49, source.pos.y + 1), Math.min(49, source.pos.x + 1), true)
                    .length;
                return { source: source, creepsNear: creepsNearSource };
            });

            // 排序：占用最少优先，数量相同则距离最近优先
            sourcesWithCreepCount.sort((a, b) => {
                if (a.creepsNear !== b.creepsNear) {
                    return a.creepsNear - b.creepsNear;
                }
                return creep.pos.getRangeTo(a.source) - creep.pos.getRangeTo(b.source);
            });

            // 分配最优 Source
            const bestSourceWrapper = sourcesWithCreepCount[0];
            if (bestSourceWrapper) {
                targetSource = bestSourceWrapper.source;
                creep.memory.assignedSource = targetSource.id; // <--- 目标锁定！
                assignmentChanged = true;
            }
        }
    }


    // --- 3. 执行任务 ---
    if (targetSource) {

        // 如果是刚刚分配的目标，或者 Creep 还没到达，则移动
        if (creep.harvest(targetSource) === ERR_NOT_IN_RANGE) {

            // 如果是新分配的目标，清除路径缓存（_move），确保它能找到新路径
            if (assignmentChanged) {
                delete creep.memory._move;
            }

            creep.moveTo(targetSource, {
                visualizePathStyle: { stroke: '#ffaa00' },
                ignoreCreeps: true,
                reusePath: 50
            });
        }
    }
}

export default findSource;
