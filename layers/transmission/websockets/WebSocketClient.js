"use strict"; 
var WebSocketDefault = require('./WebSocketDefault');

class WebSocketClient  extends WebSocketDefault{	
        constructor(socket) {
            super();            
            var myMethod="constructor()";
            this.monitorSocket = null;  
            
            socket.on('message', (msg)=>{
                this.receive(msg);
            }); 



                //ESTO LO HE AÑADIDO LUEGO 17-12-2016
                 socket.on('disconnect', function(msg){
                                alert("SOCKET DISCONNECTED!"+msg); 
                                alert(JSON.stringify(msg)); 


                 });
                 

                  socket.on('close', function(evt){
                      alert("Socket.IO close -> "+evt);
                  });  
                  socket.on('error', function(evt){
                      alert("Socket.IO errror -> "+evt);
                  })   
                //ESTO LO HE AÑADIDO LUEGO 17-12-2016
                                               
            // socket.on('error', (err)=>{
                // alert("ERROR CON EL SERVIDOR SOCKET.IO EN EL CLIENTE"+err)
                // throw "ERROR CON EL SERVIDOR SOCKET.IO EN EL CLIENTE"+err;
            // });      
            // socket.on('connect_failed', ()=>{
            //     throw "connect_failed CON EL SERVIDOR SOCKET.IO EN EL CLIENTE";
            // });   
            // socket.on('reconnect_failed', ()=>{
            //     throw "reconnect_failed CON EL SERVIDOR SOCKET.IO EN EL CLIENTE";
            // });                             
        }

        send(message){
            this.sendTo(message,this.monitorSocket);    	
        }  
        initialize(communicationsLayer,monitorSocket){
            this.setCommunicationsLayer(communicationsLayer);
            this.monitorSocket=monitorSocket;
        }

        processRequest(message){           
             this.communicationsLayer.processRequest(message); 
        }

        processResponse(message){
             switch(message.getType()) {
             case Common.Constants.MessageTypes.CONNECT:
                 console.log("Connection Established.");
                 this.processConnectResponse(message);
                 break;   	         
             default:
                   this.communicationsLayer.processResponse(message);
             } 
        }   
	processConnectResponse(message){
		//TODO ¿TRY CATCH?
            if (message.getError()){ //ERROR no es null o undefined
                this.processError(message.getError());
            } else {
                this.communicationsLayer.processConnectResponse(message.getSourceId(),message.getData(),message.getDestinyId());
            }
	}
}

module.exports = WebSocketClient;