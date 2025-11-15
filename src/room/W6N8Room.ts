import harvesterRole from "roles/harvester";

import upgradeRole from "roles/upgrader";

import builderRole from "roles/builder";

import transporterRole from "roles/transporter";

import claimerRole from "roles/claimer";

import minerRole from "roles/miner";

import { getSpawnAndExtensionEnergy, getDefaultEneryg } from "utils/GetEnergy";

import LinkManager from "utils/LinkManager";

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
       work: 6,
      carry: 6,
      move: 2
    }
    const buildConf = {
      work: 4,
      carry: 4,
      move: 4
    }
    const upConf = {
      work: 4,
      carry: 4,
      move: 4
    }
    const tranConf = {
      carry: 6,
      move: 4
    }
    // creep数量
    const harvestCount = 2;
    const buildCount = 1;
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

    // link 传输
    const sourceLink: Id<StructureLink> = "69134f1eb6cfe3003b2f7f92" as Id<StructureLink>;
    const targetLink: Id<StructureLink> = "69134dcd5329a70039e96e30" as Id<StructureLink>;
    LinkManager.transferEnergyToLink(sourceLink, targetLink);
    // link 搬运者
    const linkTCong = {
      carry: 4,
      move: 4
    }
    const linkTBody = createBodyParts(linkTCong);
    transporterRole.createTemp(roomName, calculateBodyCost(linkTBody), 1, linkTBody, 'link');


  }
}

export default subRoom;
