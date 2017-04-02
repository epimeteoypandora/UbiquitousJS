"use strict"
global.Common = require("./common/Common");

Common.Constants.Index=Common.Constants.IndexFromFile;
//Common.Constants.Index="asdfdasfdadsfdas";  

Common.Constants.FromFile=true;

console.log("SERVER")

var transmissionsLayer = new Common.Elements.WebSocketServer(3000);

var communicationLayer = new Common.Elements.MonitorCommunication();
var applicationLayer = new Common.Elements.MonitorApplication();

communicationLayer.initialize(applicationLayer,transmissionsLayer);


transmissionsLayer.initialize(communicationLayer);


applicationLayer.initialize(communicationLayer);