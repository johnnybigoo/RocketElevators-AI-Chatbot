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
  
  function report(agent) {
    return callApi("https://apibot2121.azurewebsites.net/api/buildings/num").then(res => {
        let n = res.data;
      	let greetings = "Hi,\n";
      	let elevatorsAndBuildings = "there are currently " + n.numElevators + " elevators deployed in the " + n.numBuildings + " buildings of your " + n.numCustomers + " customers.\n";
      	let elevatorsBeingServiced = "Currently, " + n.numElevatorsBeingServiced + " elevators are not in running status and are being serviced.\n";
      	let batteriesAndCities =  n.numBatteries + " batteries are deployed across " + n.numCities + " cities.\n";
      	let quotes = "On another note you currently have " + n.numQuotes  + " quotes awaiting processing.\n";
      	let leads = "You also have " + n.numLeads + " leads in your contact requests.\n";
      	let r = greetings + elevatorsAndBuildings + elevatorsBeingServiced + batteriesAndCities + quotes + leads;
      	console.log(r);
      	agent.add(r);
    });
  }
    
  function elevatorReport(agent) {
    return callApi("https://apibot2121.azurewebsites.net/api/elevators/" + agent.parameters.elevatorId + "/status").then(res1 => {
      console.log(res1.data);
      let r = "The state of elevator #" + agent.parameters.elevatorId + " is: " + res1.data;
      agent.add(r);
  	});
  }
 
  function fallback(agent) {
    agent.add(`I didn't understand`);
    agent.add(`I'm sorry, can you try again?`);
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', report);
  intentMap.set('Default Fallback Intent', fallback);
  //intentMap.set('Report', report);
  intentMap.set('Elevator Report', elevatorReport);
  agent.handleRequest(intentMap);
});
