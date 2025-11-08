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
    const upCount = 3;
    const upConf = {
      work: 6,
      carry: 4,
      move: 5
    }
    const upBody = createBodyParts(upConf);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), upCount, harvestCount, upBody);

    // 建造者
    const buildCount = 2;
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

    // 矿工
    const minerCount = 1;
    const minerConf = {
      work: 8,
      carry: 1,
      move: 3
    }
    const minerBody: BodyPartConstant[] = createBodyParts(minerConf);
    minerRole.createBySpawn(roomName, calculateBodyCost(minerBody), minerCount, minerBody);

    // Claimer 创建（需要指定目标房间）
    // claimerRole.create('W9N8');
    // claimerRole.createBySourceRoom('W9N8', 1, 'W9N9');

    // tower 执行
    towerRole.run(base.room);

    // 主房间加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
    const mainRoomSpwan = Game.spawns[roomName];

    // 做个矿工搬运者
    const minerTansBody: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
    transporterRole.createMineralTransporter(
                  mainRoomSpwan,
                  minerTansBody,
                  RESOURCE_ZYNTHIUM,
                  'W8N8',
                  'W8N8'
              );

    // 志愿者
    // const buildConfV = {
    //   work: 4,
    //   carry: 4,
    //   move: 4
    // }
    // const upConfV = {
    //   work: 4,
    //   carry: 4,
    //   move: 4
    // }
    // const haConfV = {
    //   work: 6,
    //   carry: 6,
    //   move: 6
    // }
    // const haBodyV = createBodyParts(haConfV);
    // const buildBodyV = createBodyParts(buildConfV);
    // const upBodyV = createBodyParts(upConfV);
    // harvesterRole.createVolunteerBySpawn(roomName, 'W9N9', calculateBodyCost(haBodyV), 2, haBodyV);
    // builderRole.createVolunteerBySpawn(roomName, 'W9N9', calculateBodyCost(buildBodyV), 2,  buildBodyV);
    // upgradeRole.createVolunteerBySpawn(roomName, 'W9N9', calculateBodyCost(upBodyV), 1,  upBodyV);


    // 特殊搬运工
    const tempTCong = {
      carry: 10,
      move: 6
    }
    const tempTBody = createBodyParts(tempTCong);
    transporterRole.createTemp(roomName, calculateBodyCost(tempTBody), 1, tempTBody, 'temp');

  }
}

export default mainRoom;
