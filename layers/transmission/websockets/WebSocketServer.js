"use strict"; 
var WebSocketDefault = require('./WebSocketDefault');


class WebSocketServer  extends WebSocketDefault{	
    constructor(port) {
    	super();
        try {
        	var self = this;
        	
        	this.sockets = {};  //Mapa de los sockets conectados. 
        	
        	var express=require('express');
        	var app = express();
        	var http = require('http').Server(app);
        	this.io = require('socket.io')(http);

            this.io.set('transports', ['websocket']); //NUEVO AÑADIDO 16/12/2016
            this.io.set('close timeout', 60*60*24); // 24h time out
            this.io.set('heartbeats', false);
            this.io.set('heartbeat interval', 999);            
            this.io.set('heartbeat timeout', 99999);
        	
        	app.use(express.static(__dirname + '/web/'));
        	
        	app.get('/', function(req, res){	
        	    res.sendFile(__dirname + '/web/'+Common.Constants.Index);        		  
                });
        	 	
        	this.io.on('connection', function(socket){
        		var id = self.addSocket(socket);
        		self.communicationsLayer.processConnect(id,1.1);     //ID de mensaje conectar=1.1
                        console.log("NEW SOCKET CONNECTED!");
                        console.log("Sockets Number -> "+Object.keys(self.sockets).length);                        
        		
        		 socket.on('disconnect', function(msg){
                                console.log("SOCKET DISCONNECTED!"); 
                                var id = self.getSocketId(socket);
                                self.communicationsLayer.processDisconnectRequest(id);
        			 self.removeSocket(socket);
        			 socket.disconnect();    //TODO ¿es necesario?
                                 console.log("Sockets Number -> "+Object.keys(self.sockets).length);
        		 });
        		 
        		  socket.on('message', function(msg){
        			  self.receive(msg);     				
        		  });
        		  socket.on('close', function(evt){
        			  console.log("Socket.IO close -> "+evt);
        		  });  
        		  socket.on('error', function(evt){
        			  console.log("Socket.IO errror -> "+evt);
        		  });                           
                          
        		});

        		http.listen(port, function(){
        		  console.log('listening on *:'+port);
        		});        	

        } catch (err){
            console.log("ERRROR: "+err.message);
            console.log("ERRROR STACK: "+err.stack);
//            this.server.close();
            throw err;
        }
    }
    
    initialize(communicationsLayer){
    	this.setCommunicationsLayer(communicationsLayer);
    }    

    send(message){
        var socket = this.sockets[message.getDestinyId()];
        if (socket){
            var remoteAddress = socket.request.connection.remoteAddress;
            var remotePort = socket.request.connection.remotePort;
            var id =remoteAddress+":"+remotePort;
            this.sendTo(message,socket);            
        } else { //Si ya no existe se elimina de las listas.
            console.log("Slave Disconnected: "+message.getDestinyId())
            this.communicationsLayer.removeNode(message.getDestinyId());
            this.removeSocketById(message.getDestinyId());
        }
	
    }     
    
    removeSocketById(id){
        delete this.sockets[id];    	    	
    }
    removeSocket(socket){
        var remoteAddress = socket.request.connection.remoteAddress;
        var remotePort = socket.request.connection.remotePort; 
        var id =remoteAddress+":"+remotePort;
        delete this.sockets[id];    	    	
        console.log("ID SOCKET ELIMINADO -> "+id);
    }    
    
    addSocket(socket){
		if (socket){
			var remoteAddress = socket.request.connection.remoteAddress;
			var remotePort = socket.request.connection.remotePort;  
                        console.log("SOCKET AÑADIDO -> remotePort: "+remotePort+" remoteIP: "+remoteAddress);
			var id =remoteAddress+":"+remotePort;
			this.sockets[id]=socket;   
			return id; 
		} else {
			throw new Error("socket isNullOrUndefined");
		}    	
    } 
    
    processRequest(message){
        this.communicationsLayer.processRequest(message);    	
    }   
    processResponse(message){
        this.communicationsLayer.processResponse(message);
    }     
    getSocketId(socket){
        var remoteAddress = socket.request.connection.remoteAddress;
        var remotePort = socket.request.connection.remotePort;                                
        return remoteAddress+":"+remotePort;        
    }
}

module.exports = WebSocketServer;