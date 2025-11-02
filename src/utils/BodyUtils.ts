/**
 * Body 配置工具类
 * 根据不同等级和角色设置不同的 Creep Body 配置
 */

// 角色类型枚举
export enum CreepRole {
    HARVESTER = 'harvester',
    BUILDER = 'builder',
    TRANSPORTER = 'transporter',
    UPGRADER = 'upgrader',
    CLAIMER = 'claimer',
    ATTACKER = 'attacker',
    HEALER = 'healer'
}

// 等级枚举
export enum CreepLevel {
    BASIC = 1,      // 基础等级
    MEDIUM = 2,     // 中等等级
    ADVANCED = 3,   // 高级等级
    ELITE = 4       // 精英等级
}

// 等级对应的能量需求
export const ENERGY_REQUIREMENTS = {
    [CreepLevel.BASIC]: 300,      // 基础能量需求
    [CreepLevel.MEDIUM]: 800,     // 中等能量需求
    [CreepLevel.ADVANCED]: 1500,  // 高级能量需求
    [CreepLevel.ELITE]: 2500      // 精英能量需求
};

/**
 * 采集者 Body 配置
 * WORK 部件越多，采集速度越快
 */
export function getHarvesterBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [WORK, CARRY, MOVE];

        case CreepLevel.MEDIUM:
            return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [WORK, WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

        default:
            return [WORK, CARRY, MOVE];
    }
}

/**
 * 建造者 Body 配置
 * 平衡 WORK 和 CARRY 部件
 */
export function getBuilderBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [WORK, CARRY, MOVE];

        case CreepLevel.MEDIUM:
            return [WORK, WORK, CARRY, CARRY, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [WORK, WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

        default:
            return [WORK, CARRY, MOVE];
    }
}

/**
 * 搬运者 Body 配置
 * 主要关注 CARRY 部件，移动速度快
 */
export function getTransporterBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [CARRY, CARRY, MOVE];

        case CreepLevel.MEDIUM:
            return [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE];

        default:
            return [CARRY, CARRY, MOVE];
    }
}

/**
 * 升级者 Body 配置
 * 专注于 WORK 部件，用于升级 Controller
 */
export function getUpgraderBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [WORK, CARRY, MOVE];

        case CreepLevel.MEDIUM:
            return [WORK, WORK, CARRY, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE, MOVE];

        default:
            return [WORK, CARRY, MOVE];
    }
}

/**
 * 占领者 Body 配置
 * 主要用于占领新房间
 */
export function getClaimerBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [CLAIM, MOVE];

        case CreepLevel.MEDIUM:
            return [CLAIM, MOVE, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [CLAIM, CLAIM, MOVE, MOVE, MOVE, MOVE, MOVE];

        default:
            return [CLAIM, MOVE];
    }
}

/**
 * 攻击者 Body 配置
 * 专注于战斗能力
 */
export function getAttackerBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [ATTACK, MOVE];

        case CreepLevel.MEDIUM:
            return [ATTACK, ATTACK, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [TOUGH, TOUGH, ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE];

        default:
            return [ATTACK, MOVE];
    }
}

/**
 * 治疗者 Body 配置
 * 专注于治疗能力
 */
export function getHealerBody(level: CreepLevel): BodyPartConstant[] {
    switch (level) {
        case CreepLevel.BASIC:
            return [HEAL, MOVE];

        case CreepLevel.MEDIUM:
            return [HEAL, HEAL, MOVE, MOVE];

        case CreepLevel.ADVANCED:
            return [HEAL, HEAL, HEAL, MOVE, MOVE, MOVE];

        case CreepLevel.ELITE:
            return [TOUGH, TOUGH, HEAL, HEAL, HEAL, HEAL, MOVE, MOVE, MOVE, MOVE];

        default:
            return [HEAL, MOVE];
    }
}

/**
 * 根据 Room 控制等级确定 Creep 等级
 */
export function getLevelByRCL(rcl: number): CreepLevel {
    if (rcl >= 7) return CreepLevel.ELITE;
    if (rcl >= 5) return CreepLevel.ADVANCED;
    if (rcl >= 3) return CreepLevel.MEDIUM;
    return CreepLevel.BASIC;
}

/**
 * 根据可用能量确定 Creep 等级
 */
export function getLevelByEnergy(availableEnergy: number): CreepLevel {
    if (availableEnergy >= ENERGY_REQUIREMENTS[CreepLevel.ELITE]) return CreepLevel.ELITE;
    if (availableEnergy >= ENERGY_REQUIREMENTS[CreepLevel.ADVANCED]) return CreepLevel.ADVANCED;
    if (availableEnergy >= ENERGY_REQUIREMENTS[CreepLevel.MEDIUM]) return CreepLevel.MEDIUM;
    return CreepLevel.BASIC;
}

/**
 * 获取角色对应的 Body 配置
 */
