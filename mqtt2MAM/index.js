'use strict'


const MAM = require('./lib/attachData.js')
const IOTA = require('iota.lib.js')
const mqtt = require ('mqtt');
var client  = mqtt.connect('mqtt://m20.cloudmqtt.com:18784',{
  username: 'typeHereYourUsername',
  password: 'typeHereYourPassword'
});

const iota = new IOTA();
var jsonData = null;


//connect and subscribe to topic

client.on('connect', function () {
  client.subscribe('halyl/feeds/iota');
  console.log('client has subscribed successfully');
});

function getmyjson(myjson){
jsonData = JSON.parse(myjson);
};

// get data
client.on('message', function (topic, message){
getmyjson(message);
//console.log(message.toString());
});

let timeLoop,date, 
        i=1

if( process.argv[2] == undefined){          //Getting the time in seconds for the loop
  timeLoop = 4000                       //default 1 minute
} else {
  timeLoop = process.argv[2]*1000 
}

//Create a JSON as message


function lat () {
  return Math.round((Math.random() * 0.02 + 47.07) * 1000) / 1000;
}

function lng () {
  return Math.round((Math.random() * 0.02 + 15.43) * 1000) / 1000;
}


function start(){
        date = new Date(Date.now()).toLocaleString();

    let message = { 'Message' : i, 'Date' : date, 
     'id': 'VehicleNode Graz',
     'testlocation':  {'lat': 47.07, 'lng': 15.43},
     'location':  {'lat': lat(), 'lng': lng()},
     'device' : jsonData.device,
     'UnitUnderTest' : jsonData.UUT,

     'data': {
     'vehicleSpeed' : jsonData.VehicleSpeed,
     'engineSpeed' : jsonData.EngineSpeed,
     'intakeAirTemperature' : jsonData.IntakeAirTemp,
     'coolantTemperature' : jsonData.CoolantTemp  }
    };


        console.log('Start sending data to Tangle...');
        let messageS = JSON.stringify(message);
        console.log('Message: %s',messageS);
        console.log('Message in trytes: ' + iota.utils.toTrytes(messageS));
        MAM.attach(message);

        console.log('--------------------------------------------------------------------------------------------------------------------');
        i++;

}

setInterval(function(){
        start()
},timeLoop)



