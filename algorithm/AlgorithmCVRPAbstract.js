"use strict"; 
var AlgorithmAbstract =require ('./AlgorithmAbstract');

class AlgorithmCVRPAbstract  extends AlgorithmAbstract{	

    constructor(problem, probCross, probMut, probLS, maxSteps) {
    	super(problem, probCross, probMut, maxSteps);	
        this.probLS=probLS;          	
    }	
	
    localSearch(probLS,indiv,pop,problem){
        var bestSol = indiv;
        
            if (indiv.getFitness()==0){
                console.log(JSON.stringify(bestSol))
                throw "ERROR el fitness no está definido al empezar"
            }       
        
        var tempSol=null
        for (var i=0; i<indiv.getChromosome().getSize();i++){
            if (Math.random()<probLS){
                tempSol= this.opt_2(indiv,i,problem);
            if (tempSol.getFitness()==0){
                throw "ERROR el fitness no está definido opt_2"
            }            
                if (tempSol.getFitness()>bestSol.getFitness()){
                    bestSol=tempSol;
                } 
            }
        }
        for (var i=0;i<pop.getSize();i++){
            for (var j=i+1;j<pop.getSize();j++){
                if (Math.random()<probLS){
                    tempSol=this.interchange_1(pop.getIndividual(i),pop.getIndividual(j),problem);
            if (tempSol.getFitness()==0){
                throw "ERROR el fitness no está definido interchange_1"
            }                  
                    if (tempSol.getFitness()>bestSol.getFitness()){
                        bestSol=tempSol;
                    }                 
                }          
            }
        }
        
            if (bestSol.getFitness()==0){
                console.log(JSON.stringify(bestSol))
                throw "ERROR el fitness no está definido "
            }    
        
        return bestSol;    	
    }
    
    
    
    
    
    interchange_1(indiv1, indiv2,problem){
        var copy1 = indiv1.clone();
        var copy2 = indiv2.clone();
       
        if (areRepeatedNumbers(copy1)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy1));
            throw ("REPEATED NUMBERS");
        }   
        if (areRepeatedNumbers(copy2)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy2));
            throw ("REPEATED NUMBERS");
        }     
        
        var pos1 = Math.floor(Math.random()*copy1.getChromosome().getSize());
        var pos2 = Math.floor(Math.random()*copy2.getChromosome().getSize());

        var allele1 = copy1.getChromosome().getAllele(pos1);
   
        var allele2 = copy2.getChromosome().getAllele(pos2);
   
        
        
        
        //Copiamos alelo 1 en individuo 2
        var tempPos = copy2.getChromosome().findAllelePos(allele1);

        copy2.getChromosome().setAllele(pos2,allele1);

        copy2.getChromosome().setAllele(tempPos,allele2); //Copiamos el sustituido por la posición donde estaba el que se ha copiado en ese mismo cromosoma.

         
        //Copiamos alelo 2 en individuo 1
        tempPos = copy1.getChromosome().findAllelePos(allele2);

        copy1.getChromosome().setAllele(pos1,allele2);

        copy1.getChromosome().setAllele(tempPos,allele1);


        problem.evaluateStep(copy1);
  
        problem.evaluateStep(copy2);


        if (areRepeatedNumbers(copy1)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy1));
            throw ("REPEATED NUMBERS");
        }   
        if (areRepeatedNumbers(copy2)){
            console.log("REPEATED NUMBERS "+JSON.stringify(copy2));
            throw ("REPEATED NUMBERS");
        }  
        
        
        if (copy1.getFitness()>=copy2.getFitness()){
            return copy1;
        } else {     
            return copy2;
        }    		
    }
    
    
    opt_2(indiv,eje1_1,problem){
        var copy=indiv.clone();
      if (areRepeatedNumbers(copy)){
          console.log("REPEATED NUMBERS "+JSON.stringify(copy));
          throw ("REPEATED NUMBERS");
      }    

      var eje2_1 = Math.floor(Math.random()*copy.getChromosome().getSize());
      
      //Se ordena de menor a mayor los ejes.
      if (eje1_1>eje2_1){
          var temp = eje1_1;
          eje1_1=eje2_1;
          eje2_1=temp;
      }
      
      var eje1_2 = eje1_1+1;
      if (eje1_2>=copy.getChromosome().getSize())eje1_2=0; 
      
      var eje2_2 = eje2_1+1;
      if (eje2_2>=copy.getChromosome().getSize()) eje2_2=0;   

      copy.getChromosome().reverseSubGroup(eje1_2, eje2_1); 
      
      problem.evaluateStep(copy);
 
      if (areRepeatedNumbers(copy)){
          console.log("REPEATED NUMBERS "+JSON.stringify(copy));
          throw ("REPEATED NUMBERS");
      }
      return  copy;    	
    }
        
    
}


function areRepeatedNumbers(indiv){
    var allelesSearch = indiv.getChromosome().alleles;
    var alleles=allelesSearch.slice(0);
    var repeats =0;
    var index;
    for (var i=0;i<allelesSearch.length;i++){
        repeats=0;
        index=alleles.indexOf(i);
       
        while (index>-1){
            repeats++;
            alleles.splice(index,1);

            if (repeats>1){
                return true;
            }
            index=alleles.indexOf(i);
        }
    }
}



module.exports = AlgorithmCVRPAbstract;