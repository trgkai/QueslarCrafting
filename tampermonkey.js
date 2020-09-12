// ==UserScript==
// @name         Queslar Crafting Service Bullshit
// @namespace    http://tampermonkey.net/
// @version      0.7
// @description  Tracking this stupid shit since Blah doesn't
// @author       trgKai
// @match        https://www.queslar.com/
// @match        https://queslar.com
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    var KINGDOM_REBATE_PER_ACTION = 0.2; // UPDATE THIS TO HOW MUCH PER ACTION YOU WILL REFUND KINGDOM ORDERS

    var playerNames = JSON.parse(GM_getValue("playerNames","[]"));
    var serviceData = JSON.parse(GM_getValue("serviceData","[]"));
    var serviceQueue = JSON.parse(GM_getValue("serviceQueue","[]"));
    var completionList = JSON.parse(GM_getValue("completionList","[]"));
    var queueCounter = 0;
    var queueValue = 0;
    var lastItem = 0;
    playerNames[0] = "Unknown";

    function runSetup() {
        var rootElement, playerGeneralService, queueData;

        try {
            rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
            playerGeneralService = rootElement.playerGeneralService;
            queueData = playerGeneralService.marketService.playerCraftingService.serviceData.listings;
            playerGeneralService.socketService.socket._callbacks["$boosts data"][0] = e => {
                playerGeneralService.playerBoostsService.boostsSocketData.next(e);
                updateBoosts();
            };
            playerGeneralService.socketService.socket._callbacks["$house data"][0] = e => {
                playerGeneralService.playerHouseService.buildingSocketData.next(e);
                updateBoosts();
            };
        } catch(err) {
            console.log("Couldn't finish setup, delaying 0.5 seconds.");
            setTimeout(runSetup,500);
            return;
        }

        var queueDiv = document.createElement("div");
        queueDiv.id = "queueDiv";
        queueDiv.style.fontSize = "80%";
        queueDiv.style.fontFamily = "Lucida Grande, Consolas";
        queueDiv.style.overflow = "scroll";
        queueDiv.style.maxHeight = "530px";
        document.getElementsByClassName("recent-drops")[0].appendChild(queueDiv);
        document.getElementsByClassName("recent-drops")[0].parentNode.children[0].innerHTML = "Crafting Queue";
        document.getElementsByClassName("recent-drops")[0].parentNode.children[1].style.display = "none";

        var logDiv = document.createElement("div");
        logDiv.id = "logDiv";
        logDiv.style.fontFamily = "Menlo";
        logDiv.style.overflow = "scroll";
        logDiv.style.maxHeight = "366px";
        logDiv.style.textAlign = "center";
        document.getElementsByTagName("app-equipment")[0].removeChild(document.getElementsByTagName("app-equipment")[0].children[1]);
        document.getElementsByTagName("app-equipment")[0].children[0].innerHTML = "Kingdom Rebates";
        document.getElementsByTagName("app-equipment")[0].appendChild(logDiv);

        var statsDiv = document.createElement("div");
        statsDiv.id = "statsDiv";
        statsDiv.style.fontSize = "150%";
        statsDiv.style.fontWeight = "bold";
        statsDiv.style.textAlign = "center";
        document.getElementsByTagName("app-action-tracker")[0].children[1].appendChild(statsDiv);
        var boostDiv = document.createElement("div");
        boostDiv.id = "boostDiv";
        boostDiv.style.fontSize = "125%";
        boostDiv.style.textAlign = "center";
        document.getElementsByTagName("app-action-tracker")[0].children[1].appendChild(boostDiv);

        console.log('Setup Complete');
        playerNames[1421] = "kormara";
        playerNames[1142] = "Redegl";
        runUpdates();
    }

    function runUpdates() {
        updateQueue();
        updateRebates();
        updateBoosts();
//        updateFighters();
        marketCheck();
        setTimeout(runUpdates,5000);
    }

    function marketCheck() {
        var relicOrders = getAllAngularRootElements()[0].children[1]["__ngContext__"][30].playerGeneralService.marketService.market.buyOrders.relics;
        var marketDiv = document.getElementById("marketDiv");
        if (!marketDiv) {
            marketDiv = document.createElement("div");
            marketDiv.id = "marketDiv";
            marketDiv.style.fontSize = "100%";
            marketDiv.style.textAlign = "center";
            document.getElementsByTagName("app-action-tracker")[0].children[1].appendChild(marketDiv);
        }
        marketDiv.innerHTML = "<br />";
        for (var i = 0; i < 3 && i < relicOrders.length; i++) {
            marketDiv.innerHTML += relicOrders[i].price + " by " + playerNames[relicOrders[i].player_id] + " (" + relicOrders[i].amount.toLocaleString() + ")<br />";
        }
    }

    function updateFighters() {
        var fighters = getAllAngularRootElements()[0].children[1]["__ngContext__"][30].playerGeneralService.playerFighterService;
        var fighterStats = fighters.playerFighters;
        var cost = 111110000;
        var floor = fighters.playerFighterData.dungeon_level;
        var relics_earned = 0;
        for (var i = 0; i < floor; i++) {
            if (i < 201) {
                relics_earned += i * 500;
            }
            else {
                relics_earned += 100000;
                relics_earned += (i-200) * 250;
            }
        }

        var fighterDiv = document.getElementById("fighterDiv");
        if (!fighterDiv) {
            fighterDiv = document.createElement("div");
            fighterDiv.id = "fighterDiv";
            fighterDiv.style.fontSize = "125%";
            fighterDiv.style.textAlign = "center";
            document.getElementsByTagName("app-action-tracker")[0].children[1].appendChild(fighterDiv);
        }
        for (var fighter in fighterStats) {
            cost += ((fighterStats[fighter].crit_damage * 10000 + 10000)/2) * fighterStats[fighter].crit_damage;
            cost += ((fighterStats[fighter].damage * 10000 + 10000)/2) * fighterStats[fighter].damage;
            cost += ((fighterStats[fighter].defense * 10000 + 10000)/2) * fighterStats[fighter].defense;
            cost += ((fighterStats[fighter].dodge * 10000 + 10000)/2) * fighterStats[fighter].dodge;
            cost += ((fighterStats[fighter].health * 10000 + 10000)/2) * fighterStats[fighter].health;
            cost += ((fighterStats[fighter].hit * 10000 + 10000)/2) * fighterStats[fighter].hit;
        }
        fighterDiv.innerText = (cost / relics_earned).toFixed(2);
    }

    function getCost(level) {
        var cost = (level+1) * 10;

        while (level > 4999) {
            cost += (level - 4999) * 20;
            level -= 1000;
        }
        return cost;
    }

    function getAverage(craftingLevel, villageBoost, kingdomBoost, craftingBoost, craftingHouse, consistencyBoost, consistencyHouse, powerBoost, powerHouse, luckBoost, luckHouse) {
        var base = 2 * (1 +((craftingBoost * 0.05/100) + (craftingHouse / 100)));
        var consistency = 1000 / (1000 + (((consistencyBoost * 0.05/100)+(consistencyHouse / 100)) * 1000));
        var capacity = 2 * (((powerBoost * 0.05/100)+(powerHouse/100)));
        var minimum = base * (1 - consistency) * (1 + (craftingLevel / 10000)) * (1 + villageBoost) * (1 + kingdomBoost) * 1.1 / 3;
        var maximum = (base + capacity) * (1 + (craftingLevel / 10000)) * (1 + villageBoost) * (1 + kingdomBoost) * 1.1 / 3;
        var baseAverage = (minimum+maximum)/2;
        var trueAverage = baseAverage * (1+ (luckBoost * 0.05/100)+(luckHouse/100));
        return trueAverage;
    }

    function updateBoosts() {
        var playerGeneralService = getAllAngularRootElements()[0].children[1]["__ngContext__"][30].playerGeneralService;
        var craftBoosts = playerGeneralService.playerBoostsService.boosts.crafting;
        var craftHouse = playerGeneralService.playerHouseService.houseItems.bedroom;
        var craftingLevel = playerGeneralService.playerLevelsService.crafting.level;
        var villageBoost = playerGeneralService.playerVillageService.buildings.mason.amount / 100;
        var kingdomBoost = playerGeneralService.playerKingdomService.kingdomData.tiles.length * 0.05;
        var luckBoost = craftBoosts[0].amount;
        var powerBoost = craftBoosts[1].amount;
        var craftingBoost = craftBoosts[2].amount;
        var consistencyBoost = craftBoosts[3].amount;
        var luckHouse = craftHouse.bed.level;
        var powerHouse = craftHouse.closet.level;
        var craftingHouse = craftHouse.nightstand.level;
        var consistencyHouse = craftHouse.window.level;
        var relics = playerGeneralService.playerCurrencyService.shattered_crafting_relics;
        var startingAverage = 0;
        var newAverage = 0;

        startingAverage = getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse);
        document.getElementById("statsDiv").innerHTML = startingAverage.toFixed(2) + "<br />" + relics.toLocaleString();
        var luckEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost+10,luckHouse) - startingAverage) / getCost(luckBoost+10);
        var powerEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost+10,powerHouse,luckBoost,luckHouse) - startingAverage) / getCost(powerBoost+10);
        var craftingEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost+10,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse) - startingAverage) / getCost(craftingBoost+10);
        var consistencyEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost+10,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse) - startingAverage) / getCost(consistencyBoost+10);

        if (luckEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML = "Luck is currently best.";
        }
        else if (powerEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML = "Power is currently best.";
        }
        else if (craftingEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML = "Crafting is currently best.";
        }
        else {
            document.getElementById("boostDiv").innerHTML = "Consistency is currently best.";
        }

        for (var i = 0; i < playerGeneralService.playerHouseService.houseQueue.length; i++) {
            var item = playerGeneralService.playerHouseService.houseQueue[i];
            if (item.building == "closet") {
                powerHouse++;
            }
            else if (item.building == "nightstand") {
                craftingHouse++;
            }
            else if (item.building == "bed") {
                luckHouse++;
            }
            else if (item.building == "window") {
                consistencyHouse++;
            }
            else {
                alert("Couldn't identify queued item.");
            }
        }

        startingAverage = getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse);

        luckEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse+1) - startingAverage) / (luckHouse + 1);
        powerEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse,powerBoost,powerHouse+1,luckBoost,luckHouse) - startingAverage) / (powerHouse + 1);
        craftingEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse+1,consistencyBoost,consistencyHouse,powerBoost,powerHouse,luckBoost,luckHouse) - startingAverage) / (craftingHouse + 1);
        consistencyEfficiency = (getAverage(craftingLevel,villageBoost,kingdomBoost,craftingBoost,craftingHouse,consistencyBoost,consistencyHouse+1,powerBoost,powerHouse,luckBoost,luckHouse) - startingAverage) / (consistencyHouse + 1);

        if (luckEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML += "<br />Bed is currently best.";
        }
        else if (powerEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML += "<br />Closet is currently best.";
        }
        else if (craftingEfficiency == Math.max(luckEfficiency,powerEfficiency,craftingEfficiency,consistencyEfficiency)) {
            document.getElementById("boostDiv").innerHTML += "<br />Nightstand is currently best.";
        }
        else {
            document.getElementById("boostDiv").innerHTML += "<br />Window is currently best.";
        }
    }

    function updateRebates() {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        var currentItem = rootElement.playerGeneralService.playerCraftingService.craftedEquipment;

        document.getElementById("logDiv").innerHTML = "";
        var count = completionList.length;
        for (var i = 0; i < completionList.length; i++) {
            console.log(completionList[i]);
            if (completionList[i].type == currentItem.item_type && completionList[i].player == currentItem.player_id && completionList[i].level == currentItem.level_requirement) {
                continue;
            }
            if (completionList[completionList.length-1].type == currentItem.item_type && completionList[completionList.length-1].player == currentItem.player_id && completionList[completionList.length-1].level == currentItem.level_requirement) {
                count -= 1;
            }
            var element = completionList[i];
            document.getElementById("logDiv").innerHTML = "<br /><br />Eligible Orders: " + count + "<br />" + playerNames[element.player] + "'s " + element.level + " " + element.type + "";
            var btn = document.createElement('button');
            btn.classList.add("mat-raised-button");
            btn.myNum = i;
            btn.innerText = "Send " + KINGDOM_REBATE_PER_ACTION*100 + "% Rebate";
            btn.style.marginTop = "20px";
            btn.addEventListener("click",sendRebate);
            document.getElementById("logDiv").appendChild(btn);
            var btn2 = document.createElement('button');
            btn2.classList.add("mat-raised-button");
            btn2.myNum = i;
            btn2.innerText = "Deny Rebate";
            btn2.style.marginTop = "20px";
            btn2.addEventListener("click",cancelRebate);
            document.getElementById("logDiv").appendChild(btn2);
            break;
        }
    }

    function sendRebate(evt) {
        var i = evt.currentTarget.myNum;
        var element = completionList[i];
        var chatInput = document.getElementsByClassName("chat-input")[0];
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];

        rootElement.playerGeneralService.chatService.chatForm.value.message = "/w " + playerNames[element.player] + " Your level " + element.level + " " + element.type + " has finished crafting after " + element.actions + " actions. Your rebate of " + Math.floor(element.actions * KINGDOM_REBATE_PER_ACTION * element.price_value).toLocaleString() + " has been wired.";
        document.getElementsByClassName("chat-submit")[0].click();
        rootElement.playerGeneralService.chatService.chatForm.value.message = "/wire " + playerNames[element.player] + " " + Math.floor(element.actions * KINGDOM_REBATE_PER_ACTION * element.price_value) + " relics";
        document.getElementsByClassName("chat-submit")[0].click();

        completionList.splice(i,1);
        updateRebates();
    }

    function cancelRebate(evt) {
        completionList.splice(evt.currentTarget.myNum,1);
        updateRebates();
    }

    function updateQueue() {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        var playerGeneralService = rootElement.playerGeneralService;
        var villages = playerGeneralService.playerKingdomService.kingdomData.village;
        var playerQueue = playerGeneralService.playerQueueService.playerCraftingQueue;
        var queueData = playerGeneralService.marketService.playerCraftingService.serviceData.listings;
        var currentItem = playerGeneralService.playerCraftingService.craftedEquipment;
        var myId = playerGeneralService.gameService.playerData.id;
        var totalValue = 0;
        var found = 0;
        var j = 0;
        var k = 0;
        var actions_done = currentItem.crafted_actions_done;
        var kingdomQueue = 0;

        playerNames[myId] = playerGeneralService.gameService.playerData.username;
        serviceQueue.splice(0,serviceQueue.length);
        queueCounter = 0;
        queueValue = 0;

        if (lastItem == 0) {
            lastItem = currentItem.id;
        }
        else if (lastItem != currentItem.id) {
            console.log("Finished new item.");
            lastItem = currentItem.id;

            found = 0;

            for (i = 0; i < villages.length; i++) {
                for (var x = 0; x < villages[i].members.length; x++) {
                    if (villages[i].members[x].player_id == currentItem.player_id) {
                        found = 1;
                        console.log("Found in my kingdom, should add to completion list.");

                    }
                }
            }
            if (found == 1 && currentItem.player_id != myId) {
                console.log("Adding to completion list.");
                completionList[completionList.length] = Object();
                completionList[completionList.length-1].player = currentItem.player_id;
                completionList[completionList.length-1].actions = currentItem.crafted_actions_required;
                completionList[completionList.length-1].price_value = currentItem.price_value;
                completionList[completionList.length-1].type = currentItem.item_type;
                completionList[completionList.length-1].level = currentItem.level_requirement;
            }
        }
        if (currentItem.player_id == myId) {
            serviceQueue[serviceQueue.length] = Object();
            serviceQueue[serviceQueue.length-1].player = currentItem.player_id;
            serviceQueue[serviceQueue.length-1].actions = currentItem.crafted_actions_required;
            serviceQueue[serviceQueue.length-1].price = 0;
            serviceQueue[serviceQueue.length-1].price_value = 0;
        }
        else if (currentItem.player_id != myId) {
            serviceQueue[serviceQueue.length] = Object();
            serviceQueue[serviceQueue.length-1].player = currentItem.player_id;
            serviceQueue[serviceQueue.length-1].actions = currentItem.crafted_actions_required;
            serviceQueue[serviceQueue.length-1].price_value = currentItem.price_value;

            found = 0;
            for (j = 0; j < villages.length; j++) {
                for (k = 0; k < villages[j].members.length; k++) {
                    if (villages[j].members[k].player_id == currentItem.player_id) {
                        found = 1;
                    }
                }
            }
            if (currentItem.price_type == "action") {
                serviceQueue[serviceQueue.length-1].price = currentItem.price_value * currentItem.crafted_actions_required;
                if (found == 1) {
                    serviceQueue[serviceQueue.length-1].price -= Math.floor(KINGDOM_REBATE_PER_ACTION * currentItem.price);
                    serviceQueue[serviceQueue.length-1].kingdom = 1;
                }
                else {
                    serviceQueue[serviceQueue.length-1].kingdom = 0;
                }
            }
            else if (currentItem.price_type == "level") {
                serviceQueue[serviceQueue.length-1].price = currentItem.price_value * currentItem.level_requirement;
            }
        }

        for (var i = 0; i < playerQueue.length; i++) {
            if (serviceData[playerQueue[i].service_market_item_id]) {
                serviceQueue[serviceQueue.length] = Object();
                serviceQueue[serviceQueue.length-1].player = serviceData[playerQueue[i].service_market_item_id].player;
                serviceQueue[serviceQueue.length-1].price = serviceData[playerQueue[i].service_market_item_id].price;
                serviceQueue[serviceQueue.length-1].actions = serviceData[playerQueue[i].service_market_item_id].actions;
                serviceQueue[serviceQueue.length-1].price_value = serviceData[playerQueue[i].service_market_item_id].price_value;
                found = 0;
                for (j = 0; j < villages.length; j++) {
                    for (k = 0; k < villages[j].members.length; k++) {
                        if (villages[j].members[k].player_id == serviceData[playerQueue[i].service_market_item_id].player) {
                            found = 1;
                        }
                    }
                }
                if (found == 1) {
                    serviceQueue[serviceQueue.length-1].kingdom = 1;
                }
                else {
                    serviceQueue[serviceQueue.length-1].kingdom = 0;
                }
            }
            else if (playerQueue[i].player_id == myId) {
                serviceQueue[serviceQueue.length] = Object();
                serviceQueue[serviceQueue.length-1].player = playerQueue[i].player_id;
                serviceQueue[serviceQueue.length-1].actions = Math.sqrt(playerQueue[i].level_requirement / 2) * ( 4 + Math.sqrt(5)) * 3;
                serviceQueue[serviceQueue.length-1].price = 0;
            }
            else {
                continue;
            }
        }


        for (i = 0; i < queueData.length; i++) {
            playerNames[queueData[i].player_id] = queueData[i].buyerUsername;
            serviceData[queueData[i].id] = Object();
            serviceData[queueData[i].id].player = queueData[i].player_id;
            serviceData[queueData[i].id].actions = queueData[i].crafted_actions_required;
            serviceData[queueData[i].id].type = queueData[i].item_type;
            serviceData[queueData[i].id].level = queueData[i].level_requirement;
            serviceData[queueData[i].id].price_value = queueData[i].price_value;
            serviceQueue[serviceQueue.length] = Object();
            serviceQueue[serviceQueue.length-1].player = queueData[i].player_id;
            serviceQueue[serviceQueue.length-1].actions = queueData[i].crafted_actions_required;
            serviceQueue[serviceQueue.length-1].price_value = queueData[i].price_value;
            if (queueData[i].price_type == "action") {
                totalValue += queueData[i].price_value * queueData[i].crafted_actions_required;
                serviceData[queueData[i].id].price = queueData[i].price_value * queueData[i].crafted_actions_required;
                serviceQueue[serviceQueue.length-1].price = queueData[i].price_value * queueData[i].crafted_actions_required;
                found = 0;
                for (j = 0; j < villages.length; j++) {
                    for (k = 0; k < villages[j].members.length; k++) {
                        if (villages[j].members[k].player_id == queueData[i].player_id) {
                            found = 1;
                        }
                    }
                }
                if (found == 1) {
                    serviceData[queueData[i].id].kingdom = 1;
                    serviceQueue[serviceQueue.length-1].kingdom = 1;
                }
                else {
                    serviceData[queueData[i].id].kingdom = 0;
                    serviceQueue[serviceQueue.length-1].kingdom = 0;
                }
                if (serviceData[queueData[i].id].kingdom == 1) {
                    serviceData[queueData[i].id].price -= Math.floor(queueData[i].price * KINGDOM_REBATE_PER_ACTION);
                    serviceQueue[serviceQueue.length-1].price -= Math.floor(queueData[i].price * KINGDOM_REBATE_PER_ACTION);
                }
            }
            else if (queueData[i].price_type == "level") {
                totalValue += queueData[i].price_value * queueData[i].level_requirement;
                serviceData[queueData[i].id].price = queueData[i].price_value * queueData[i].level_requirement;
                serviceQueue[serviceQueue.length-1].price = queueData[i].price_value * queueData[i].level_requirement;
            }
        }

        var time = 0;
        var craftSpeed = 1;
        document.getElementById("queueDiv").innerHTML = '<span id="queueLen"></span> queued for <span id="queueValue"></span><br />';
        serviceQueue.forEach(function(element) {
            queueCounter++;
            if (element.kingdom == 1) {
                kingdomQueue++;
            }
            queueValue += element.price;
            if (queueCounter != 1 || currentItem.player_id == myId) {
                time += (element.actions / craftSpeed * 6);
            }
            else {
                time += ((element.actions - actions_done) / craftSpeed * 6);
            }
            var hours = Math.floor(time / (60 * 60)).toString();
            var minutes = Math.floor((time % (60 * 60)) / (60)).toString();

            document.getElementById("queueDiv").innerHTML += queueCounter.toString().padStart(2,"0") + ": " + hours.padStart(2,"0") + "h" + minutes.padStart(2,"0") + "m : ";
            document.getElementById("queueDiv").innerHTML += playerNames[element.player] + " @ " + (element.price_value / 1000) + "k<br />";
        });
        document.getElementById("queueLen").innerText = queueCounter + " (" + kingdomQueue + ")";
        document.getElementById("queueValue").innerText = queueValue.toLocaleString();


        GM_setValue("playerNames", JSON.stringify(playerNames));
        GM_setValue("serviceData", JSON.stringify(serviceData));
        GM_setValue("serviceQueue", JSON.stringify(serviceQueue));
        GM_setValue("completionList", JSON.stringify(completionList));
    }

    runSetup();
})();
