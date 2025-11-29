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

const roomName = 'W9N9';
const subRoom = {
  create: function () {
    const room = Game.rooms[roomName];
    const leftRoomSpwan = Game.spawns[roomName];

    // body
    const harvestConf = {
       work: 6,
      carry: 6,
      move: 2
    }
    const buildConf = {
      work: 6,
      carry: 6,
      move: 4
    }
    const upConf = {
      work: 6,
      carry: 6,
      move: 4
    }
    const tranConf = {
      carry: 8,
      move: 4
    }
    // creep数量
    const harvestCount = 2;
    const buildCount = 2;
    const upCount = 1;
    const transCount = 4;

    const harvestBody = createBodyParts(harvestConf);
    const buildBody = createBodyParts(buildConf);
    const upBody = createBodyParts(upConf);
    const transBody = createBodyParts(tranConf);
    harvesterRole.createBySpawn(roomName, calculateBodyCost(harvestBody), harvestCount, harvestBody);
    builderRole.createBySpawn(roomName, calculateBodyCost(buildBody), buildCount, harvestCount, buildBody);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), upCount, harvestCount, upBody);
    transporterRole.createBySpawn(roomName, calculateBodyCost(transBody), transCount, transBody, 'energy')
    towerRole.run(room);

    const minerCount = 0;
    const minerConf = {
      work: 8,
      carry: 1,
      move: 3
    }
    const minerBody: BodyPartConstant[] = createBodyParts(minerConf);
    minerRole.createBySpawn(roomName, calculateBodyCost(minerBody), minerCount, minerBody);


    // 加入矿工， 这个矿工移到矿区要在它脚底下放一个容器
    const mainRoomSpwan = Game.spawns[roomName];

    // 做个矿工搬运者
    const minerTansBody: BodyPartConstant[] = [CARRY, CARRY, CARRY, CARRY, MOVE, MOVE];
    transporterRole.createMineralTransporter(
                  mainRoomSpwan,
                  minerTansBody,
                  RESOURCE_HYDROGEN,
                  'W9N9',
                  'W9N9'
              );

    // 临时搬运工
    const tempTCong = {
      carry: 10,
      move: 6
    }
    const tempTBody = createBodyParts(tempTCong);
    transporterRole.createTemp(roomName, calculateBodyCost(tempTBody), 1, tempTBody, 'temp');

  }
}

export default subRoom;