export function getBodyByRole(role: CreepRole, level: CreepLevel): BodyPartConstant[] {
    switch (role) {
        case CreepRole.HARVESTER:
            return getHarvesterBody(level);
        case CreepRole.BUILDER:
            return getBuilderBody(level);
        case CreepRole.TRANSPORTER:
            return getTransporterBody(level);
        case CreepRole.UPGRADER:
            return getUpgraderBody(level);
        case CreepRole.CLAIMER:
            return getClaimerBody(level);
        case CreepRole.ATTACKER:
            return getAttackerBody(level);
        case CreepRole.HEALER:
            return getHealerBody(level);
        default:
            return [WORK, CARRY, MOVE];
    }
}

/**
 * 计算 Body 配置的能量成本
 */
export function calculateBodyCost(body: BodyPartConstant[]): number {
    const BODYPART_COST: { [key: string]: number } = {
        [MOVE]: 50,
        [WORK]: 100,
        [CARRY]: 50,
        [ATTACK]: 80,
        [RANGED_ATTACK]: 150,
        [HEAL]: 250,
        [CLAIM]: 600,
        [TOUGH]: 10
    };

    return body.reduce((total, part) => total + BODYPART_COST[part], 0);
}

/**
 * 检查是否有足够能量创建指定 Body
 */
export function canAffordBody(body: BodyPartConstant[], availableEnergy: number): boolean {
    return calculateBodyCost(body) <= availableEnergy;
}

/**
 * 自动调整 Body 配置以适应可用能量
 */
export function adjustBodyToEnergy(baseBody: BodyPartConstant[], availableEnergy: number): BodyPartConstant[] {
    const cost = calculateBodyCost(baseBody);

    if (cost <= availableEnergy) {
        return baseBody;
    }

    // 如果能量不足，逐步减少非关键部件
    const adjustedBody = [...baseBody];
    const remainingEnergy = availableEnergy;

    // 优先保留 MOVE 部件，确保移动能力
    const moveParts = adjustedBody.filter(part => part === MOVE);
    const otherParts = adjustedBody.filter(part => part !== MOVE);

    // 逐步减少其他部件直到能量足够
    let currentCost = calculateBodyCost(adjustedBody);
    while (currentCost > remainingEnergy && otherParts.length > 0) {
        otherParts.pop(); // 移除最后一个部件
        const newBody = [...otherParts, ...moveParts];
        currentCost = calculateBodyCost(newBody);
    }

    return currentCost <= remainingEnergy ? [...otherParts, ...moveParts] : [WORK, CARRY, MOVE];
}

/**
 * 根据类型和数量创建 Creep 身体部件数组。
 * * @param partsConfig 包含部件类型和数量的配置对象 (例如: { work: 5, carry: 5, move: 10 })
 * @returns {BodyPartConstant[]} 标准的 Creep 身体部件数组
 */
export function createBodyParts(partsConfig: Record<string, number>): BodyPartConstant[] {
    const body: BodyPartConstant[] = [];

    // 遍历配置对象
    for (const partType in partsConfig) {
        if (partsConfig.hasOwnProperty(partType)) {
            const count = partsConfig[partType];

            // 将字符串键转换为 Screeps 对应的 BodyPartConstant
            let constantType: BodyPartConstant | undefined;

            // 注意：这里需要根据您在配置中使用的字符串来映射到 SCREEPS 官方常量
            switch (partType.toLowerCase()) {
                case 'work':
                    constantType = WORK;
                    break;
                case 'carry':
                    constantType = CARRY;
                    break;
                case 'move':
                    constantType = MOVE;
                    break;
                case 'attack':
                    constantType = ATTACK;
                    break;
                case 'ranged_attack':
                    constantType = RANGED_ATTACK;
                    break;
                case 'heal':
                    constantType = HEAL;
                    break;
                case 'tough':
                    constantType = TOUGH;
                    break;
                case 'claim':
                    constantType = CLAIM;
                    break;
                default:
                    // 忽略无效的部件类型
                    console.warn(`[createBodyParts] 警告: 未知部件类型 "${partType}"`);
                    continue;
            }

            // 将指定数量的部件推入数组
            for (let i = 0; i < count; i++) {
                if (constantType) {
                    body.push(constantType);
                }
            }
        }
    }

    // 注意：Screeps 要求身体部件的顺序可能影响 Creep 的性能或行为（如 TOUGH 应该放前面），
    // 默认的遍历顺序可能不满足这个要求。如果需要特定的顺序，需要先排序。
    return body;
}

// 辅助方法：计算该配置的总造价
// function calculateBodyCost(body: BodyPartConstant[]): number {
//     return body.reduce((cost, part) => cost + BODYPART_COST[part], 0);
// }

// 默认导出
export default {
    getHarvesterBody,
    getBuilderBody,
    getTransporterBody,
    getUpgraderBody,
    getClaimerBody,
    getAttackerBody,
    getHealerBody,
    getLevelByRCL,
    getLevelByEnergy,
    getBodyByRole,
    calculateBodyCost,
    canAffordBody,
    adjustBodyToEnergy,
    createBodyParts,
    CreepRole,
    CreepLevel,
    ENERGY_REQUIREMENTS
};
