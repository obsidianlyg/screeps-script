import harvesterRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import minerRole from "roles/miner";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

import {
    CreepRole,
    CreepLevel,
    getBodyByRole,
    createBodyParts,
    getLevelByEnergy,
    canAffordBody,
    adjustBodyToEnergy,
    calculateBodyCost
} from '../utils/BodyUtils';

import towerRole from "roles/tower";

const roomName = 'obsidianlyg';
const mainRoom = {
  create: function () {
    const base = Game.spawns[roomName];

    // 创建

    // 巨型采集者
    harvesterRole.createBig();
    upgradeRole.createBig();
    builderRole.createBig();

    // 搬运工
    const mainTranConf = {
      carry: 8,
      move: 4
    }
    const mainBodyTrans= createBodyParts(mainTranConf);
    transporterRole.createBySpawn(roomName, calculateBodyCost(mainBodyTrans), 3, mainBodyTrans, 'energy')

    // Claimer 创建（需要指定目标房间）
    // claimerRole.create('W9N8');
    // claimerRole.createBySourceRoom('W9N8', 1, 'W9N9');

    // tower 执行
    towerRole.run(base.room);

    // 主房间加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
    const mainRoom = roomName;
    const mainRoomBase = Game.rooms[mainRoom];
    const mainRoomSpwan = Game.spawns[mainRoom];
    const minerBody: BodyPartConstant[] = [WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE, MOVE];
    minerRole.createBySpawn(mainRoom, 1000, 1, minerBody);

    // 做个矿工搬运者
    const minerTansBody: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
    transporterRole.createMineralTransporter(
                  mainRoomSpwan,
                  minerTansBody,
                  RESOURCE_ZYNTHIUM,
                  'W8N8',
                  'W8N8'
              );
    }
}

export default mainRoom;
