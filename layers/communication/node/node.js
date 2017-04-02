'use strict';
class Node{
    constructor(id) {
        this.id=id;
        this.messagesWaitingResponse=[];
        this.nextMessageId=1; //No se usa el cero porque entonces no se identifica la respuesta negativa.
        this.connected=false;        
    }
    getId(){
        return this.id;        
    }
    setConnected(connected){
        this.connected=connected;        
    }
    addMessageWaitingResponse(message){
        this.messagesWaitingResponse.push(message);        
    }
    removeMessageWaitingResponse(idMessage){
        for (var i=0;i<this.messagesWaitingResponse.length;i++){
            if (this.messagesWaitingResponse[i].getId()==idMessage){
                var index = i;
            } 
        }
        this.messagesWaitingResponse.splice( index, 1 );        
    }
    clearMessagesWaitingResponse(){
    	this.messagesWaitingResponse=[];        
    }
    isAnyMessageWaitingResponse(){
        if (!this.connected || this.messagesWaitingResponse.length>0){
            return true;
        } else {
            return false;
        }        
    }
    getNextMessageId(){
        var messageId =this.nextMessageId;
        this.nextMessageId++;
        return messageId;
        //return this.nextMessageId++;        
    }
}


module.exports = Node;