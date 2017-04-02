"use strict"; 

var Node = require('./node/node.js');

class Communications  {	
    constructor() {
        this.applicationLayer=null; //USAR SET
        this.transmissionsLayer=null;   //USAR SET 
        this.nodes = {}; //new Node(); //Lista de esclavos
        this.myId=null; //NODO DEL MONITOR ES 0       
    }
    
    setApplicationLayer(appLayer){
        this.applicationLayer=appLayer;    	
    }
    setTransmissionsLayer(transmissionsLayer){
        this.transmissionsLayer=transmissionsLayer;  	
    }	
    getApplicationLayer(){
        return this.applicationLayer;    	
    }
    
    getTransmissionsLayer(){
        return this.transmissionsLayer;    	
    }
    getMyId(){
        return this.myId;     	
    }
    setMyId(id){
        this.myId=id;     	
    }
    addNode(idNode){
    	//TODO -> creo que no es necesario esta comprobación porque ya se hace en el nivel inferior.     
        if (idNode || idNode === 0){ //No es null or undefined
            console.log("idNode="+idNode)
            var node = new Node(idNode);
            this.nodes[idNode]=node;
            return node;          
        } else {
            throw new Error("idNode isNullOrUndefined");
        }    	
    }
    removeNode(id){
        delete this.nodes[id];    	
    }
    getNode(idNode){
        return this.nodes[idNode];    	
    }
    getFreeNode(){
        for(var idNode in this.nodes){
            if (!this.nodes[idNode].isAnyMessageWaitingResponse()){
//                console.log("getFreeNode()="+JSON.stringify(this.nodes[idNode]));
//                console.log("2getFreeNode()="+this.nodes[idNode].isAnyMessageWaitingResponse());
                
                
                return this.nodes[idNode];
            }
        }    
        return null;    	
    }
    processError(error){
        console.log("Communication Errror received from: "+message.getSourceId());
        console.log("ERRROR: "+message.getError().message);
        console.log("ERRROR STACK: "+message.getError().stack);  
        throw error;    	
    }
    
    removeMessageWaitingResponse(message){
        try{
            this.nodes[message.getSourceId()].removeMessageWaitingResponse(message.getId()*-1); 
        } catch(e){
            throw "*******ERRROR CONTROLADO: "+e;
        }
           	
    }
    sendToAll(type,data){
        var msg = new Common.Elements.Message(type,null, this.getMyId(), null, null,data, new Date().getTime());
        this.sendBroadCast(msg);        
    }
    sendTo(type,task,idNode) {      
      var node = this.getNode(idNode);
      if (node){ //NO ES NULL O UNDEFINED
          var message = new Common.Elements.Message(type, node.getNextMessageId(), this.getMyId(), node.getId(), null, task, new Date().getTime());          
          node.addMessageWaitingResponse(message);
          node = this.getNode(idNode);
          this.getTransmissionsLayer().send(message);
          return true;       
      }else {
          return false;
      }    	
    }       

    

    sendBroadCast(message){
    	var node = null;	
        var destinyId;
        var nextMessageId=null;
        for (destinyId in this.nodes) {
        	node=this.nodes[destinyId];
        	nextMessageId=node.getNextMessageId();
        	node.addMessageWaitingResponse(message);
            message.setDestinyId(destinyId);
            message.setId(nextMessageId);
            this.transmissionsLayer.send(message);  
//            message = new Common.Elements.Message(message.getType(),message.getId(), this.getMyId(), destinyId, message.getError(),message.getData(), message.getTimeSent); 
        }    	
    }    
    

       

    getFreeNodeId(){
        var node = this.getFreeNode();
        if (node || node===0){
            return node.getId();
        } else {
            return null;
        }    	
    }
    

    
}

module.exports = Communications;

