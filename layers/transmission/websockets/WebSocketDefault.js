"use strict"; 

class WebSocketDefault  {	
    constructor() {
        this.communicationsLayer =  null; //SE DEBE UTILIZAR EL SET    
              
    }
    
    setCommunicationsLayer(communicationsLayer){
        this.communicationsLayer=communicationsLayer;    	
    }    

     
    sendTo(message,socket){        
        var messageString = JSON.stringify(message);   
        console.log("MENSAJE ENVIADO: "+messageString);
        socket.emit('message', messageString); 	
    }      
    
    receive(message){
        console.log("MENSAJE RECIBIDO= "+message);
        message=JSON.parse(message);
        message=Common.Elements.Message.fromJSON(message);     
        if (message.getId()<0){ //Si el ID es menor que cero entonces son respuestas.
            this.processResponse(message);
        }else {  //Si no son peticiones.          
            this.processRequest(message);             
        }  
    }    
    
    processRequest(){
    	throw new Error("Abstract Method.");
    }
    processResponse(){
    	throw new Error("Abstract Method.");
    }     
    processError(message){
        console.log("Transmission Errror received from: "+message.getSourceId());
        console.log("ERRROR: "+message.getError().message);
        console.log("ERRROR STACK: "+message.getError().stack);        
    }    

}

module.exports = WebSocketDefault;