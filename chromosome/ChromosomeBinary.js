"use strict"; 
var ChromosomeAbstract =require ('./ChromosomeAbstract')

var myClass="ChromosomeBinary";
var outputPriority=100;

class ChromosomeBinary  extends ChromosomeAbstract{	
    constructor() {
    	super();
    }
    static fromJSON(c) {
        var chro=new ChromosomeBinary();
        chro.alleles=c.alleles;
        return chro;
    }      
    
    clone() {
    	var copy = new ChromosomeBinary();
    	copy.alleles=this.alleles.slice(0);        //CLONE
    	return copy
    }      
    initialize(size) {
        for (var i=0;i<size;i++){
            this.alleles.push(Math.floor(Math.random() * 2));  
        }
    }     
    cross(chro2,probCross) {
        if (Math.random()<probCross){    
            var myMethod="cross";
            Output.showInfo(outputPriority,myClass,myMethod,"CHRO1 -> "+JSON.stringify(this));
            Output.showInfo(outputPriority,myClass,myMethod,"CHRO2 -> "+JSON.stringify(chro2));                       
            var son = new ChromosomeBinary();       
            var crossPoint = Math.floor(Math.random()*this.alleles.length);
            Output.showInfo(outputPriority,myClass,myMethod,"CROSSPOINT -> "+crossPoint);              
            for (var i=0;i<crossPoint;i++){
                son.alleles.push(this.alleles[i]);
            }
            for (var i=crossPoint;i<this.alleles.length;i++){
                son.alleles.push(chro2.alleles[i]);
            }    
            Output.showInfo(outputPriority,myClass,myMethod,"SON -> "+JSON.stringify(son));                    
            return son;  
        } else {
                Output.showInfo(outputPriority,myClass,myMethod,"NO SE HACE CROSS");  
               return Math.random()>=0.5?this.clone():chro2.clone();
        }
    }   
    mutate(probMut){
        for (var i=0;i<this.alleles.length;i++){
            
            if (Math.random()<probMut){    
                if (this.alleles[i]==0){
                        this.alleles[i]=1;                      
                } else {
                        this.alleles[i]=0;
                }                
            }         
        }  	
    }
}

module.exports = ChromosomeBinary;