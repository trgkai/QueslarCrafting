// ==UserScript==
// @name         Queslar Enchanting Service Bullshit
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Tracking this stupid shit since Blah doesn't
// @author       trgKai
// @match        https://queslar.com/
// @match        https://www.queslar.com/
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    var KINGDOM_REBATE_PER_ACTION = 0.20; // Update to your rebate as a decimal (0.20 = 20%)

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
            queueData = playerGeneralService.marketService.playerEnchantingService.serviceData.listings;
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
        document.getElementsByClassName("recent-drops")[0].parentNode.children[0].innerHTML = "Service Queue";
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

        console.log('Setup Complete');
        setTimeout(runUpdates,1000);
    }

    function runUpdates() {
        updateQueue();
        updateRebates();
        setTimeout(runUpdates,5000);
    }

    function updateRebates() {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        var currentItem = rootElement.playerGeneralService.playerEnchantingService.craftedEnchant;

        document.getElementById("logDiv").innerHTML = "";
        var count = completionList.length;
        for (var i = 0; i < completionList.length; i++) {
            if (completionList[i].id == currentItem.id) {
                continue;
            }
            if (completionList[completionList.length-1].id == currentItem.id) {
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

        rootElement.playerGeneralService.chatService.chatForm.value.message = "/w " + playerNames[element.player] + " Your level " + element.level + " " + element.type + " enchant finished after " + element.actions + " actions. Your rebate of " + Math.floor(element.actions * KINGDOM_REBATE_PER_ACTION * element.price_value).toLocaleString() + " has been wired.";
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
        var playerQueue = playerGeneralService.playerQueueService.playerEnchantingQueue;
        if (!playerQueue) {
            return;
        }
        var queueData = playerGeneralService.marketService.playerEnchantingService.serviceData.listings;
        if (!queueData) {
            return;
        }
        var currentItem = playerGeneralService.playerEnchantingService.craftedEnchant;
        if (!currentItem) {
            return;
        }
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
            lastItem = currentItem.id;

            found = 0;

            for (i = 0; i < villages.length; i++) {
                for (var x = 0; x < villages[i].members.length; x++) {
                    if (villages[i].members[x].player_id == currentItem.player_id) {
                        found = 1;
                    }
                }
            }
            if (found == 1 && currentItem.player_id != myId) {
                completionList[completionList.length] = Object();
                completionList[completionList.length-1].id = currentItem.id;
                completionList[completionList.length-1].player = currentItem.player_id;
                completionList[completionList.length-1].actions = currentItem.crafted_actions_required;
                completionList[completionList.length-1].price_value = currentItem.price_value;
                completionList[completionList.length-1].type = currentItem.enchant_type;
                completionList[completionList.length-1].level = currentItem.level_requirement;
            }
        }
        if (currentItem.player_id == myId) {
            serviceQueue[serviceQueue.length] = Object();
            serviceQueue[serviceQueue.length-1].player = currentItem.player_id;
            serviceQueue[serviceQueue.length-1].actions = currentItem.crafted_actions_required;
            serviceQueue[serviceQueue.length-1].price = 0;
            serviceQueue[serviceQueue.length-1].price_value = 0;
            serviceQueue[serviceQueue.length-1].kingdom = 1;
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
                    serviceQueue[serviceQueue.length-1].price *= (1 - KINGDOM_REBATE_PER_ACTION);
                    serviceQueue[serviceQueue.length-1].kingdom = 1;
                }
                else {
                    serviceQueue[serviceQueue.length-1].kingdom = 0;
                }
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
            serviceData[queueData[i].id].type = queueData[i].enchant_type;
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
                    serviceData[queueData[i].id].price *= (1 - KINGDOM_REBATE_PER_ACTION);
                    serviceQueue[serviceQueue.length-1].price *= (1 - KINGDOM_REBATE_PER_ACTION);
                }
            }
        }

        var time = 0;
        var craftSpeed = 1;
        if (playerGeneralService.partyService.partyInformation[myId].equipment.enchanting) {
            craftSpeed = 1 + playerGeneralService.partyService.partyInformation[myId].equipment.enchanting;
        }
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
