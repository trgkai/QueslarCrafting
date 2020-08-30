// ==UserScript==
// @name         Queslar Crafting Service Bullshit
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  Tracking this stupid shit since Blah doesn't
// @author       trgKai
// @match        https://www.queslar.com/
// @match        https://queslar.com/
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';
    var KINGDOM_REBATE_PER_ACTION = 10000; // UPDATE THIS TO HOW MUCH PER ACTION YOU WILL REFUND KINGDOM ORDERS


    var playerNames = JSON.parse(GM_getValue("playerNames","[]"));
    var serviceData = JSON.parse(GM_getValue("serviceData","[]"));
    var serviceQueue = JSON.parse(GM_getValue("serviceQueue","[]"));
    var completionList = JSON.parse(GM_getValue("completionList","[]"));
    var queueCounter = 0;
    var queueValue = 0;
    var lastItem = 0;
    playerNames[0] = "Unknown";

    function rebateUpdate() {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        var currentItem = rootElement.playerGeneralService.playerCraftingService.craftedEquipment;

        document.getElementById("logDiv").innerHTML = "";
        var count = completionList.length;
        for (var i = 0; i < completionList.length; i++) {
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
            btn.innerText = "Send " + (element.actions * KINGDOM_REBATE_PER_ACTION / 1000000) + "m Rebate";
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

        rootElement.playerGeneralService.chatService.chatForm.value.message = "/w " + playerNames[element.player] + " Your level " + element.level + " " + element.type + " has finished crafting after " + element.actions + " actions. Your rebate of " + (element.actions * KINGDOM_REBATE_PER_ACTION).toLocaleString() + " has been wired.";
        document.getElementsByClassName("chat-submit")[0].click();
        rootElement.playerGeneralService.chatService.chatForm.value.message = "/wire " + playerNames[element.player] + " " + (element.actions * KINGDOM_REBATE_PER_ACTION) + " gold";
        document.getElementsByClassName("chat-submit")[0].click();

        completionList.splice(i,1);
        rebateUpdate();
    }

    function cancelRebate(evt) {
        completionList.splice(evt.currentTarget.myNum,1);
        rebateUpdate();
    }

    function runSetup()
    {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        if (!rootElement)
        {
            setTimeout(runSetup, 500);
            return;
        }
        var playerGeneralService = rootElement.playerGeneralService;
        if (!playerGeneralService)
        {
            setTimeout(runSetup, 500);
            return;
        }
        var queueData = playerGeneralService.marketService.playerCraftingService.serviceData.listings;

        if (!queueData)
        {
            setTimeout(runSetup, 500);
            return;
        }

        if (!playerGeneralService
            || !playerGeneralService.playerCraftingService
            || !playerGeneralService.playerCraftingService.craftingSocketData
            || !playerGeneralService.playerCraftingService.socketService
	    || !playerGeneralService.playerCraftingService.socketService.socket
            || !playerGeneralService.playerCraftingService.socketService.socket._callbacks
            || !playerGeneralService.playerCraftingService.socketService.socket._callbacks["$crafting data"]
            || !playerGeneralService.playerCraftingService.socketService.socket._callbacks["$crafting data"].length)
        {
            setTimeout(runSetup, 500);
            return;
        }

        console.log('we have set up');

        var queueDiv = document.createElement("div");
        queueDiv.id = "queueDiv";
        queueDiv.style.fontSize = "85%";
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

//	var playerCraftingService = playerGeneralService.playerCraftingService;
//	var craftingSocket = playerCraftingService.craftingSocketData;

//	playerCraftingService.socketService.socket._callbacks["$crafting data"][0] = e => {
//		craftingSocket.next(e);

		// paste the message to console so you can figure out how to interact with it
//		console.log(e);

		// do whatever you want with it
//	};

        setTimeout(updateQueue, 1000);
    }

    function updateQueue() {
        var rootElement = getAllAngularRootElements()[0].children[1]["__ngContext__"][30];
        var playerGeneralService = rootElement.playerGeneralService;
        var villages = playerGeneralService.playerKingdomService.kingdomData.village;
        var playerQueue = playerGeneralService.playerQueueService.playerCraftingQueue;
        var queueData = playerGeneralService.marketService.playerCraftingService.serviceData.listings;
        var currentItem = playerGeneralService.playerCraftingService.craftedEquipment;
        var totalValue = 0;
        var found = 0;
        var j = 0;
        var k = 0;
        var actions_done = currentItem.crafted_actions_done;

        serviceQueue.splice(0,serviceQueue.length);
        queueCounter = 0;
        queueValue = 0;

        for (var i = 0; i < playerQueue.length; i++) {
            if (serviceData[playerQueue[i].service_market_item_id]) {
                serviceQueue[playerQueue[i].service_market_item_id] = Object();
                serviceQueue[playerQueue[i].service_market_item_id].player = serviceData[playerQueue[i].service_market_item_id].player;
                serviceQueue[playerQueue[i].service_market_item_id].price = serviceData[playerQueue[i].service_market_item_id].price;
                serviceQueue[playerQueue[i].service_market_item_id].actions = serviceData[playerQueue[i].service_market_item_id].actions;
                found = 0;
                for (j = 0; j < villages.length; j++) {
                    for (k = 0; k < villages[j].members.length; k++) {
                        if (villages[j].members[k].player_id == serviceData[playerQueue[i].service_market_item_id].player) {
                            found = 1;
                        }
                    }
                }
                if (found == 1) {
                    serviceQueue[playerQueue[i].service_market_item_id].kingdom = 1;
                }
                else {
                    serviceQueue[playerQueue[i].service_market_item_id].kingdom = 0;
                }
            }
            else {
                continue;
            }
        }

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
            if (found == 1 && currentItem.player_id != 1896) {
                completionList[completionList.length] = Object();
                completionList[completionList.length-1].player = currentItem.player_id;
                completionList[completionList.length-1].actions = currentItem.crafted_actions_required;
                completionList[completionList.length-1].type = currentItem.item_type;
                completionList[completionList.length-1].level = currentItem.level_requirement;
            }
        }
        if (currentItem.player_id != 1896) {
            serviceQueue[currentItem.id] = Object();
            serviceQueue[currentItem.id].player = currentItem.player_id;
            serviceQueue[currentItem.id].actions = currentItem.crafted_actions_required;

            found = 0;
            for (j = 0; j < villages.length; j++) {
                for (k = 0; k < villages[j].members.length; k++) {
                    if (villages[j].members[k].player_id == currentItem.player_id) {
                        found = 1;
                    }
                }
            }
            if (currentItem.price_type == "action") {
                serviceQueue[currentItem.id].price = currentItem.price_value * currentItem.crafted_actions_required;
                if (found == 1) {
                    serviceQueue[currentItem.id].price -= KINGDOM_REBATE_PER_ACTION * currentItem.crafted_actions_required;
                    serviceQueue[currentItem.id].kingdom = 1;
                }
                else {
                    serviceQueue[currentItem.id].kingdom = 0;
                }
            }
            else if (currentItem.price_type == "level") {
                serviceQueue[currentItem.id].price = currentItem.price_value * currentItem.level_requirement;
            }
        }
        for (i = 0; i < queueData.length; i++) {
            playerNames[queueData[i].player_id] = queueData[i].buyerUsername;
            serviceData[queueData[i].id] = Object();
            serviceData[queueData[i].id].player = queueData[i].player_id;
            serviceData[queueData[i].id].actions = queueData[i].crafted_actions_required;
            serviceData[queueData[i].id].type = queueData[i].item_type;
            serviceData[queueData[i].id].level = queueData[i].level_requirement;
            serviceQueue[queueData[i].id] = Object();
            serviceQueue[queueData[i].id].player = queueData[i].player_id;
            serviceQueue[queueData[i].id].actions = queueData[i].crafted_actions_required;
            if (queueData[i].price_type == "action") {
                totalValue += queueData[i].price_value * queueData[i].crafted_actions_required;
                serviceData[queueData[i].id].price = queueData[i].price_value * queueData[i].crafted_actions_required;
                serviceQueue[queueData[i].id].price = queueData[i].price_value * queueData[i].crafted_actions_required;
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
                    serviceQueue[queueData[i].id].kingdom = 1;
                }
                else {
                    serviceData[queueData[i].id].kingdom = 0;
                    serviceQueue[queueData[i].id].kingdom = 0;
                }
                if (serviceData[queueData[i].id].kingdom == 1) {
                    serviceData[queueData[i].id].price -= queueData[i].crafted_actions_required * KINGDOM_REBATE_PER_ACTION;
                    serviceQueue[queueData[i].id].price -= queueData[i].crafted_actions_required * KINGDOM_REBATE_PER_ACTION;
                }
            }
            else if (queueData[i].price_type == "level") {
                totalValue += queueData[i].price_value * queueData[i].level_requirement;
                serviceData[queueData[i].id].price = queueData[i].price_value * queueData[i].level_requirement;
                serviceQueue[queueData[i].id].price = queueData[i].price_value * queueData[i].level_requirement;
            }
        }

        var time = 0;
        var craftSpeed = 1 + (playerGeneralService.partyService.partyInformation[1896].equipment.crafting / 20000);
        document.getElementById("queueDiv").innerHTML = '<span id="queueLen"></span> queued for <span id="queueValue"></span><br />';
        serviceQueue.forEach(function(element) {
            queueCounter++;
            queueValue += element.price;
            if (queueCounter != 1) {
                time += (element.actions / craftSpeed * 6);
            }
            else {
                time += ((element.actions - actions_done) / craftSpeed * 6);
            }
            var hours = Math.floor(time / (60 * 60)).toString();
            var minutes = Math.floor((time % (60 * 60)) / (60)).toString();

            document.getElementById("queueDiv").innerHTML += queueCounter.toString().padStart(2,"0") + ": " + hours.padStart(2,"0") + "h" + minutes.padStart(2,"0") + "m : ";
            document.getElementById("queueDiv").innerHTML += playerNames[element.player] + "<br />";
        });
        document.getElementById("queueLen").innerText = queueCounter;
        document.getElementById("queueValue").innerText = queueValue.toLocaleString();
        rebateUpdate();


        GM_setValue("playerNames", JSON.stringify(playerNames));
        GM_setValue("serviceData", JSON.stringify(serviceData));
        GM_setValue("serviceQueue", JSON.stringify(serviceQueue));
        GM_setValue("completionList", JSON.stringify(completionList));
        setTimeout(updateQueue,5000);
    }

    function checkSetup()
    {
        if (typeof getAllAngularRootElements !== "function")
        {
            console.log('Waiting for angular');
            setTimeout(checkSetup, 500);
        }
        else
        {
            console.log('Angular found; running setup');
            runSetup();
        }
    }

    checkSetup();
})();
