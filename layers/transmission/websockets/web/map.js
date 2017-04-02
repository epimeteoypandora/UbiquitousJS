        function addRandomMarker(){
            
                                              var icon=null;
                                                if (markers.length==0){
                                                    icon=pinSymbol('violet');
                                                }
                                                var latitude=(Math.random()*180)-90;
                                                var longitude=(Math.random()*360)-180;
//                                                console.log("latitude "+latitude)
                                                var position = new google.maps.LatLng(latitude,longitude)
                                                addMarker(position,map,null,icon,0);            
        }
        
        
        function initMap(){
                                        var initializedMap=false;
                                $(document).on('pageshow', '#map_page',function(e,data){   

                                                if (!initializedMap){
                                                        $('#content').height(getRealContentHeight());

                                                   
                                                        distanceMatrixService=new google.maps.DistanceMatrixService();
                                                        
                                                   map = createNewMap(null);


                                                } else {
                                                    google.maps.event.trigger(map, 'resize');
                                                }

                        //                        map.setCenter(new google.maps.LatLng(40.4168, -3.7038));
                                                  // This event listener will call addMarker() when the map is clicked.
                          map.addListener('click', function(event) {

                                                var icon=null;
                                                if (markers.length==0){
                                                    icon=pinSymbol('violet');
                                                }
                                                addMarker(event.latLng,map,null,icon,0);
                          });
                        
                          
                          
                          
//// bounds of the desired area
//var allowedBounds = new google.maps.LatLngBounds(
//    // new google.maps.LatLng(70.33956792419954, 178.01171875), 
//     new google.maps.LatLng(0, 0), 
//     new google.maps.LatLng(83.86483689701898, -88.033203125)
//);
//var lastValidCenter = map.getCenter();
//
//google.maps.event.addListener(map, 'center_changed', function() {
//    if (allowedBounds.contains(map.getCenter())) {
//        // still within valid bounds, so save the last valid position
//        lastValidCenter = map.getCenter();
//        return; 
//    }
//
//    // not valid anymore => return to last valid position
//    map.panTo(lastValidCenter);
//});                          
                          
                          

                                                initializedMap=true;
                                });            
        }

 
        function getRealContentHeight() {
            var header = $.mobile.activePage.find("div[data-role='header']:visible");
            var footer = $.mobile.activePage.find("div[data-role='footer']:visible");
            var content = $.mobile.activePage.find("div[data-role='content']:visible:visible");
            var viewport_height = $(window).height();
 
            var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
            if((content.outerHeight() - header.outerHeight() - footer.outerHeight()) <= viewport_height) {
                content_height -= (content.outerHeight() - content.height());
            } 
            return content_height;
        }

















var warehouse = null;
var image=null;
window.onload = function() {
  warehouse = {
    url: 'almacen.png',
    // This marker is 20 pixels wide by 32 pixels high.
    size: new google.maps.Size(40, 40),
    // The origin for this image is (0, 0).
    origin: new google.maps.Point(0, 0),
    // The anchor for this image is the base of the flagpole at (0, 32).
    anchor: new google.maps.Point(20, 33)
  };
};
	
// In the following example, markers appear when the user clicks on the map.
// The markers are stored in an array.
// The user can then click an option to hide, show or delete the markers.
var map;
var geocoder;
var distanceMatrixService;
var markers = [];
var solutionMarkers = [];


// Adds a marker to the map and push to the array.
//function addMarker(location) {
//  if (markers.length==0){
//	image=warehouse;
//  } else {
//	image=null;
//  }
//  var marker = new google.maps.Marker({
//    position: location,
//      icon: image,	
//    map: map
//  });
//  markers.push(marker);
//  addMarkerToList(marker);
//}
function addMarker(location,map,label,icon,zIndex) {
    var lastMarker=markers[markers.length-1];
    var lastPosition=null;
    
    if (lastMarker) lastPosition= markers[markers.length-1].getPosition();
       
    if (lastPosition && location.lat()==lastPosition.lat() && location.lng()==lastPosition.lng()){
       // alert("lastMarker.lat()==location.lat()");
       // alert(lastPosition.lat()+"=="+location.lat());
       // alert("lastMarker.lng()==location.lng()");
       // alert(lastPosition.lng()+"=="+location.lng());        
        return;
    } else { //DEBUG
        console.log("location -> "+location.lat()+" # "+location.lng())
        if (lastPosition){
            console.log("lastPosition -> "+lastPosition.lat()+" # "+lastPosition.lng())
        } 
    }
    
    var id = markers.length-1;
    var marker = createNewMarker(location,map,label,icon,zIndex,id,$('#input_default_delivery_items').val(),$('#input_default_delivery_time').val())
      
      markers.push(marker);
      addMarkerToList(marker);
      
      updateMarkerCounter();
}
function updateMarkerCounter(){
    $("#data_of_interest_total_markers").html(markers.length);
}

