"use strict"; 
class Chromosome  {	
    constructor() {
        this.alleles = [];
    }
    getAllele(index) {
        return this.alleles[index];
    }     
    setAllele(index, value) {
        this.alleles[index]=value;
    }         
    getSize() {
        return this.alleles.length; 
    }   
    toString(){
    	return JSON.stringify(this);
    }
    initialize(size) {
    	throw new Error("Abstract Method.");
    }     
    cross(chro2,probCross) {
            throw new Error("Abstract Method.");
    }   
    mutate(probMut){
            throw new Error("Abstract Method.");    	
    }  
    clone() {

//    	var copy = Object.create(this); //-> MUY POCO EFICIENTE ASÍ QUE MEJOR UTILIZAR new
//    	copy.alleles=this.alleles.slice(0);       
//    	return copy
		throw new Error("Abstract Method.");  
  }  	
    
}

module.exports = Chromosome;