// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs

'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const axios = require('axios');
 
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements
 
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));
 
  function welcome(agent) {
    agent.add("Welcome!");  
  }
  
  function callApi(url) {
    return axios.get(url);
  }
  
  function callApiPut(url) {
    return axios.put(url, {});
  }
  
  function callApiPost(url, data) {
    return axios.post(url, data);
  }
  
  function report(agent) {
    return callApi("https://apibot2121.azurewebsites.net/api/buildings/num").then(res => {
        let n = res.data;
      	let greetings = "Greetings.\n";
      	let elevatorsAndBuildings = "There are currently " + n.numElevators + " elevators deployed in the " + n.numBuildings + " buildings of your " + n.numCustomers + " customers.\n";
      	let elevatorsBeingServiced = "Currently, " + n.numElevatorsBeingServiced + " elevators are not in running status and are being serviced.\n";
      	let batteriesAndCities =  n.numBatteries + " batteries are deployed across " + n.numCities + " cities.\n";
      	let quotes = "On another note you currently have " + n.numQuotes  + " quotes awaiting processing.\n";
      	let leads = "You also have " + n.numLeads + " leads in your contact requests.\n";
      	let r = greetings + elevatorsAndBuildings + elevatorsBeingServiced + batteriesAndCities + quotes + leads;
      	console.log(r);
      	agent.add(r);
    });
  }
  
  function getCategory() {
    let string = agent.parameters.object;
    let result;
    if (string == "battery") { result = "batteries"; }
    else if (string == "elevator" || string == "column") { result = string + "s"; }
    else { result = "invalid"; }
    return result;
  }
  
  function getObjectStatus(agent) {
    let category = getCategory();
    console.log(category);
    if (category == "invalid") { 
      agent.add(```
        The object is not valid.
        You can only ask for the status of elevators, columns and batteries.
        For exemple: 'What is the status of elevator #1'
      ```);
      return;
    }
    
    if ((category !== "invalid")) {
      return callApi("https://apibot2121.azurewebsites.net/api/" + category + "/" + agent.parameters.id + "/status").then(res1 => {
        let r = "The status of " + agent.parameters.object + " #" + agent.parameters.id + " is: " + res1.data;
        agent.add(r);
      });
    }
  }
  
  function updateObjectStatus(agent) {
    let category = getCategory();
    if (category == "invalid") { 
      agent.add(```
        The object is not valid.
        You can only ask for the status of elevators, columns and batteries.
        For exemple: 'What is the status of elevator #1'
      ```);
      return;
    }
    
    if ((category !== "invalid")) {
      return callApiPut("https://apibot2121.azurewebsites.net/api/" + category + "/update/" + agent.parameters.id + "/" + agent.parameters.new).then(res1 => {
        let r = "The state of " + agent.parameters.object.toLowerCase() + " #" + agent.parameters.id + " is now: " + res1.data.status;
        console.log(r);
        agent.add(r);
      });
    }
  }
  
  function createIntervention(agent) {
    var params =
    {
      "customerId": agent.parameters.customer_Id,
      "buildingId": agent.parameters.building_Id,
      "batteryId": agent.parameters.battery_Id,
      "columnId": agent.parameters.column_Id,
      "elevatorId": agent.parameters.elevator_Id,
      "report": agent.parameters.report
    };

    return callApiPost("https://apibot2121.azurewebsites.net/api/interventions/dialogflowCreate", params)
    .then((newIntervention) => { 
      if (newIntervention.data == '') { 
        agent.add('Invalid entry'); 
      }
      
      else {
        agent.add("Intervention created successfully");
      }
    })
    .catch(function (error) { console.log(error); });
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', report);
  intentMap.set('Default Fallback Intent', fallback);
  intentMap.set('Object Get Status', getObjectStatus);
  intentMap.set('Object Update Status', updateObjectStatus);
  intentMap.set('Create Intervention', createIntervention);
  agent.handleRequest(intentMap);
});
