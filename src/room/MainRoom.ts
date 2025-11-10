import harvesterRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import minerRole from "roles/miner";

import attackerRole from "roles/attacker";
import healerRole from "roles/healer";

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

import creepCreate from "utils/CreepCreate";

const spwanName = 'obsidianlyg';
const room = 'W8N8';
const mainRoom = {
  create: function () {
    const base = Game.spawns[spwanName];

    // 创建

    // 采集者
    const harvestCount = 2;
    const harvestConf = {
      work: 7,
      carry: 6,
      move: 4
    }
    const harvestBody = createBodyParts(harvestConf);
    harvesterRole.createBySpawn(spwanName, calculateBodyCost(harvestBody), harvestCount, harvestBody);

    // 升级者
    const upCount = 1;
    const upConf = {
      work: 8,
      carry: 6,
      move: 4
    }
    const upBody = createBodyParts(upConf);
    upgradeRole.createBySpawn(spwanName, calculateBodyCost(upBody), upCount, harvestCount, upBody);

    // 建造者
    const buildCount = 2;
    const buildConf = {
      work: 4,
      carry: 4,
      move: 4
    }
    const buildBody = createBodyParts(buildConf);
    builderRole.createBySpawn(spwanName, calculateBodyCost(buildBody), buildCount, harvestCount, buildBody);

    // 搬运工
    const transCount = 5;
    const mainTranConf = {
      carry: 4,
      move: 2
    }
    const mainBodyTrans= createBodyParts(mainTranConf);
    transporterRole.createBySpawn(spwanName, calculateBodyCost(mainBodyTrans), transCount, mainBodyTrans, 'energy')

    // 矿工
    const minerCount = 1;
    const minerConf = {
      work: 8,
      carry: 1,
      move: 3
    }
    const minerBody: BodyPartConstant[] = createBodyParts(minerConf);
    minerRole.createBySpawn(spwanName, calculateBodyCost(minerBody), minerCount, minerBody);

    // Claimer 创建（需要指定目标房间）
    // claimerRole.create('W9N8');
    // claimerRole.createBySourceRoom('obsidianlyg', 1, 'W6N8');

    // tower 执行
    towerRole.run(base.room);

    // 主房间加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
    const mainRoomSpwan = Game.spawns[spwanName];

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
    const haParam: CreepParam = {
      role: 'harvester',
      spawn: spwanName,
      conf: {work: 6,carry: 6,move: 6},
      count: 2,
      room: 'W6N8'
    }
    const buildParam: CreepParam = {
      role: 'builder',
      spawn: spwanName,
      conf: {work: 4,carry: 4,move: 4},
      count: 2,
      room: 'W6N8'
    }
    const upParam: CreepParam = {
      role: 'upgrader',
      spawn: spwanName,
      conf: {work: 4, carry: 4, move: 4},
      count: 1,
      room: 'W6N8'
    }
    creepCreate.createByParam(haParam);
    creepCreate.createByParam(buildParam);
    creepCreate.createByParam(upParam);


    // 特殊搬运工
    const tempTCong = {
      carry: 10,
      move: 6
    }
    const tempTBody = createBodyParts(tempTCong);
    transporterRole.createTemp(spwanName, calculateBodyCost(tempTBody), 1, tempTBody, 'temp');


    // 攻击者
    // const attackConf = {
      //   tough: 10,
    //   attack: 10,
    //   move: 10
    // }
    // const attackBody = createBodyParts(attackConf);
    // attackerRole.createBySpawn(roomName, calculateBodyCost(attackBody), 1, attackBody, 'W6N5');
    // 治疗者
    // const healConf = {
    //   heal: 10,
    //   move: 10
    // }
    // const healBody = createBodyParts(healConf);
    // healerRole.createBySpawn(roomName, calculateBodyCost(healBody), 1, healBody, 'W6N5', true);

  }
}

export default mainRoom;
