/**
 * 检查并缓存房间内的能量源位置 (RoomPosition 的简化结构)
 * 必须在主循环中对房间调用一次。
 * @param room 要处理的房间对象
 */
export function initializeRoomSourcePositions(room: Room): void {
    // 检查缓存是否存在，如果不存在则创建
    // 这里的 room.memory.sourcePositions 类型已经被 global.d.ts 定义为 SerializedRoomPosition[] | undefined
    if (!room.memory.sourcePositions) {
        console.log(`[Cache] 正在初始化房间 ${room.name} 的能量源位置缓存...`);

        // 执行查找操作，找到所有的 Source
        const sources = room.find(FIND_SOURCES);

        // 将 RoomPosition 对象映射为简化结构并存储
        room.memory.sourcePositions = sources.map(s => ({
            x: s.pos.x,
            y: s.pos.y,
            roomName: s.pos.roomName
        }));

        console.log(`[Cache] 缓存完成，共找到 ${sources.length} 个能量源。`);
    }
}

/**
 * 从内存中读取缓存的能量源位置，并重建为 RoomPosition 对象。
 * @param room 房间对象
 * @returns RoomPosition[] | undefined 可用的 RoomPosition 数组
 */
export function getSourcePositions(room: Room): RoomPosition[] | undefined {
    const serializedPositions = room.memory.sourcePositions;

    if (!serializedPositions) {
        // 如果没有缓存，返回 undefined，让调用者知道需要回退或初始化。
        return undefined;
    }

    // 将内存中的简化结构数组，映射重建为 RoomPosition 对象数组
    return serializedPositions.map(p => new RoomPosition(p.x, p.y, p.roomName));
}
