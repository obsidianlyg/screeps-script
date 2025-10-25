function findContainer(creep:Creep) {
    // 优先从 Container/Storage 取能量，效率比采 Source 高
    // 查找最近的 Storage/Container
    const energySource = creep.pos.findClosestByPath(FIND_STRUCTURES, {
        filter: (s) => (s.structureType === STRUCTURE_CONTAINER || s.structureType === STRUCTURE_STORAGE) &&
                        s.store.getUsedCapacity(RESOURCE_ENERGY) > 0
    });

    if (energySource) {
        // 从 Container/Storage 取能量
        if (creep.withdraw(energySource, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
            creep.moveTo(energySource, {
                visualizePathStyle: { stroke: '#ffaa00' },
                ignoreCreeps: true
            });
        }
    }
}

export default findContainer;