function updateDataOfInterestSolution(nMarkers){
    $("#data_of_interest_markers_in_route").html(nMarkers);
    $("#data_of_interest_total_fitness").html($("#show_solution_fitness").val());
}


function getInfoWindowText(id,nItems,nTime){
    var text="";
    if (id==-1){
        text+="<p>ID: "+id+"</p>";
        text+="<p>WAREHOUSE</p>";
    } else {
        text+="<p>ID: "+id+"</p>";
        text+="<p>Items: "+nItems+"</p>";
        text+="<p>Time: "+nTime+"</p>";        
    }
    return text;
}

function updateMarkerData(marker,nItems,nTime){
    marker.set("deliveryItems", nItems);
    marker.set("deliveryTime", nTime);       
    
    var id = marker.get("id");
    var text = getInfoWindowText(id,nItems,nTime);
    var infowindow = marker.get("infowindow");
    infowindow.setContent(text);
    
    
}

function createNewMarker(location,map,label,icon,zIndex,id,nItems,nTime){
        var text=getInfoWindowText(id,nItems,nTime);
    
        var marker = new google.maps.Marker({
              position: location,
              draggable:true,
              label:label,
              zIndex:zIndex,
              icon:icon,
              map: map
        });   
        
       // text = marker.title+"\n"+text;
      
//       text = marker.showInfoWindow()+"\n"+text;
        
        marker.set("id", id);
        marker.set("deliveryItems", nItems);
        marker.set("deliveryTime", nTime);        
        
        var infowindow = new google.maps.InfoWindow({
            content: text
          });
          
        marker.set("infowindow", infowindow);  
        
        map.addListener('click', function() {
            infowindow.close();
        });
        
        
        marker.addListener('click', function() {
          infowindow.open(map, marker);
        });   
        
        marker.addListener('dragend', function() {
            $( '#li_marker_data_'+marker.get("id") ).find( ".span_location_coordinates" ).html(marker.getPosition().lat().toFixed(4)+", "+marker.getPosition().lng().toFixed(4));
        });        
        
        return marker;
}

function addMarkerSol(oldMarker,map,label,icon,zIndex) {          
        var id = oldMarker.get("id");
        var nItems = oldMarker.get("deliveryItems");
        var nTime = oldMarker.get("deliveryTime");
        
        var marker = createNewMarker(oldMarker.getPosition(),map,label,icon,zIndex,id,nItems,nTime);        
        solutionMarkers.push(marker);
}

//function addMarkerSol(location,map,label,icon,zIndex) {   
//        var marker = new google.maps.Marker({
//              position: location,
//              label:label,
//              zIndex:zIndex,
//              icon:icon,
//              map: map
//        });
//  
//        //marker.set("id", solutionMarkers.length);
//        marker.addListener('click', function() {
//          //  alert("my id is "+marker.get("id"));
//          alert("sffasfsfadsfdsa")
//        });  
//        
//            google.maps.event.addListener(marker, 'click', function() {
//                infowindow.setContent(title);
//                infowindow.open(map, marker);
//            });        
//        
//        solutionMarkers.push(marker);
//}


// Sets the map on all markers in the array.
function setMapOnAll(map) {
  for (var i = 0; i < markers.length; i++) {
    markers[i].setMap(map);
  }
}

function setMapOnId(id,map) {
	markers[id].setMap(map);
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
}

function clearMarker(id) {
  setMapOnId(id,null);
}

// Shows any markers currently in the array.
function showMarkers() {
  setMapOnAll(map);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  clearMarkers();
  markers = [];
//  $('#selected_markers').empty();
}

