var routes=[[0,1,7,21,40,0],[0,10,63,11,24,6,23,0],[0,13,74,60,39,3,77,51,0],[0,17,31,27,59,5,44,12,62,0],[0,29,20,75,57,19,26,35,65,69,56,47,15,33,64,0],[0,30,78,61,16,43,68,8,37,2,34,0],[0,38,72,54,9,55,41,25,46,0],[0,42,53,66,67,36,73,49,0],[0,52,28,79,18,48,14,71,0],[0,58,32,4,22,45,50,76,70,0]];


var coor=[[0,0],[92,92],[88,58],[70,6],[57,59],[0,98],[61,38],[65,22],[91,52],[59,2],[3,54],[95,38],[80,28],[66,42],[79,74],[99,25],[20,43],[40,3],[50,42],[97,0],[21,19],[36,21],[100,61],[11,85],[69,35],[69,22],[29,35],[14,9],[50,33],[89,17],[57,44],[60,25],[48,42],[17,93],[21,50],[77,18],[2,4],[63,83],[68,6],[41,95],[48,54],[98,73],[26,38],[69,76],[40,1],[65,41],[14,86],[32,39],[14,24],[96,5],[82,98],[23,85],[63,69],[87,19],[56,75],[15,63],[10,45],[7,30],[31,11],[36,93],[50,31],[49,52],[39,10],[76,40],[83,34],[33,51],[0,15],[52,82],[52,82],[46,6],[3,26],[46,80],[94,30],[26,76],[75,92],[57,51],[34,21],[28,80],[59,66],[51,16],[87,11]];



var distancia=0;
var arrayDistancias=[];
for (var i=0;i<routes.length-1;i++){
	var localDistancia=calculateDistanceArray(routes[i]);
  distancia+=localDistancia;
  arrayDistancias.push(localDistancia);
}


document.getElementById('hola').value += JSON.stringify(distancia);
document.getElementById('hola').value += JSON.stringify(arrayDistancias);


function calculateDistanceArray(array){
	
  var total=0;
	for (var i=0;i<array.length-1;i++){
  	total+=calculateDistance(array[i],array[i+1])
  }
  return total;
}




function calculateDistance(p1,p2){
    var distX=Math.pow( coor[p1][0]-coor[p2][0],2);   
    var distY=Math.pow( coor[p1][1]-coor[p2][1],2);
    var sol = Math.pow( distX+distY,0.5 )
    document.getElementById('hola').value += "Desde "+p1+" hasta "+p2+" = "+sol+"\n"
    //document.getElementById('hola').value += sol;
    return sol;
}