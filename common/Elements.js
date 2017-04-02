module.exports = {
  Set:require("./Set"),      
    
  ChromosomeVRP:require("../chromosome/ChromosomeVRP"),
  ChromosomeBinary:require("../chromosome/ChromosomeBinary"),
  Individual:require("../Individual"),
  ProblemCVRP:require("../problem/problemCVRP"),  
  ProblemOneMax:require("../problem/ProblemOneMax"),
  Population:require("../population"),  
  AlgorithmOneMax:require("../algorithm/AlgorithmOneMax"),   
  AlgorithmCVRP:require("../algorithm/AlgorithmCVRP"),   
  Customer:require("../problem/problemCVRP/customer"),    
  LocalApplication:require("../layers/application/LocalApplication"),
  MonitorApplication:require("../layers/application/MonitorApplication"),       
  SlaveApplication:require("../layers/application/SlaveApplication"),   
  Message:require("../layers/transmission/messages/Message"),    
    
  MonitorCommunication:require("../layers/communication/MonitorCommunication"),
  SlaveCommunication:require("../layers/communication/SlaveCommunication"),
  
  WebSocketServer:require("../layers/transmission/websockets/WebSocketServer"),  
  WebSocketClient:require("../layers/transmission/websockets/WebSocketClient"),
  WebSocketDefault:require("../layers/transmission/websockets/WebSocketDefault")  
};