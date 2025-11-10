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

const roomName = 'W6N8';
const subRoom = {
  create: function () {
    const room = Game.rooms[roomName];

    // body
    const harvestConf = {
       work: 2,
      carry: 2,
      move: 2
    }
    const buildConf = {
      work: 2,
      carry: 2,
      move: 2
    }
    const upConf = {
      work: 2,
      carry: 2,
      move: 2
    }
    const tranConf = {
      carry: 4,
      move: 4
    }
    // creep数量
    const harvestCount = 1;
    const buildCount = 1;
    const upCount = 1;
    const transCount = 2;

    const harvestBody = createBodyParts(harvestConf);
    const buildBody = createBodyParts(buildConf);
    const upBody = createBodyParts(upConf);
    const transBody = createBodyParts(tranConf);
    harvesterRole.createBySpawn(roomName, calculateBodyCost(harvestBody), harvestCount, harvestBody);
    builderRole.createBySpawn(roomName, calculateBodyCost(buildBody), buildCount, harvestCount, buildBody);
    upgradeRole.createBySpawn(roomName, calculateBodyCost(upBody), upCount, harvestCount, upBody);
    transporterRole.createBySpawn(roomName, calculateBodyCost(transBody), transCount, transBody, 'energy')
    towerRole.run(room);


  }
}

export default subRoom;
