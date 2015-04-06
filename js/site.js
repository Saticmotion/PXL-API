//TODO(Simon): Currently testing with mock data, because api doesn't have CORS. REMEMBER TO SWITCH TO API!

var baseUrl = "http://data.pxl.be/roosters/v1/";
var templates = new Object();
var classes;

$(document).ready(function(){
	compileTemplates();

	$(".button-collapse").sideNav();
	
	classes = getClasses();
	createClassList(classes);
});

function compileTemplates(){
	templates["classEntry"] = Handlebars.compile($("#class-template").html());
}

function createClassList(classEntries){
	$("#main").empty();

	classEntries.forEach(function(entry){
		var html = templates["classEntry"](entry);
		$("#main").append(html)
	});	
}

function searchClassList(searchTerm){
	var matches = new Array();

	classes.forEach(function(entry){
		if (entry["klas"].toLowerCase().indexOf(searchTerm) > -1){
			matches.push(entry);
		}
	});

	return matches;
}

$("#search").on("input", function(){
	var val = $(this).val()
	var matches = searchClassList(val);
	createClassList(matches);
});

//Everything below here are functions to create mock data.

function getClasses(){
	return JSON.parse(
		'[{"klas":"1TINA","jaar":"2015"},{"klas":"1TINB","jaar":"2015"},{"klas":"1TINC","jaar":"2015"},' +
		'{"klas":"1TIND","jaar":"2015"},{"klas":"1TINE","jaar":"2015"},{"klas":"1TINF","jaar":"2015"},' +
		'{"klas":"1TINH","jaar":"2015"},{"klas":"1TINI","jaar":"2015"},{"klas":"1TINJ","jaar":"2015"},' +
		'{"klas":"1TINK","jaar":"2015"},{"klas":"1TINL","jaar":"2015"},{"klas":"2TINA","jaar":"2015"},' +
		'{"klas":"2TINB","jaar":"2015"},{"klas":"2TINC","jaar":"2015"},{"klas":"2TIND","jaar":"2015"},' +
		'{"klas":"2TINE","jaar":"2015"},{"klas":"2TINF","jaar":"2015"},{"klas":"2TING","jaar":"2015"},' +
		'{"klas":"2TINH","jaar":"2015"},{"klas":"2TINI","jaar":"2015"},{"klas":"2TINJ","jaar":"2015"},' +
		'{"klas":"2TINK","jaar":"2015"},{"klas":"2TINL","jaar":"2015"},{"klas":"2TINM","jaar":"2015"},' +
		'{"klas":"2TINN","jaar":"2015"},{"klas":"2TINO","jaar":"2015"},{"klas":"2TINP","jaar":"2015"},' +
		'{"klas":"2TINQ","jaar":"2015"},{"klas":"2TINR","jaar":"2015"},{"klas":"2TINS","jaar":"2015"},' +
		'{"klas":"2TINT","jaar":"2015"},{"klas":"2TINU","jaar":"2015"},{"klas":"2TINV","jaar":"2015"},' +
		'{"klas":"2TINW","jaar":"2015"},{"klas":"2TINX","jaar":"2015"}]');
}