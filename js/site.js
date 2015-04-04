var baseUrl = "http://data.pxl.be/roosters/v1/";
var templates = new Object();

$(document).ready(function(){
	compileTemplates();

	$(".button-collapse").sideNav();

	$.get(baseUrl + "klassen/", function(data){
			alert(data);
	});
});

function compileTemplates(){
	templates["classEntry"] = Handlebars.compile($("#class-template").html());
}