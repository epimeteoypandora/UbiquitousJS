function getSimulatedDistanceMatrix(){    
    var addresses=[];
    for (var i=0;i<markers.length;i++){
            addresses.push(markers[i].getPosition());
    }
    var distanceMatrix=simulateDistanceMatrix(addresses,addresses);
    $('textarea#textarea_console').text("Distance Matrix\n"+JSON.stringify(distanceMatrix));
    startAlgorithm(distanceMatrix);   
}

function simulateDistanceMatrix(origins, destinations){ 
	var total=[];
	for (var i=0;i<origins.length;i++){
		var row=[];
		for (var k=0;k<destinations.length;k++){
			var distance=getDistanceBetweenTwoPoints(origins[i],destinations[k]);
			row.push(distance);
		}
		total.push(row);
	}  
        return total;
}


function getDistanceBetweenTwoPoints(p1, p2) {    
	var radlat1 = Math.PI * p1.lat()/180
	var radlat2 = Math.PI * p2.lat()/180
	var theta = p1.lng()-p2.lng();
	var radtheta = Math.PI * theta/180
	var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
	dist = Math.acos(dist);
	dist = dist * 180/Math.PI;
	dist = dist * 60 * 1.1515;
	dist = dist * 1.609344; //KM
	dist=dist/100; //HOURS
	dist=dist.toFixed(3);
	return parseFloat(dist);
}		
                
                
  function googleDistanceMatrixError(){
        alert("Google was unable to calculate distances! Distance Matrix will be simulated. Results will not be realistic.")
        simulatedSolution=true;
        getSimulatedDistanceMatrix();      
  }             
                
                
                function getDistanceMatrix(){
			var addresses=[];
			for (var i=0;i<markers.length;i++){
				addresses.push(markers[i].getPosition());
			}
			distanceMatrixService.getDistanceMatrix(
			  {
				origins: addresses,
				destinations: addresses,
				travelMode: google.maps.TravelMode.DRIVING,
			//	transitOptions: TransitOptions,
		//		drivingOptions: DrivingOptions,
			//	unitSystem: UnitSystem,
			//	avoidHighways: Boolean,
			//	avoidTolls: Boolean,
			 // }, callback);	
			   }, function(response,status){
					try {
						//alert(response);
						//$('#textarea_console').val("hola que pasa");
						if (status !== google.maps.DistanceMatrixStatus.OK) {
						  alert('Error was: ' + status);
                                                  googleDistanceMatrixError()
						} else {
							var distanceMatrix=[];
								for (var i = 0; i < response.rows.length; i++) {
									var row=[]
									var results = response.rows[i].elements;
									for (var j = 0; j < results.length; j++) {
                                                                                var val=parseInt(results[j].duration.value)/3600;
                                                                                val=val.toFixed(3); 
                                                                                val=parseFloat(val);
										row.push(val);
									}
									distanceMatrix.push(row);
								}
								//alert(distanceMatrix)
							$('textarea#textarea_console').text("Distance Matrix\n"+JSON.stringify(distanceMatrix));
							//$.mobile.pageContainer.pagecontainer("change", "#console_page", null);
							startAlgorithm(distanceMatrix);
							//$.mobile.pageContainer.pagecontainer("change", "#console_page", { options });
							
						}					
						
					} catch(e){
					//-->>	//alert("Las distancias son demasiado largas o no son válidas. Pruebe con unas distancias más cortas.");
						
                                               // $('textarea#textarea_console').text(JSON.stringify(response));
                                                $('textarea#textarea_console').text(e.stack);
                                                googleDistanceMatrixError()
					}	
			   });  			
			
			
		
		}
	