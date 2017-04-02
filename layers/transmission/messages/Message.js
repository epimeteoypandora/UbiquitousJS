"use strict"; 

class Message{
    constructor(type, id, sourceId,destinyId,error, data, timeSent){ //TODO -> Patrón de Diseño State para poner comportamiento especifico de cada algoritmo
        this.type=type;
        this.id=id; //ID del mensaje
        this.sourceId=sourceId; //ID del Nodo origen del mensaje
        this.destinyId=destinyId; //ID del Nodo destino del mensaje
        this.error=error;
        this.data=data;
        this.timeSent=timeSent;//new Date().getTime();            
    }
    static fromJSON(m){
    //    console.log("Message.fromJSON = function(m){")
    //    console.log(JSON.stringify(m))
        var message = new Message(m.type, m.id, m.sourceId,m.destinyId,m.error, m.data, m.timeSent);
        return message;        
    }
    getType(){
        return this.type;        
    }
    getId(){
        return this.id;        
    }
    setId(id){
        this.id=id;        
    }
    getSourceId(){
        return this.sourceId;        
    }
    setSourceId(sourceId){
        this.sourceId=sourceId;        
    }
    getDestinyId(){
        return this.destinyId;        
    }
    setDestinyId(destinyId){
        this.destinyId=destinyId;        
    }
    getError(){
        return this.error;        
    }
    getData(){
        return this.data;        
    }
    getTimeSent(){
        return this.timeSent;        
    }
}



module.exports = Message;