// 定义 Creep 体部件的类型（BodyPartConstant 是 Screeps TS 类型）

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    getLevelByRCL,
    getLevelByEnergy,
    canAffordBody,
    calculateBodyCost,
    createBodyParts
} from '../utils/BodyUtils';

/**
 * 基础 Harvester 的身体部件配置
 */
export const HARVESTER_BODY: BodyPartConstant[] = [WORK, CARRY, MOVE];

/**
 * Harvester 的目标数量
 */
export const HARVESTER_COUNT: number = 3;

/**
 * 基础 Upgrader 的身体部件配置
 */
export const UPGRADER_BODY: BodyPartConstant[] = [WORK, CARRY, MOVE];

/**
 * Upgrader 的目标数量
 */
export const UPGRADER_COUNT: number = 2;

/**
 * 基础 builder 的身体部件配置
 */
export const BUILDER_BODY: BodyPartConstant[] = [WORK, CARRY, MOVE];

/**
 * builder 的目标数量
 */
export const BUILDER_COUNT: number = 1;

/**
 * 基础 Transporter 的身体部件配置
 */
// export const CARRIER_BODY: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
export const CARRIER_BODY: BodyPartConstant[] = [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];

/**
 * Transporter 的目标数量
 */
export const TRANSPORTER_COUNT: number = 2;

/**
 * 基础 Claimer 的身体部件配置
 */
export const CLAIMER_BODY: BodyPartConstant[] = [CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE];

/**
 * Claimer 的目标数量
 */
export const CLAIMER_COUNT: number = 1;

/**
 * bigscreep
 */

// 大型运输工具
export const BIG_COMMON_BODY: BodyPartConstant[] = [WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

// 大型升级者
const upConfig = {
    work: 10,
    carry: 10,
    move: 5
};
export const BIG_UP_BODY: BodyPartConstant[] = createBodyParts(upConfig);
export const BIG_UP_ENERYG: number = calculateBodyCost(BIG_UP_BODY);
// 主要目的是先升级采集者
export const BIG_COMMON_BODY_TMP: BodyPartConstant[] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE];
export const BIG_HARVEST_COUNT: number = 2;
export const BIG_BUILDER_COUNT: number = 0;
export const BIG_UPGRADE_COUNT: number = 2;
// 能量显示
export const BIG_ENERYG: number = 1000;
export const BIG_ENERYG_TMP: number = calculateBodyCost(BIG_COMMON_BODY_TMP);

// 您也可以在这里定义其他全局常量，比如 Spawn 的名称
export const MAIN_SPAWN_NAME: string = 'obsidianlyg';

// Creep 等级相关常量
export const CREEP_LEVELS = {
    BASIC: 1,      // 基础等级
    MEDIUM: 2,     // 中等等级
    ADVANCED: 3,   // 高级等级
    ELITE: 4       // 精英等级
} as const;

// 不同等级对应的能量阈值
export const ENERGY_THRESHOLDS = {
    [CREEP_LEVELS.BASIC]: 300,      // 基础能量需求
    [CREEP_LEVELS.MEDIUM]: 800,     // 中等能量需求
    [CREEP_LEVELS.ADVANCED]: 1500,  // 高级能量需求
    [CREEP_LEVELS.ELITE]: 2500      // 精英能量需求
} as const;

// 房间控制等级对应的建议 Creep 等级
export const RCL_TO_CREEP_LEVEL: { [key: number]: number } = {
    1: CREEP_LEVELS.BASIC,
    2: CREEP_LEVELS.BASIC,
    3: CREEP_LEVELS.MEDIUM,
    4: CREEP_LEVELS.MEDIUM,
    5: CREEP_LEVELS.ADVANCED,
    6: CREEP_LEVELS.ADVANCED,
    7: CREEP_LEVELS.ELITE,
    8: CREEP_LEVELS.ELITE
};
