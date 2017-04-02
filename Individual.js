"use strict"; 

class Individual  {	
    constructor() {
        this.chromosome=null;
        this.fitness = 0;        
    }
    static fromJSON(i) {
    //	console.log("Individual.fromJSON")
        var indiv=new Common.Elements.Individual();
    //    console.log("i="+JSON.stringify(i))
        indiv.chromosome=Common.Elements.Chromosome.fromJSON(i.chromosome);
        indiv.fitness=i.fitness;
        return indiv;
    }       
//    toJSON : function(){
//        return JSON.stringify(this);
//    },  
    initialize(size){
        this.chromosome=new Common.Elements.Chromosome();
        this.chromosome.initialize(size);        
    }
    setChromosome(chro){
        this.chromosome=chro;
    }
    getChromosome(){
        return this.chromosome;
    }
    getFitness(){
        return this.fitness;
    }
    setFitness(f){
        this.fitness=f;        
    }
    toString(){
        return JSON.stringify(this);        
    }
    clone(){
        var copy = new Individual();
        copy.chromosome=this.chromosome.clone();
        copy.fitness=this.fitness;
        return copy;        
    }
}

module.exports = Individual;

