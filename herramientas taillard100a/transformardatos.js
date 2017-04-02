
<textarea id="hola" rows="4" cols="50">

</textarea>


var ruta = "1 7 21 40                                          Z 10 63 11 24 6 23                                   Z 13 74 60 39 3 77 51                                Z 17 31 27 59 5 44 12 62                             Z 29 20 75 57 19 26 35 65 69 56 47 15 33 64          Z 30 78 61 16 43 68 8 37 2 34                        Z 38 72 54 9 55 41 25 46                             Z 42 53 66 67 36 73 49                               Z 52 28 79 18 48 14 71                               Z 58 32 4 22 45 50 76 70                              "


var rutas = ruta.split("Z");

for (var i =0;i<rutas.length;i++){
   rutas[i]= rutas[i].split(/\s+/);
   remove("",rutas[i])
  
   for (var k=0;k<rutas[i].length;k++){
   		rutas[i][k]=parseInt(rutas[i][k])    
   }
   rutas[i]=cleanArray(rutas[i])    
}

function remove(element,array){
	var index=array.indexOf(element);
  if (index > -1) {
    	array.splice(index, 1);
	}
}

function cleanArray(actual) {
  var newArray = new Array();
  for (var i = 0; i < actual.length; i++) {
    if (actual[i] || actual[i]===0) {
      newArray.push(actual[i]);
    }
  }
  return newArray;
}

document.getElementById('hola').value += JSON.stringify(rutas)