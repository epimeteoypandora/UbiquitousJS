window.onload = function() {
	$('.less_button_float').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseFloat(lastValue)-0.001;
		newValue=newValue.toFixed(3);
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});		
	$('.more_button_float').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseFloat(lastValue)+0.001;
		newValue=newValue.toFixed(3);
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});		
	$('.less_button_float1').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseFloat(lastValue)-0.1;
		newValue=newValue.toFixed(1);
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});		
	$('.more_button_float1').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseFloat(lastValue)+0.1;
		newValue=newValue.toFixed(1);
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});			
	
	$('.less_button').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseInt(lastValue)-1;
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});	
	
	$('.more_button').click(function(){
		var input=$(this).parent().find( 'input' );
		var lastValue=input.val();
		var newValue=parseInt(lastValue)+1;
		newValue=checkNumericInputValue(input,newValue);
		input.val(newValue);
	});		
	

	$('#delete_last_button').click(function(){
		var id=markers.length-1;
		//alert("BORRAMOS ID="+id)
		//alert("quedan="+markers.length)
		//alert("elemento ="+$('#li_marker_data_'+id))
		deleteMarker(id);
		//$('#li_marker_data_'+id).remove().listview('refresh');
		$('#marker_data_list li:last').remove();
		//alert("quedannn="+markers.length)
		console.log("quedan="+markers.length)
                updateMarkerCounter();
		
	});		
	
	$('#delete_all_button').click(function(){
            deleteAllMarkersFromListAndMap();
//		var id=null;
//		while (markers.length>0){
//			id=markers.length-1;
//			deleteMarker(id);
//			$('#marker_data_list li:last').remove();
//		}	
//		console.log("quedan="+markers.length)	
            updateMarkerCounter();
	});			
	
	
	
	function checkNumericInputValue(input,newValue){
		if (input.attr('min') && newValue<input.attr('min')){
			newValue=input.attr('min');
		} else if (input.attr('max') && newValue>input.attr('max')){
			newValue=input.attr('max');
		}
		return newValue;
	}
	
	
//	$('input[type="number"]').keyup(function(e){
	$('input[type="number"]').focusout(function(e){            
		if (this.min &&this.value==""){
			this.value=this.min;
		} else if (this.min && parseFloat(this.value)<parseFloat(this.min)){
			this.value=this.min
		} else if (this.max && parseFloat(this.value)>parseFloat(this.max)){
			this.value=this.max;
		}
		else if (this.value==""){
			this.value=0;
		}
	});
	

	

	
	
	$(document).on("pageshow","#map_page",function(){ // When entering pagetwo
//		$( "#div_marker_data_list" ).panel( "open" );
                $( "#div_solutions_list" ).panel( "open" );
	});	
	
      
        
	$('#create_new_problem_button').click(function(){
            setCreateMenuPage();
	});
    
        
        $("ul").on("click", ".li_solution_data", function(){
            var arraySolutions=JSON.parse($( '#'+this.id ).find( ".array_markers_value" ).html());
            updateDataOfInterestSolution(arraySolutions.length+1);
            if (!simulatedSolution){
                showSolutionOnMap(this.id);
            } else {
                showSimulatedSolutionOnMap(this.id);
            }
            
        });
	
	
	$("ul").on("click", ".li_marker_data", function(){
		var id = this.id.substring("li_marker_data_".length,this.id.length);
		var coordinates=$( this ).find( '.span_location_coordinates' ).html();
		var items=$( this ).find( '.span_location_items_value' ).html();
		var time=$( this ).find( '.span_location_time_value' ).html();
		console.log("loadMarkerDataDetail(id,coordinates,items,time)")
		console.log("id="+id)
		console.log("coordinates="+coordinates)
		console.log("items="+items)
		console.log("time="+time)
		loadMarkerDataDetail(id,coordinates,items,time);
	});
				
	
	$('#back_from_marker_data_detail_page').click(function(){
		var id=$('#location_id').val();
		var items=$('#location_items').val();
		var time=$('#location_time').val();
		loadMarkerDataList(id,items,time);
	});		
	
	$('#start_button').click(function(){
            if (!running){
                if (markers.length<=1){
                    alert("Oops, you have to select at least two markers.");
                    return;
                }else if (markers.length<=10){
                    getDistanceMatrix()
                } else {
                    alert("Too Much Markers! Distance Matrix will be simulated. Results will not be realistic.");
                    simulatedSolution=true;
                    getSimulatedDistanceMatrix();
                }                
            } else {
                alert("Sorry, you cannot start a new problem while it is one running.")                
            }		
	});
 	$('#start_button').mouseup(function(){
            $('#start_button').removeClass("ui-btn-active");
	});       
 	$('#start_button').mousedown(function(){
            $('#start_button').addClass("ui-btn-active");
	});              
 	$('#delete_last_button').mouseup(function(){
            $('#delete_last_button').removeClass("ui-btn-active");
	});  
 	$('#delete_last_button').mousedown(function(){
            $('#delete_last_button').addClass("ui-btn-active");
	});         
 	$('#delete_all_button').mouseup(function(){
            $('#delete_all_button').removeClass("ui-btn-active");
	});  
 	$('#delete_all_button').mousedown(function(){
            $('#delete_all_button').addClass("ui-btn-active");
	});           
        
        
        
        $("ul").on("click", "#li_solution_data_show_markers", function(){
            showMarkersSolution();
            
        });

        
//        $( "#start_problem_from_file" ).click(function() {
//            if (!running){
//                alert("Starting Problem From File!")
//                window.applicationLayer.startCVRPFromFile();                
//            } else {
//                alert("Sorry, you cannot start a new problem while it is one running.")
//            }
//
//        });    		

        $( "#stop_problem_button" ).click(function() {
            if (running){
                window.applicationLayer.stop(); 
            } else {
                alert("The application is not running.")
            }
             
        });   
	
};	