// 定义 Creep 体部件的类型（BodyPartConstant 是 Screeps TS 类型）

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
export const CARRIER_BODY: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE];

/**
 * Transporter 的目标数量
 */
export const TRANSPORTER_COUNT: number = 3;

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
// 主要目的是先升级采集者
export const BIG_COMMON_BODY_TMP: BodyPartConstant[] = [WORK, WORK, WORK, WORK, WORK, WORK, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];
export const BIG_HARVEST_COUNT: number = 3;
export const BIG_BUILDER_COUNT: number = 2;
export const BIG_UPGRADE_COUNT: number = 3;
// 能量显示
export const BIG_ENERYG: number = 1000;
export const BIG_ENERYG_TMP: number = 1100;

// 您也可以在这里定义其他全局常量，比如 Spawn 的名称
export const MAIN_SPAWN_NAME: string = 'obsidianlyg';
