"use strict"

class Set {
    constructor(){
        this.values = [];
        this.size =0;
    }
    add(value){
        if (this.values.indexOf(value)==-1){
            this.values.push(value);
            this.size=this.values.length;
        }
    }
    forEach(callback){
        for (var i=0;i<this.values.length;i++){
            callback(this.values[i]);
        }
    }
    deleteValue(value){
        var pos = this.values.indexOf(value);
        if (pos!=-1){
            this.values.splice(pos,1);
            this.size=this.values.length;
        }
    }
    
    
    
}

module.exports = Set;