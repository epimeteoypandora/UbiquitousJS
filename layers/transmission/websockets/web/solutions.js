       function showSolutionOnMap(id){
           var lastMarkers=lastStart["markers"];
                map = createNewMap(lastMarkers[0].getPosition());
               
                
                

                 //deleteAllMarkersFromListAndMap(); //BORRAMOS TODO DEL MAPA
                var arraySolutions=JSON.parse($( '#'+id ).find( ".array_markers_value" ).html());     
                

                   
                   
                  var directionsService = new google.maps.DirectionsService;
                  var directionsDisplay = new google.maps.DirectionsRenderer;
                  
                  directionsDisplay.setMap(map);
                  
                  var waypts = [];
                  
                  
                  for (var i=0;i<arraySolutions.length;i++){
                      waypts.push({
                        location: lastMarkers[parseInt(arraySolutions[i])+1].getPosition(), //SE LE SUMA 1 PORQUE EL CERO ES EL ALMACÉN
                        stopover: true
                      });                         
                  }
                  

                  
                        directionsService.route({
                            origin: lastMarkers[0].getPosition(),
                            destination: lastMarkers[0].getPosition(),
                            waypoints: waypts,
                            optimizeWaypoints: false, //CREO QUE HAY QUE QUITARLO PARA QUE NO ME DESORDENE
                            travelMode: google.maps.TravelMode.DRIVING
                          }, function(response, status) {
                            if (status === google.maps.DirectionsStatus.OK) {
                              directionsDisplay.setDirections(response);
                              var route = response.routes[0];
                              $('textarea#textarea_console').text("");
                              for (var i = 0; i < route.legs.length; i++) {
                                var routeSegment = i + 1;
                                var html="";
                                html+='<b>Route Segment: ' + routeSegment +'</b><br>';
                                html+=route.legs[i].start_address + ' to ';
                                html+=route.legs[i].end_address + '<br>';
                                html+=route.legs[i].distance.text + '<br><br>';
                              }
                              map.setCenter(lastMarkers[0].getPosition());
                              
                            } else {
                              window.alert('Directions request failed due to ' + status);
                            }

                          });                  
            }    
            
            
            
            
            
            
            
            
            
            
            
            
            
        function showSimulatedSolutionOnMap(id){
            var lastMarkers=lastStart["markers"];
                    map = createNewMap(lastMarkers[0].getPosition());
                
                
                
//                console.log("ID="+id)
                 //deleteAllMarkersFromListAndMap(); //BORRAMOS TODO DEL MAPA
                var arraySolutions=JSON.parse($( '#'+id ).find( ".array_markers_value" ).html());     
                
//                   console.log("AarraySolutions="+arraySolutions) 
//                   console.log("AarraySolutions[0]="+arraySolutions[0]) 
//                   console.log("AarraySolutions[1]="+arraySolutions[1])  
                   
                   
                   
                   var waypts = [];
                   
                  var lastMarkers=lastStart["markers"];
                  
                  for (var i=0;i<arraySolutions.length;i++){
                      waypts.push(
                        lastMarkers[parseInt(arraySolutions[i])+1]//SE LE SUMA 1 PORQUE EL CERO ES EL ALMACÉN
                        );
                  }                   
                   
                  drawSimulatedRoute(lastMarkers[0],lastMarkers[0],waypts,map)
                                   
            }         
            
                    
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
            function saveSolutionsInList(individual){
                $('#show_solution_fitness').val((individual.fitness*-1).toFixed(4));
                
                var nCustomers=markers.length-1;
//                console.log("nCustomers="+nCustomers)
                var allelesArray = individual.chromosome.alleles;
//                console.log("allelesArray="+allelesArray)
                var solutionsList=[];
                var sol=[];
                for (var i=0;i<allelesArray.length;i++){
//                    console.log("i="+i)
//                    console.log("allelesArray["+i+"]="+allelesArray[i])
                    if (allelesArray[i]<nCustomers){
                        sol.push(allelesArray[i]);
//                        console.log("sol="+sol);
                    } else {
//                        console.log("VAMOS A AÑADIR SOL->"+sol)
                        solutionsList.push(sol);
//                        console.log("solutionsList="+JSON.stringify(solutionsList))
                        sol=[];
                    }
                }
                if (sol.length>0){
//                    solutionsList[0].unshift(sol);
                    solutionsList[0]=sol.concat(solutionsList[0]);
                }
                
                var markersButton="";
                    markersButton+='<li id="li_solution_data_show_markers">';
                    markersButton+='<a >';
                    markersButton+='<span>Show Markers</span><br/>';
                    markersButton+='</a>';	
                    markersButton+="</li>";    
                    $('#ul_solutions_list').append(markersButton).listview('refresh');
                
                
                for (var i=0;i<solutionsList.length;i++){
                    var li="";
                    li+='<li id="li_solution_data_'+i+'" class="li_solution_data">';
                    li+='<a >';
                    li+='<span>Route '+i+'</span><br/>';
                    li+='<span>Customers = '+solutionsList[i].length+'</span><br/>';
                    li+='<span class="array_markers_value">'+JSON.stringify(solutionsList[i])+'</span><br/>';
                    li+='</a>';	
                    li+="</li>";    
                    $('#ul_solutions_list').append(li).listview('refresh');
                }   
            }  	



            
 	function pinSymbol(color) {
		return {
			path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
			fillColor: color,
			fillOpacity: 1,
			strokeColor: '#000',
			strokeWeight: 1,
			scale: 1,
			labelOrigin: new google.maps.Point(0,-29)
		};
	}           
            
            
function drawSimulatedRoute(origin,destiny,waypts,map){
        solutionMarkers = [];
    
	var markerLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';



	//var greenMarker=pinSymbol('green');
	var greenMarker=pinSymbol('#6fba33');
	
	
	var label=markerLabels[0];
	addMarkerSol(origin,map,null,null,1); //WAREHOUSE
	if (waypts.length>0){
		label=markerLabels[1];
		addMarkerLine(origin,waypts[0],map,label,greenMarker,0);

		for (var i=0;i<waypts.length-1;i++){
//                        var idFirstLabel=-1;
//                        var idLabel=i+2;
//                        while (idLabel>markerLabels.length){
//                            idLabel-=26;
//                            idFirstLabel++;
//                        }
//                        if (idFirstLabel>=0){
//                            label=markerLabels[idFirstLabel]+markerLabels[idLabel];
//                        } else {
//                            label=markerLabels[idLabel];
//                        }
                        
			label=markerLabels[i+2];
                        
			addMarkerLine(waypts[i],waypts[i+1],map,label,greenMarker,0);
		}
		
		if (waypts[waypts.length-1]){
			label=markerLabels[waypts.length+1];
			addMarkerLine(waypts[waypts.length-1],destiny,map,label,null,0);
		}
	}
        
      centerMapOnMarkers(solutionMarkers,map);
        
}


function centerMapOnMarkers(markersToCenter,localMap){
//    alert("centering");
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0; i < markersToCenter.length; i++) {
//            console.log("markersToCenter "+i)
//            console.log(i+" position "+markersToCenter[i].getPosition())
            bounds.extend(markersToCenter[i].getPosition());
        }

//        console.log("BOUNDS "+bounds.toString())
//        console.log("MAP "+localMap.toString())
        localMap.fitBounds(bounds);      
        
}

            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
