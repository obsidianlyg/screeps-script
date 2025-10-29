import {
    CLAIMER_BODY,
    CLAIMER_COUNT,
    MAIN_SPAWN_NAME
} from "constant/constants";

// 从 spawn 名称推断用户名（spawn 通常是用户名开头）
const USERNAME = MAIN_SPAWN_NAME;

let claimerRole = {
    create: function(targetRoomName?: string) {
        const base = Game.spawns[MAIN_SPAWN_NAME];
        if (!base) {
            console.log("找不到 Spawn: " + MAIN_SPAWN_NAME);
            return;
        }

        // 统计当前 claimer 数量
        const claimers = _.filter(Game.creeps, (creep) => creep.memory.role === 'claimer');

        // 如果数量不足且有明确的目标房间，创建新的 claimer
        if (claimers.length < CLAIMER_COUNT && targetRoomName) {
            const newName = 'Claimer' + Game.time;

            console.log(`尝试生成新的 Claimer: ${newName}，目标房间: ${targetRoomName}`);

            const result = base.spawnCreep(CLAIMER_BODY, newName, {
                memory: {
                    role: 'claimer',
                    room: targetRoomName, // 目标房间
                    targetRoom: targetRoomName,
                    working: false
                }
            });

            if (result === OK) {
                console.log(`成功将 ${newName} 加入到生成队列。`);
            } else if (result === ERR_NOT_ENOUGH_ENERGY) {
                console.log(`能量不足，无法生成 claimer。`);
            } else if (result === ERR_BUSY) {
                // 正常情况，Spawn 正在忙碌
            } else {
                console.log(`生成 Claimer 时发生错误: ${result}`);
            }
        }
    },

    run: function(creep: Creep) {
        // 获取目标房间
        const targetRoomName = creep.memory.targetRoom;
        if (!targetRoomName) {
            console.log(`${creep.name}: 没有目标房间，待命`);
            return;
        }

        // 检查是否在目标房间
        if (creep.room.name !== targetRoomName) {
            // 移动到目标房间
            creep.say(`🚶 ${targetRoomName}`);
            const exitDir = creep.room.findExitTo(targetRoomName);
            if (exitDir !== ERR_NO_PATH && exitDir !== ERR_INVALID_ARGS) {
                const exit = creep.pos.findClosestByRange(exitDir);
                if (exit) {
                    creep.moveTo(exit, {
                        visualizePathStyle: { stroke: '#ff00ff' }, // 紫色表示移动
                        ignoreCreeps: false
                    });
                }
            } else {
                console.log(`${creep.name}: 找不到到 ${targetRoomName} 的路径`);
            }
            return;
        }

        // 已经在目标房间，执行占领或预定逻辑
        const controller = creep.room.controller;
        if (!controller) {
            console.log(`${creep.name}: 房间 ${targetRoomName} 没有控制器`);
            return;
        }

        // 检查控制器状态
        if (!controller.my) {
            // 不是我的控制器，尝试占领或预定
            if (controller.reservation && controller.reservation.username !== USERNAME) {
                // 被其他玩家预定，尝试攻击预定
                creep.say('🔥 攻击预定');
                const attackResult = creep.attackController(controller);
                if (attackResult === OK) {
                    console.log(`${creep.name}: 正在攻击 ${targetRoomName} 的控制器预定`);
                } else if (attackResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#ff0000' }, // 红色表示攻击
                        ignoreCreeps: false
                    });
                } else {
                    console.log(`${creep.name}: 攻击控制器失败: ${attackResult}`);
                }
            } else if (!controller.owner) {
                // 无主房间，尝试占领
                creep.say('🚩 占领');
                const claimResult = creep.claimController(controller);
                if (claimResult === OK) {
                    console.log(`${creep.name}: 成功占领房间 ${targetRoomName}！`);
                    // 占领成功后，可以考虑自杀或转为其他角色
                } else if (claimResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#00ff00' }, // 绿色表示占领
                        ignoreCreeps: false
                    });
                } else if (claimResult === ERR_BUSY) {
                    console.log(`${creep.name}: 正在占领中...`);
                } else if (claimResult === ERR_INVALID_TARGET) {
                    console.log(`${creep.name}: 控制器不能占领（可能是保留房间）`);
                    // 尝试预定
                    this.reserveController(creep, controller, targetRoomName);
                } else {
                    console.log(`${creep.name}: 占领控制器失败: ${claimResult}`);
                }
            } else {
                // 被其他玩家占领，尝试攻击预定
                creep.say('⚔️ 攻击');
                const attackResult = creep.attackController(controller);
                if (attackResult === OK) {
                    console.log(`${creep.name}: 正在攻击 ${targetRoomName} 的控制器`);
                } else if (attackResult === ERR_NOT_IN_RANGE) {
                    creep.moveTo(controller, {
                        visualizePathStyle: { stroke: '#ff0000' },
                        ignoreCreeps: false
                    });
                } else {
                    console.log(`${creep.name}: 攻击控制器失败: ${attackResult}`);
                }
            }
        } else if (controller.my && !controller.reservation) {
            // 是我的控制器但未预定，进行预定
            this.reserveController(creep, controller, targetRoomName);
        } else {
            // 已经是我的控制器且已预定，任务完成
            creep.say('✅ 完成');
            console.log(`${creep.name}: 房间 ${targetRoomName} 已成功占领并预定`);

            // 可以选择让 claimer 自杀以节省资源
            // creep.suicide();
        }
    },

    /**
     * 预定控制器
     * @param creep Claimer creep
     * @param controller 控制器对象
     * @param roomName 房间名称
     */
    reserveController: function(creep: Creep, controller: StructureController, roomName: string) {
        creep.say('📋 预定');
        const reserveResult = creep.reserveController(controller);
        if (reserveResult === OK) {
            console.log(`${creep.name}: 正在预定房间 ${roomName}`);
        } else if (reserveResult === ERR_NOT_IN_RANGE) {
            creep.moveTo(controller, {
                visualizePathStyle: { stroke: '#00ffff' }, // 青色表示预定
                ignoreCreeps: false
            });
        } else if (reserveResult === ERR_INVALID_TARGET) {
            console.log(`${creep.name}: 房间 ${roomName} 不能预定（可能是房间等级太低）`);
        } else {
            console.log(`${creep.name}: 预定控制器失败: ${reserveResult}`);
        }
    }
};

export default claimerRole;