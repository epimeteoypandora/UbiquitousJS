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
        var problem = this;

        var routeItemsArray=[];
        var routeItems=0;
        var routeTime=0;
        var totalTime=0;
        var totalItems=0;        
        var routeFitness=0;
        var fitness=0;

        var posCustomer;
        var posCustomer2;
        var customer;

        var origin;
        var destiny; 





        var totalCustomers=problem.customersArray.length;

        function isSeparator(indexCustomer){

                if (indexCustomer>=totalCustomers){
                    return true;
                }    else {
                    return false;
                }
        }


        function startRoute(origin){ //Desde almacén hasta primer cliente
            routeTime+=problem.matrixCost[0][origin]; 
            isNewRoute=false;
        }

        function endRoute(){
            isNewRoute=true;
            totalTime+=routeTime; //TODO -> totalTime no sé está utilizando.
            totalItems+=routeItems;            

            routeItemsArray.push(routeItems);

            routeFitness=routeTime;
            if ((routeTime-problem.truckTime)>0){ //Si pasamos el límite de tiempo.
                routeFitness+=(routeTime-problem.truckTime)*problem.penalTime;
            }            

            if ((routeItems-problem.truckCapacity)>0){ //Si pasamos el límite de capacidad.
                routeFitness+=(routeItems-problem.truckCapacity)*problem.penalCap;
            }  


            indiv.routeTime=totalTime;
            indiv.totalItems=totalItems;
            indiv.routeItems=routeItems;
            indiv.routeItemsArray=routeItemsArray;            
            fitness+=routeFitness;


            routeTime=0;
            routeItems=0;
            routeFitness=0;
        }

        var isNewRoute=true;

        for (var i=0;i<indiv.getChromosome().getSize()-1;i++){
            posCustomer=indiv.getChromosome().getAllele(i);
            posCustomer2=indiv.getChromosome().getAllele(i+1);
            if (isSeparator(posCustomer)){ //¿es separador el origen?
                endRoute();
            } else if (isSeparator(posCustomer2)){//¿es separador el destino?
                //entonces vamos al almacén
                origin=posCustomer+1; //matrixCost
                 if (isNewRoute){
                    startRoute(origin);
                }
                routeTime+=problem.matrixCost[origin][0];  

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();  
                routeItems+=customer.getDeliveryItems();           
            } else{
                //entonces sumamos ese camino
                origin=posCustomer+1; //matrixCost
                if (isNewRoute){
                    startRoute(origin);
                }                
                destiny=posCustomer2+1; //matrixCost
                routeTime+=problem.matrixCost[origin][destiny]; 

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();  
                routeItems+=customer.getDeliveryItems();                                                 
            }
        }


            posCustomer=indiv.getChromosome().getAllele(indiv.getChromosome().getSize()-1);
            if (isSeparator(posCustomer)){ //¿es separador el origen?
                endRoute();
            } else{
                //entonces sumamos ese camino
                origin=posCustomer+1; //matrixCost
                routeTime+=problem.matrixCost[origin][0]; 

                customer = problem.customersArray[posCustomer]
                routeTime+=customer.getDeliveryTime();    
                routeItems+=customer.getDeliveryItems();                  

                endRoute();                          
            }

            //fitness=totalTime*(-1);
            fitness=fitness*(-1);

            indiv.setFitness(fitness);
    }

 }




module.exports = ProblemCVRP;