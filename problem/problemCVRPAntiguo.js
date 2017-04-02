'use strict';


////Ciudades/Clientes -> 0,1,2 ... n
//Matriz de costes (incluye también al almacén)
//De 0 a 0 = x distancia
//De 0 a 1 = y distancia .....

//customersArray no incluye almacén



class ProblemCVRP{
    constructor() {}    
    static fromJSON(p){
        var problem = new Common.Elements.ProblemCVRP();
        problem.matrixCost=p.matrixCost;
        problem.customersArray=p.customersArray;
        for (var i=0;i<problem.customersArray.length;i++){
            problem.customersArray[i]=Common.Elements.Customer.fromJSON(problem.customersArray[i]);
        }
        problem.truckCapacity=p.truckCapacity;
        problem.truckTime=p.truckTime;
        problem.penalCap=p.penalCap;
        problem.penalTime=p.penalTime;
        problem.targetFitness=p.targetFitness;
        problem.tfKnown=p.tfKnown;
        problem.fitnessCounter=p.fitnessCounter
        return problem;        
    }
    initialize(matrixCost,customersArray, truckCapacity, truckTime, penalCap, penalTime){
        this.matrixCost=matrixCost;
        this.customersArray = customersArray;
        this.truckCapacity = truckCapacity;
        this.truckTime=truckTime;
        this.penalCap=penalCap;
        this.penalTime=penalTime;
   
	this.targetFitness = -999999.9;
	this.tfKnown = false;
	this.fitnessCounter = 0;        
    }
    evaluateStep(indiv){

	this.fitnessCounter++;
        return this.evaluate2(indiv);
      
    }
    
    evaluate2(indiv){

                    var origin = 0; //Almacén
                    var destiny=-999;

                    var customer=null;
                    var travelTime=null;
                    var deliveryTime=null;
                    var totalTimeRoute=0;
                    var deliveryItems=0;

                    var routeTimesArray = [];
                    var penalCapArray = [];
                    var penalTimeArray = [];

                    var end = findFirstSeparator(this,indiv); //Posición último alelle
                    var next=getNextAllele(indiv,end);   //Posición siguiente allele (cliente o separador)

                    var posCustomer=null;

                    var problem = this;



                    function processCustomer(){

                            posCustomer=indiv.getChromosome().getAllele(next);

                            customer = problem.customersArray[posCustomer];   //Valor del alelo es la posición del cliente en el array.
                            if(!customer){
                                console.log("ERRROR debería haber un cliente");
                                console.log("next="+next);
                                console.log("indiv.getChromosome().length="+indiv.getChromosome().getSize())
                                console.log("posCustomer="+posCustomer);
                                console.log("problem.customersArray="+JSON.stringify(problem.customersArray))
                                throw "ERRROR customer es undefined linea 90 de ProblemCVRP"
                            }
                            destiny = posCustomer+1;  //Sumamos 1 al valor del alelo para obtener el destino.

                //            //Destino no se puede pasar de la matriz porque ya hemos comprobado que esté dentro del array y la matriz siempre tiene 1 valor más. Así que no es necesaria esa comprobación.

                            travelTime=problem.matrixCost[origin][destiny];



                            deliveryTime=customer.getDeliveryTime();         

                            totalTimeRoute+=travelTime+deliveryTime;

                            deliveryItems += customer.getDeliveryItems();

                            origin=destiny;    
                            next=getNextAllele(indiv,next);           
                    }

                    function processSeparator(){
                            //CALCULAR COSTE DESDE ORIGEN HASTA ALMACÉN (fin de ruta)
                            if (origin!=0){ //Si el origen no era el almacén -> Calculamos coste de regreso al almacén.

                                deliveryTime=0;      
                                travelTime=problem.matrixCost[origin][0];
                                totalTimeRoute+=travelTime;                
                            }



                            routeTimesArray.push(totalTimeRoute); 
                            if (totalTimeRoute>problem.truckTime){

                                penalTimeArray.push((totalTimeRoute-problem.truckTime)*problem.penalTime);
                            } else {

                                penalTimeArray.push(0);                
                            }
                            if (deliveryItems>problem.truckCapacity){

                                penalCapArray.push((deliveryItems-problem.truckCapacity)*problem.penalCap);  
                            } else {

                                penalCapArray.push(0);  
                            }
                            totalTimeRoute=0;
                            deliveryItems=0;          
                            origin=0;                          
                            next=getNextAllele(indiv,next);  
    
                    }    

                    while (next!=end){ //Hasta que no demos la vuelta al array seguimos
                        if (!isSeparator(this,indiv,indiv.getChromosome().getAllele(next))){ //SI NO ES SEPARADOR -> Cliente
 
                            processCustomer();
         


                        } else { //ES SEPARADOR -> FIN DE RUTA
 
                            processSeparator();
         
                        }     
                    }

                    processSeparator();

                    var fitness = 0;       
                    for (var k=0;k<routeTimesArray.length;k++){
                        fitness+=routeTimesArray[k];
                        fitness+=penalCapArray[k];
                        fitness+=penalTimeArray[k];
                    }
                    fitness*=-1;

                    indiv.setFitness(fitness);
     
    }
    
}




function isSeparator(problem,indiv,indexCustomer){

        if (indexCustomer>=problem.customersArray.length){
            return true;
        }    else {
            return false;
        }
}


function findFirstSeparator(problem,indiv){   
    for (var i=0;i<indiv.getChromosome().getSize();i++){
   
        if (isSeparator(problem,indiv,indiv.getChromosome().getAllele(i))){

            return i;
        }
    }
}

function getNextAllele(indiv,actual){ //POSICIÓN DEL ARRAY DE ALLELES (incluye separadores)
    actual++;
    if (actual>=indiv.getChromosome().getSize()){
        actual=0;
    }
    return actual;
}






module.exports = ProblemCVRP;