function deleteMarker(id) {
  clearMarker(id);
  //array.splice(index, 1);
  markers[id]=null;
  markers.splice(id, 1);
  //$('#marker_'+id).remove();
}














function addMarkerLine(posIni,posEnd,map,labelMarker,iconMarker,zIndex){
	var line = new google.maps.Polyline({
    path: [posIni.getPosition(),posEnd.getPosition()],
    geodesic: true,
    //strokeColor: '#FF0000',
	strokeColor: '#3398fe',
	
    strokeOpacity: 1.0,
    strokeWeight: 2,
	map: map
  });
  addMarkerSol(posEnd,map,labelMarker,iconMarker,zIndex);

}


function createNewMap(center){
    if (!center) center=new google.maps.LatLng(40.4168, -3.7038);
    return new google.maps.Map(document.getElementById('map_canvas'), {
        mapMaker:false,
        clickableIcons:false,
        disableDefaultUI:true,
        zoomControl: true,
        zoom: 5,
        minZoom:3,
        //maxZoom:3,
        center: center,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });       
}


$( document ).ready(function() {
//        var altura=500;
//        setTimeout(function(){ 
//                $('#content').height(getRealContentHeight()); 
//            
//            $('#map_page').height(altura);
////            $('#content').height(altura);
//            $('#map_canvas').height(altura);
////            $('html').height(altura);
////            $('body').height(altura);
////            $('#div_marker_data_list').height(altura);
////            $('#ul_solutions_list').height(altura);
////    //        setTimeout(function(){ google.maps.event.trigger(map, 'resize'); }, 100);
//            google.maps.event.trigger(map, 'resize');
////            $('#div_marker_data_list').listview('refresh');
////            $('#ul_solutions_list').listview('refresh');
//////            alert($('#map_canvas').height())        
//        
//        
//        }, 200);      
    
    
    
    
    
    
    
    
    
    
    
    
    
    $('#marker_data_list').height(window.innerHeight);
    $('#ul_solutions_list').height(window.innerHeight);
    
//    $( window ).on( "orientationchange", function( event ) {
////        window.innerHeight;
//
//        setTimeout(function(){ 
////            var realHeight=window.innerHeight; 
//        var realHeight=getRealContentHeight(); 
//            $('#map_page').height(realHeight);
//            $('#content').height(realHeight);
//            $('#map_canvas').height(realHeight);
////            $('html').height(realHeight);
////            $('body').height(window.innerHeight);
//            $('#marker_data_list').height(realHeight);
//            $('#ul_solutions_list').height(realHeight);
//    //        setTimeout(function(){ google.maps.event.trigger(map, 'resize'); }, 100);
//            
//            $('#marker_data_list').listview('refresh');
//            $('#ul_solutions_list').listview('refresh');
//            google.maps.event.trigger(map, 'resize');
////            alert($('#map_canvas').height())        
//        
//        
//        }, 200);
//
//    }); 
    $(window).resize(function() {
      // (the 'map' here is the result of the created 'var map = ...' above)
//$('#content').height($(window).height() - 46);
//        google.maps.event.trigger(map, "resize");
        setTimeout(function(){ 
//            var realHeight=window.innerHeight; 
        var realHeight=getRealContentHeight(); 
            $('#map_page').height(realHeight);
            $('#content').height(realHeight);
            $('#map_canvas').height(realHeight);
//            $('html').height(realHeight);
//            $('body').height(window.innerHeight);
            $('#marker_data_list').height(realHeight);
            $('#ul_solutions_list').height(realHeight);
    //        setTimeout(function(){ google.maps.event.trigger(map, 'resize'); }, 100);
            
            $('#marker_data_list').listview('refresh');
            $('#ul_solutions_list').listview('refresh');
            google.maps.event.trigger(map, 'resize');
//            alert($('#map_canvas').height())        
        
        
        }, 200);
    });    
});


//$( window ).on( "orientationchange", function( event ) {
//    ('#marker_data_list').height(window.innerHeight)
////    #marker_data_list{
////        height:window.innerHeight;
////    }
//});



//if(window.innerHeight > window.innerWidth){
//    alert("Please use Landscape!");
//}









