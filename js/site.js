var baseUrl = "http://data.pxl.be/roosters/v1/";
var templates = new Object();

$(document).ready(function(){
	compileTemplates();

	$(".button-collapse").sideNav();
	makeRequest2();
});

function compileTemplates(){
	templates["classEntry"] = Handlebars.compile($("#class-template").html());
}

function makeRequest(){
	$.ajax({ 
		url : baseUrl + "klassen/",
	    type : "GET",
	    error : function(req, message) {
	        console.log(message);
	        console.log(req);
	    },
	    success : function(data) {
	        console.log(data);
	    },
	    dataType :  "text"
	});
}

function makeRequest2(){
	$.ajax({
		dataType: 'jsonp',
		url: baseUrl + 'klassen/',
		success: function () {
			console.log("yay");
		}
	});
}