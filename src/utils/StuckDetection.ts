/**
 * 卡住检测和恢复机制
 * 用于检测creep是否长时间停留在一个位置，并提供自动绕路解决方案
 */

interface StuckMemory {
    pos: RoomPosition;
    time: number;
}

/**
 * 检查creep是否卡住，如果卡住则尝试绕路
 * @param creep 需要检测的creep
 * @param target 目标位置
 * @param stuckMemoryKey 内存中用于存储卡住检测信息的key
 * @param stuckThreshold 卡住阈值（tick），默认为5
 * @returns true表示正在处理卡住情况，false表示正常状态
 */
export function checkAndHandleStuck(
    creep: Creep,
    target: RoomPosition | { pos: RoomPosition },
    stuckMemoryKey: string = 'stuck',
    stuckThreshold: number = 5
): boolean {
    // 获取creep内存中的卡住检测信息
    const stuckInfo = creep.memory[stuckMemoryKey] as StuckMemory;

    // 如果没有卡住检测信息，初始化
    if (!stuckInfo) {
        creep.memory[stuckMemoryKey] = {
            pos: creep.pos,
            time: Game.time
        };
        return false;
    }

    // 如果位置发生变化，更新记录
    if (!creep.pos.isEqualTo(stuckInfo.pos)) {
        creep.memory[stuckMemoryKey] = {
            pos: creep.pos,
            time: Game.time
        };
        return false;
    }

    // 如果在同一个位置停留超过阈值时间，判定为卡住
    if (Game.time - stuckInfo.time > stuckThreshold) {
        console.log(`${creep.name}: 在${stuckMemoryKey}检测中卡住了，尝试绕路`);

        // 清除路径缓存
        delete creep.memory._move;
        delete creep.memory[stuckMemoryKey];

        // 返回true表示需要调用者处理绕路逻辑
        return true;
    }

    return false;
}

/**
 * 为卡住的creep执行绕路移动
 * @param creep 卡住的creep
 * @param target 目标对象或位置
 * @param options 移动选项
 */
export function executeStuckMovement(
    creep: Creep,
    target: any, // 使用 any 类型以支持各种目标类型
    options: any = {}
): void {
    const defaultOptions = {
        visualizePathStyle: { stroke: '#ff6600' },  // 橙红色表示绕路
        ignoreCreeps: true,  // 允许穿过creep绕路
        maxOps: 2000,  // 增加搜索复杂度
        heuristicWeight: 0.8,  // 更倾向于短路径
        range: 1,
        ...options
    };

    creep.moveTo(target as any, defaultOptions);
    creep.say('Reroute'); // 使用英文字符避免编码问题
}

/**
 * 通用卡住检测和处理方法
 * @param creep 需要检测的creep
 * @param target 目标对象
 * @param stuckMemoryKey 内存key
 * @param stuckThreshold 卡住阈值
 * @returns true表示正在处理移动（正常移动或绕路），false表示没有处理
 */
export function handleStuckDetection(
    creep: Creep,
    target: any,
    stuckMemoryKey: string = 'stuck',
    stuckThreshold: number = 5
): boolean {
    // 检查是否卡住
    if (checkAndHandleStuck(creep, target, stuckMemoryKey, stuckThreshold)) {
        // 如果卡住，执行绕路移动
        executeStuckMovement(creep, target);
        return true;
    }

    return false;
}