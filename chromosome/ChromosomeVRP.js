"use strict"

var ChromosomeAbstract =require ('./ChromosomeAbstract')

var myClass="ChromosomeVRP";
var outputPriority=100;


class ChromosomeVRP  extends ChromosomeAbstract{	

    constructor() {
    	super();
    }
    static fromJSON(c) {     
        var chromosomeFixed=new Common.Elements.Chromosome();    
        for (var i=0;i<c.alleles.length;i++){
            chromosomeFixed.alleles.push(c.alleles[i]);
        }    
        return chromosomeFixed;
        
    }     
    clone() {
    	var copy = new ChromosomeVRP();
      	copy.alleles=this.alleles.slice(0);        //CLONE
      	return copy
    }      
    
    initialize(size) {      
    	for (var i=0;i<size;i++){
    		this.alleles.push(i);      
    	}
    	Common.Arrays.shuffleArray(this.alleles);
    }     
    cross(chro2,probCross) {      
        ////////////////////////////////////////
        //Operador de recombinación de ejes(ERX)
         //////////////////////////////////////// 
        if (Math.random()<probCross){
            var axisList = [];
            for (var i=0;i<this.getSize();i++){
                var axis = new Common.Elements.Set();
                getNeighbors(this,i,axis);       
                getNeighbors(chro2,i,axis);    
                axisList.push(axis);
            }

            //Cogemos el primer gen de uno de los padres(el que tenga menor número de ejes).
            var son = new ChromosomeVRP();
            var firstParent1 = this.getAllele(0);
            var firstParent2 = chro2.getAllele(0); 
            var lastAdded=-1;      
            if (axisList[firstParent1].size<=axisList[firstParent2].size){
                son.addAllele(firstParent1);
                Common.Arrays.removeValueFromArrayOfSETs(firstParent1, axisList);
                lastAdded=firstParent1;
            } else {
                son.addAllele(firstParent2);
                Common.Arrays.removeValueFromArrayOfSETs(firstParent2, axisList);
                lastAdded=firstParent2;        
            }
            
            //Luego se va al eje de la última posición añadida
            //Se recorre dicho eje y se cogen los valores para ver que posición tiene menos ejes.
            //
  
            abcdef(lastAdded, axisList, son);

            return son;
        } else {
            //Return chro1 o chro2 en caso de que no haya cruce.
           return Math.random()>=0.5?this.clone():chro2.clone();
        }
    }   
    mutate(probMut){
        for (var i=0; i<this.alleles.length;i++){
            if (Math.random()<probMut){
                var r = Math.random();
                if (r<0.33){
                    //Inversion Mutate (p,q,array)
                    Common.Arrays.reverseSubarray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                } else if (r>0.66){
                    //Insertion Mutate (p,q,array)
                    Common.Arrays.moveElementOfArray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                } else {
                    //SWAP Mutate (p,q,array)
                    Common.Arrays.swapElementsOfArray(i,Math.floor(Math.random()*this.alleles.length),this.alleles);
                }
            }             
        }         
        return this; 	
    }
    
    reverseSubGroup( index1, index2 ){
        //+1 porque slice no incluye última posición y yo la necesito.
        var subarray=this.alleles.slice(index1, index2+1);
        
        subarray.reverse();

        this.alleles=Common.Arrays.injectArrayRemoving(this.alleles,index1,subarray);
	
    }
    addAllele( value ){
        return this.alleles.push(value);    	
    }
    findAllelePos( value ){
        return this.alleles.indexOf(value);     	
    }
}

module.exports = ChromosomeVRP;



function abcdef(lastAdded, axisList, son){
    while (axisList[lastAdded].size>0){
        lastAdded=addSmaller(lastAdded,axisList);
        Common.Arrays.removeValueFromArrayOfSETs(lastAdded, axisList);
        son.addAllele(lastAdded); 
        abcdef(lastAdded, axisList, son);
    } 
        return;
 
}



function addSmaller(position,axisList){
    var valueBorrar=null
    var axis = axisList[position];
    var smaller=-1;
    try {
        axis.forEach(function(value) {   
            valueBorrar=value;
            if (smaller==-1){          
                smaller=value;
            } else if(axisList[value].size<axisList[smaller].size){            
                smaller=value;
            }
        });            
    } catch (e){

        console.log(e.stack);
        throw e;
    }    
 
    return smaller;
}

function getNeighbors(chro, value, axis){
    for (var i=0;i<chro.getSize();i++){
        if (chro.getAllele(i)==value){
            axis.add(getNext(chro,i)); 
            axis.add(getPrevious(chro,i));             
           return;
        }
    }
}

function getNext(chro, i){
    if ((i+1)>=chro.getSize()){
        return  chro.getAllele(0);
    } else {
        return  chro.getAllele(i+1);
    }
}
function getPrevious(chro,i){
    if ((i-1)<0){
        return  chro.getAllele(chro.getSize()-1);
    } else {
        return  chro.getAllele(i-1);
    }
}

