var fs = require('fs');
global.Common = require("./common/Common");

Common.setAlgorithm(Common.Constants.AlgorithmTypes.CVRP);


var solomon={"elementos":[
{"id":0,"posx":    0,"posy":    0,"items":     0  } ,
{"id":    1,"posx":       -4,"posy":            106,"items":             13}   ,
{"id":    2,"posx":      -11,"posy":            106,"items":            122}   ,
{"id":    3,"posx":      -12,"posy":            115,"items":             30}   ,
{"id":    4,"posx":        4,"posy":            123,"items":              3}   ,
{"id":    5,"posx":        7,"posy":            113,"items":              5}   ,
{"id":    6,"posx":      -13,"posy":            125,"items":            422}   ,
{"id":    7,"posx":      -11,"posy":            105,"items":             13}   ,
{"id":    8,"posx":        8,"posy":            107,"items":             22}   ,
{"id":    9,"posx":        6,"posy":            111,"items":            173}   ,
{"id":   10,"posx":        0,"posy":            125,"items":             41}   ,
{"id":   11,"posx":        8,"posy":            118,"items":              8}   ,
{"id":   12,"posx":        4,"posy":            114,"items":              8}   ,
{"id":   13,"posx":        0,"posy":            113,"items":            110}   ,
{"id":   14,"posx":       -5,"posy":            109,"items":            198}   ,
{"id":   15,"posx":      -11,"posy":            112,"items":            384}   ,
{"id":   16,"posx":        6,"posy":            106,"items":            193}   ,
{"id":   17,"posx":      -11,"posy":            123,"items":            238}   ,
{"id":   18,"posx":       -6,"posy":            126,"items":            265}   ,
{"id":   19,"posx":       26,"posy":            -33,"items":              3}   ,
{"id":   20,"posx":       34,"posy":            -38,"items":            469}   ,
{"id":   21,"posx":       26,"posy":            -44,"items":              7}   ,
{"id":   22,"posx":       28,"posy":            -36,"items":              6}   ,
{"id":   23,"posx":       30,"posy":            -39,"items":            108}   ,
{"id":   24,"posx":       44,"posy":            -31,"items":             10}   ,
{"id":   25,"posx":       43,"posy":            -27,"items":             40}   ,
{"id":   26,"posx":       45,"posy":            -22,"items":            635}   ,
{"id":   27,"posx":       37,"posy":            -44,"items":             49}   ,
{"id":   28,"posx":       32,"posy":            -23,"items":            149}   ,
{"id":   29,"posx":       35,"posy":            -41,"items":            403}   ,
{"id":   30,"posx":       48,"posy":            -27,"items":             42}   ,
{"id":   31,"posx":       41,"posy":            -35,"items":             70}   ,
{"id":   32,"posx":       45,"posy":            -41,"items":            201}   ,
{"id":   33,"posx":       43,"posy":            -36,"items":             66}   ,
{"id":   34,"posx":       34,"posy":            -38,"items":            526}   ,
{"id":   35,"posx":       43,"posy":            -23,"items":              6}   ,
{"id":   36,"posx":       32,"posy":            -41,"items":            279}   ,
{"id":   37,"posx":       33,"posy":            -24,"items":            160}   ,
{"id":   38,"posx":       48,"posy":            -26,"items":              3}   ,
{"id":   39,"posx":      102,"posy":             85,"items":              4}   ,
{"id":   40,"posx":       90,"posy":             69,"items":            105}   ,
{"id":   41,"posx":       95,"posy":             88,"items":             46}   ,
{"id":   42,"posx":       79,"posy":             74,"items":            474}   ,
{"id":   43,"posx":       77,"posy":             89,"items":              7}   ,
{"id":   44,"posx":       99,"posy":             81,"items":              7}   ,
{"id":   45,"posx":       99,"posy":             80,"items":             99}   ,
{"id":   46,"posx":       81,"posy":             84,"items":            126}   ,
{"id":   47,"posx":       77,"posy":             69,"items":            119}   ,
{"id":   48,"posx":       86,"posy":             85,"items":             46}   ,
{"id":   49,"posx":       82,"posy":             89,"items":            273}   ,
{"id":   50,"posx":       86,"posy":             86,"items":             91}   ,
{"id":   51,"posx":       84,"posy":             87,"items":            294}   ,
{"id":   52,"posx":       23,"posy":             14,"items":              4}   ,
{"id":   53,"posx":       13,"posy":              4,"items":             81}   ,
{"id":   54,"posx":       13,"posy":              7,"items":            285}   ,
{"id":   55,"posx":       16,"posy":              2,"items":             90}   ,
{"id":   56,"posx":       17,"posy":             -1,"items":            462}   ,
{"id":   57,"posx":       16,"posy":              3,"items":             65}   ,
{"id":   58,"posx":       13,"posy":             10,"items":              6}   ,
{"id":   59,"posx":       23,"posy":             11,"items":              4}   ,
{"id":   60,"posx":       15,"posy":              5,"items":            529}   ,
{"id":   61,"posx":       17,"posy":             -1,"items":            165}   ,
{"id":   62,"posx":       11,"posy":              0,"items":              4}   ,
{"id":   63,"posx":       19,"posy":              1,"items":            394}   ,
{"id":   64,"posx":       14,"posy":              3,"items":              3}   ,
{"id":   65,"posx":       18,"posy":             -3,"items":             60}   ,
{"id":   66,"posx":      118,"posy":              8,"items":            899}   ,
{"id":   67,"posx":       99,"posy":             21,"items":            169}   ,
{"id":   68,"posx":      106,"posy":             -5,"items":             10}   ,
{"id":   69,"posx":      124,"posy":              8,"items":             47}   ,
{"id":   70,"posx":      104,"posy":              3,"items":             37}   ,
{"id":   71,"posx":      126,"posy":              4,"items":             23}   ,
{"id":   72,"posx":      115,"posy":              7,"items":             25}   ,
{"id":   73,"posx":      110,"posy":             -3,"items":            444}   ,
{"id":   74,"posx":       98,"posy":             -6,"items":              3}   ,
{"id":   75,"posx":      111,"posy":             13,"items":             99}   ,
{"id":   76,"posx":      -67,"posy":             90,"items":             58}   ,
{"id":   77,"posx":      -56,"posy":             96,"items":              7}   ,
{"id":   78,"posx":      -56,"posy":             97,"items":             11}   ,
{"id":   79,"posx":      -57,"posy":            100,"items":             15}   ,
{"id":   80,"posx":      -54,"posy":            101,"items":            381}   ,
{"id":   81,"posx":      -50,"posy":             96,"items":              7}   ,
{"id":   82,"posx":      -64,"posy":            103,"items":             39}   ,
{"id":   83,"posx":      -63,"posy":            103,"items":            502}   ,
{"id":   84,"posx":      -57,"posy":            100,"items":            115}   ,
{"id":   85,"posx":      -53,"posy":            106,"items":             85}   ,
{"id":   86,"posx":      -57,"posy":             96,"items":              3}   ,
{"id":   87,"posx":      -67,"posy":             97,"items":            136}   ,
{"id":   88,"posx":      -61,"posy":             98,"items":            111}   ,
{"id":   89,"posx":      -66,"posy":             95,"items":             66}   ,
{"id":   90,"posx":      -51,"posy":            104,"items":             50}   ,
{"id":   91,"posx":      -62,"posy":             95,"items":            252}   ,
{"id":   92,"posx":      -67,"posy":            106,"items":              4}   ,
{"id":   93,"posx":      -51,"posy":            102,"items":            119}   ,
{"id":   94,"posx":      -86,"posy":             87,"items":            746}   ,
{"id":   95,"posx":      -82,"posy":             78,"items":              6}   ,
{"id":   96,"posx":      -92,"posy":             86,"items":             51}   ,
{"id":   97,"posx":      -86,"posy":             78,"items":            322}   ,
{"id":   98,"posx":        6,"posy":             67,"items":           1023}   ,
{"id":   99,"posx":       13,"posy":             59,"items":              5}   ,
{"id":  100,"posx":       21,"posy":             66,"items":             10}   ,
{"id":  101,"posx":        8,"posy":             59,"items":            153}   ,
{"id":  102,"posx":       20,"posy":             70,"items":             29}   ,
{"id":  103,"posx":        1,"posy":             62,"items":             13}   ,
{"id":  104,"posx":       19,"posy":             57,"items":              3}   ,
{"id":  105,"posx":       15,"posy":             70,"items":              4}   ,
{"id":  106,"posx":       20,"posy":             55,"items":             70}   ,
{"id":  107,"posx":        8,"posy":             51,"items":              9}   ,
{"id":  108,"posx":        3,"posy":             54,"items":            147}   ,
{"id":  109,"posx":       18,"posy":             68,"items":              3}   ,
{"id":  110,"posx":       12,"posy":             53,"items":             10}   ,
{"id":  111,"posx":        3,"posy":             65,"items":              4}   ,
{"id":  112,"posx":        4,"posy":             62,"items":            439}   ,
{"id":  113,"posx":       19,"posy":             52,"items":             14}   ,
{"id":  114,"posx":       92,"posy":            -28,"items":            729}   ,
{"id":  115,"posx":       92,"posy":            -26,"items":             29}   ,
{"id":  116,"posx":       80,"posy":            -28,"items":              3}   ,
{"id":  117,"posx":       91,"posy":            -18,"items":             98}   ,
{"id":  118,"posx":       93,"posy":            -24,"items":            113}   ,
{"id":  119,"posx":       76,"posy":            -15,"items":            122}   ,
{"id":  120,"posx":       88,"posy":            -33,"items":             11}   ,
{"id":  121,"posx":       83,"posy":            -28,"items":             90}   ,
{"id":  122,"posx":       86,"posy":            -23,"items":            789}   ,
{"id":  123,"posx":       92,"posy":            -20,"items":              6}   ,
{"id":  124,"posx":       82,"posy":            -29,"items":            179}   ,
{"id":  125,"posx":       88,"posy":            -29,"items":              3}   ,
{"id":  126,"posx":       82,"posy":            -27,"items":              3}   ,
{"id":  127,"posx":       88,"posy":            -13,"items":             21}   ,
{"id":  128,"posx":       83,"posy":            -29,"items":            869}   ,
{"id":  129,"posx":       90,"posy":            -17,"items":            246}   ,
{"id":  130,"posx":       49,"posy":             -4,"items":             10}   ,
{"id":  131,"posx":       58,"posy":             -6,"items":             36}   ,
{"id":  132,"posx":       64,"posy":             -7,"items":             14}   ,
{"id":  133,"posx":       54,"posy":            -15,"items":            134}   ,
{"id":  134,"posx":       66,"posy":             -3,"items":            175}   ,
{"id":  135,"posx":       65,"posy":            -13,"items":             32}   ,
{"id":  136,"posx":       57,"posy":            -20,"items":             20}   ,
{"id":  137,"posx":       38,"posy":             -2,"items":            212}   ,
{"id":  138,"posx":      -44,"posy":             88,"items":             45}   ,
{"id":  139,"posx":      -36,"posy":            100,"items":            173}   ,
{"id":  140,"posx":      -37,"posy":             98,"items":            240}   ,
{"id":  141,"posx":      -39,"posy":            110,"items":             16}   ,
{"id":  142,"posx":      -34,"posy":            111,"items":             27}   ,
{"id":  143,"posx":      -47,"posy":            111,"items":             61}   ,
{"id":  144,"posx":      -28,"posy":            105,"items":            203}   ,
{"id":  145,"posx":      -38,"posy":             98,"items":              5}   ,
{"id":  146,"posx":      -32,"posy":             91,"items":            369}   ,
{"id":  147,"posx":      -25,"posy":             97,"items":             81}   ,
{"id":  148,"posx":      -46,"posy":            111,"items":            128}   ,
{"id":  149,"posx":      -36,"posy":            107,"items":            406}   ,
{"id":  150,"posx":      -35,"posy":             92,"items":             32}  
]};


var totalElements=150;
var matrixSize=totalElements+1;

var matrixCost=[];

for (var i=0;i<matrixSize;i++){
  var fila=[];
    for (var k=0;k<matrixSize;k++){
    fila.push(calculateDistance(solomon.elementos[i],solomon.elementos[k]));
  }
  matrixCost.push(fila);
}





var maxSteps=50;
var popSize1 = 50;
var popSize2 = 100;
var popSize3 = 150;

var nTrucks = 15;
var truckCapacity=1544;
var truckTime = 999999;
var penalCap = 1000;
var penalTime = 1000;

var probCross= 0.8;
var probMut = 0.01;
var probLS = 0.1;




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
}

