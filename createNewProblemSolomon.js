var fs = require('fs');
global.Common = require("./common/Common");

Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);


var solomon={"elementos":[{"id":0,"posx":30,"posy":40,"items":0},{"id":1,"posx":37,"posy":52,"items":7},{"id":2,"posx":49,"posy":49,"items":30},{"id":3,"posx":52,"posy":64,"items":16},{"id":4,"posx":20,"posy":26,"items":9},{"id":5,"posx":40,"posy":30,"items":21},{"id":6,"posx":21,"posy":47,"items":15},{"id":7,"posx":17,"posy":63,"items":19},{"id":8,"posx":31,"posy":62,"items":23},{"id":9,"posx":52,"posy":33,"items":11},{"id":10,"posx":51,"posy":21,"items":5},{"id":11,"posx":42,"posy":41,"items":19},{"id":12,"posx":31,"posy":32,"items":29},{"id":13,"posx":5,"posy":25,"items":23},{"id":14,"posx":12,"posy":42,"items":21},{"id":15,"posx":36,"posy":16,"items":10},{"id":16,"posx":52,"posy":41,"items":15},{"id":17,"posx":27,"posy":23,"items":3},{"id":18,"posx":17,"posy":33,"items":41},{"id":19,"posx":13,"posy":13,"items":9},{"id":20,"posx":57,"posy":58,"items":28},{"id":21,"posx":62,"posy":42,"items":8},{"id":22,"posx":42,"posy":57,"items":8},{"id":23,"posx":16,"posy":57,"items":16},{"id":24,"posx":8,"posy":52,"items":10},{"id":25,"posx":7,"posy":38,"items":28},{"id":26,"posx":27,"posy":68,"items":7},{"id":27,"posx":30,"posy":48,"items":15},{"id":28,"posx":43,"posy":67,"items":14},{"id":29,"posx":58,"posy":48,"items":6},{"id":30,"posx":58,"posy":27,"items":19},{"id":31,"posx":37,"posy":69,"items":11},{"id":32,"posx":38,"posy":46,"items":12},{"id":33,"posx":46,"posy":10,"items":23},{"id":34,"posx":61,"posy":33,"items":26},{"id":35,"posx":62,"posy":63,"items":17},{"id":36,"posx":63,"posy":69,"items":6},{"id":37,"posx":32,"posy":22,"items":9},{"id":38,"posx":45,"posy":35,"items":15},{"id":39,"posx":59,"posy":15,"items":14},{"id":40,"posx":5,"posy":6,"items":7},{"id":41,"posx":10,"posy":17,"items":27},{"id":42,"posx":21,"posy":10,"items":13},{"id":43,"posx":5,"posy":64,"items":11},{"id":44,"posx":30,"posy":15,"items":16},{"id":45,"posx":39,"posy":10,"items":10},{"id":46,"posx":32,"posy":39,"items":5},{"id":47,"posx":25,"posy":32,"items":25},{"id":48,"posx":25,"posy":55,"items":17},{"id":49,"posx":48,"posy":28,"items":18},{"id":50,"posx":56,"posy":37,"items":10}]};


var matrixCost=[];

var totalElements=solomon.elementos.length-1;


for (var i=0;i<(totalElements+1);i++){
  var fila=[];
    for (var k=0;k<(totalElements+1);k++){
    fila.push(calculateDistance(solomon.elementos[i],solomon.elementos[k]));
  }
  matrixCost.push(fila);
}



















var maxSteps=999999999;
var popSize1 = 50;
var popSize2 = 100;
var popSize3 = 150;

var nTrucks = 6;
var truckCapacity=160;
var truckTime = 150;
var penalCap = 1000;
var penalTime = 1000;

var probCross= 0.8;
var probMut = 0.01;
var probLS = 0.1;



var random1 = null;
var random2 = null;





var max=20;


var arrayCustomers = [];
for (var i=0;i<totalElements;i++){  
    arrayCustomers.push( new Common.Elements.Customer(solomon.elementos[i+1].items,0) );
}














var problemData={};
problemData["nTrucks"]=nTrucks;

problemData["crossProb"]=probCross;
problemData["mutateProb"]=probMut;
problemData["LSProb"]=probLS;

problemData["maxSteps"]=maxSteps;

saveProblemPopulation(popSize1,()=>{
    saveProblemPopulation(popSize2,()=>{
        saveProblemPopulation(popSize3,()=>{
            console.log("TODOS GUARDADOS")
        });
    });
});

function saveProblemPopulation(popSize,callback){
    var problem = new Common.Elements.Problem();
    problem.initialize(matrixCost, arrayCustomers, truckCapacity, truckTime, penalCap,penalTime);
    problem.targetFitness=0;    
    problemData["problem"]=problem;
    
    var algorithm = new Common.Elements.AlgorithmCVRP(problem, probCross,probMut,probLS, maxSteps);
    algorithm.initialize(popSize,arrayCustomers.length+nTrucks-1);    

    var population = algorithm.getPopulation()    
    problemData["population"]=population;
    fs.open("./dataProbSolomon_"+totalElements+"_"+population.getSize()+".txt", "wx", function (err, fd) {
        fs.writeFile("./dataProbSolomon_"+totalElements+"_"+population.getSize()+".txt",JSON.stringify(problemData), function(err) {
            if(err) {
                return console.log(err);
            }
            console.log("The file was saved!");
            callback();
        }); 
    }); 
}








function calculateDistanceArray(array){
   var total = 0;
   for (var i=0;i<array.length-1;i++){
       total+=calculateDistance(solomon.elementos[array[i]],solomon.elementos[array[i+1]])
   }
   return total;
}

function calculateDistance(p1,p2){
    var distX=Math.pow( p1.posx-p2.posx,2);
    var distY=Math.pow( p1.posy-p2.posy,2);
    var sol = Math.pow( distX+distY,0.5 )
    return sol;
    //return parseFloat(sol.toFixed(0))
}