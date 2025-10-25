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

            let bestSource: Source | null = null;
            let minAssignedCreeps = Infinity;

            // 查找所有 screep 的内存，计算每个 Source 的“排队”人数

            // 1. 【预先统计】计算每个 Source ID 的分配人数
            const assignmentCounts: Record<Id<Source>, number> = {} as Record<Id<Source>, number>;

            // 初始化计数器，并统计当前所有 screep 的分配情况
            for (const creepName in Game.creeps) {
                const currentCreep = Game.creeps[creepName];

                // 只需要关注有 assignedSource 的 Creep
                if (currentCreep.memory.assignedSource) {
                    const assignedId = currentCreep.memory.assignedSource;

                    // 将计数器中的人数 +1
                    assignmentCounts[assignedId] = (assignmentCounts[assignedId] || 0) + 1;
                }
            }


            // 2. 【选择最优目标】遍历所有活跃的 Source，找到分配人数最少的
            for (const source of sources) {
                // 获取当前 Source 的分配人数（如果没分配，则为 0）
                const assignedCount = assignmentCounts[source.id] || 0;

                // 优先级 1：分配人数少的优先
                if (assignedCount < minAssignedCreeps) {
                    minAssignedCreeps = assignedCount;
                    bestSource = source;
                }
                // 优先级 2：如果分配人数相同，选择距离当前 Creep 最近的
                else if (assignedCount === minAssignedCreeps) {
                    // 必须确保 bestSource 存在才能进行距离比较
                    if (bestSource && creep.pos.getRangeTo(source) < creep.pos.getRangeTo(bestSource)) {
                        bestSource = source;
                    }
                }
            }

            // 3. 锁定目标并分配
            if (bestSource) {
                targetSource = bestSource;
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

            if (targetSource) {
                console.log(`${creep.name}: 直接移动到资源源`);
                creep.moveTo(targetSource, {
                    visualizePathStyle: { stroke: '#ffaa00' },
                    ignoreCreeps: false,
                    maxOps: 1000,
                    heuristicWeight: 1.2
                });
            }

        }
    }
}

export default findSource;
