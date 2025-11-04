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

    // 采集者
    const harvestCount = 2;
    const harvestConf = {
      work: 7,
      carry: 6,
      move: 4
    }
    const harvestBody = createBodyParts(harvestConf);
    harvesterRole.createBySpawn(roomName, calculateBodyCost(harvestBody), harvestCount, harvestBody);

    // 升级者
    const upCount = 1;
    const upConf = {
      work: 6,
      carry: 4,
      move: 5
    }
    const upBody = createBodyParts(upConf);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), upCount, harvestCount, upBody);

    // 建造者
    const buildCount = 1;
    const buildConf = {
      work: 4,
      carry: 4,
      move: 4
    }
    const buildBody = createBodyParts(buildConf);
    builderRole.createBySpawn(roomName, calculateBodyCost(buildBody), buildCount, harvestCount, buildBody);

    // 搬运工
    const transCount = 3;
    const mainTranConf = {
      carry: 8,
      move: 4
    }
    const mainBodyTrans= createBodyParts(mainTranConf);
    transporterRole.createBySpawn(roomName, calculateBodyCost(mainBodyTrans), transCount, mainBodyTrans, 'energy')

    // Claimer 创建（需要指定目标房间）
    // claimerRole.create('W9N8');
    // claimerRole.createBySourceRoom('W9N8', 1, 'W9N9');

    // tower 执行
    towerRole.run(base.room);

    // 主房间加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
    const mainRoom = roomName;
    const mainRoomBase = Game.rooms[mainRoom];
    const mainRoomSpwan = Game.spawns[mainRoom];

    // 矿工
    const minerCount = 1;
    const minerConf = {
      work: 8,
      carry: 1,
      move: 3
    }
    const minerBody: BodyPartConstant[] = createBodyParts(minerConf);
    minerRole.createBySpawn(roomName, calculateBodyCost(minerBody), minerCount, minerBody);

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
