"use strict";
//TODO(Simon): Currently testing with mock data, because api doesn't have CORS. REMEMBER TO SWITCH TO API!
//TODO(Simon): Make days tabbed on mobiles.

var baseUrl = "http://data.pxl.be/roosters/v1/";
var templates = {};
var classes;
var roster;
var ScreensEnum = Object.freeze({CLASSLIST : 0, ROSTER : 1});
var currentScreen;

$(document).ready(function() {
	compileTemplates();

	$(".button-collapse").sideNav();

	classes = getClasses();
	createClassList(classes);
});

function compileTemplates() {
	templates.classList = Handlebars.compile($("#class-template").html());
	templates.classEntry = Handlebars.compile($("#class-item-template").html());
	templates.roster = Handlebars.compile($("#roster-template").html());
	templates.rosterDayEntry = Handlebars.compile($("#roster-day-template").html());
	templates.rosterDayHeader = Handlebars.compile($("#roster-day-header-template").html());
	templates.rosterCourseEntry = Handlebars.compile($("#roster-course-template").html());
	templates.courseModal = Handlebars.compile($("#course-modal-template").html());
}

//==========Classlist==========

function createClassList(classEntries) {
	$("#main").empty();

	currentScreen = ScreensEnum.CLASSLIST;

	insertTemplate("classList", {}, $("#main"));

	//var html = templates["classList"];
	//$("#main").append(html);

	classEntries.forEach(function(entry){
		insertTemplate("classEntry", entry, $("#class-list"));

		//var html = templates["classEntry"](entry);
		//$("#class-list").append(html);
	});

	$(".class-link").on("click", createRoster);
}

$("#search").on("input", function() {
	if (currentScreen === ScreensEnum.CLASSLIST){
		var val = $(this).val();
		var matches = searchClassList(val);
		createClassList(matches);
	}
	else if (currentScreen === ScreensEnum.ROSTER) {
		var val = $(this).val();
		searchRoster(val);
	}
});

function searchClassList(searchTerm) {
	var matches = [];
	searchTerm = replaceWildcards(searchTerm);
	var regex = new RegExp(searchTerm);

	classes.forEach(function(entry){
		if(regex.test(entry.klas.toLowerCase())){
			matches.push(entry);
		}
	});

	return matches;
}

//==========Roster==========

function searchRoster(searchTerm) {
	searchTerm = replaceWildcards(searchTerm);
	var highlightClass = "green lighten-3";

	if (searchTerm === ""){
		$(".olod").removeClass(highlightClass);
		return;
	}

	var regex = new RegExp(searchTerm);

	$(".olod").each(function(){
		var text = $(this).data("coursename");

		if (regex.test(text.toLowerCase())){
			$(this).addClass(highlightClass);
		} else {
			$(this).removeClass(highlightClass);
		}
	});
}

function createRoster(className) {
	$("#main").empty();

	currentScreen = ScreensEnum.ROSTER;

	roster = getRoster(className);
	roster.sort(compareCourse);
	roster = deleteDuplicateCourses(roster);

	insertTemplate("roster", {}, $("#main"));

	$("#roster-back-button").on("click", function() {createClassList(classes);});

	roster.forEach(insertRosterCourse);

	$(".olod").on("click", expandCourse);
	$(".olod").tooltip();
}

function insertRosterCourse(course) {
	var date = Date.parseCourseDate(course);

	var columnForDate = $("#roster").children("[data-date=" + date.getUnixTime() + "]").children(".row");

	if(!columnForDate.exists()){
		columnForDate = insertRosterDay(date);
	}

	//TODO(Simon): Fix display of times
	insertTemplate("rosterCourseEntry", course, columnForDate);
}
 
function insertRosterDay(date) {
	insertTemplate("rosterDayEntry", {"date":date.getUnixTime()}, $("#roster"));

	var columnForDate = $("#roster").children("[data-date=" + date.getUnixTime() + "]").children(".row");

	insertRosterDayHeader(date, columnForDate);

	return columnForDate;
}

function insertRosterDayHeader(date, columnForDate) {
	insertTemplate("rosterDayHeader", {"weekday": date.getDayName()}, columnForDate);
}

function expandCourse() {
	var olodID = $(this).data("course");
	var course = findWithAttr(roster, 'code_olod', olodID);
	
	course.weekday = Date.parseCourseDate(course).getDayName();
	
	$(".modal").remove();
	insertTemplate("courseModal", course, $("body"));

	$("#modal").openModal();
}

//TODO(Simon): See if we still need this once the API has been fixed
function deleteDuplicateCourses(courses) {
	var out = [];
	for (var i = 0; i < courses.length; i++) {
		var a = courses[i];
		var b = courses[i + 1];

		//This happens in the last iteration
		if(b === undefined){
			out.push(a);
			return out;
		}

		if(compareCourse(a, b) !== 0) {
			out.push(a);
		}
	}
}

function compareCourse(a, b) {
	if (a.datum2 < b.datum2) {
		return -1;
	}
	if (a.datum2 > b.datum2) {
		return 1;
	}
	//From here on dates are equal, so compare hours
	if (a.van_uur < b.van_uur) {
		return -1;
	}
	if (a.van_uur > b.van_uur) {
		return 1;
	}
	//From here on, begin hour is equal, so compare end hour
	if (a.tot_uur < b.tot_uur) {
		return -1;
	}
	if (a.tot_uur > b.tot_uur) {
		return 1;
	}
	//They have equal hours, so compare by name
	if (a.code_olod < b.code_olod) {
		return -1;
	}
	if (a.code_olod > b.code_olod) {
		return 1;
	}

	return 0;
}

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return array[i];
        }
    }
}

//==========Helpers==========

function insertTemplate(templateName, data, target) {
	var html = templates[templateName](data);
	target.append(html);
}

function replaceAll(find, replace, str) {
	return str.replace(new RegExp(find, 'g'), replace);
}

function replaceWildcards(searchTerm) {
	searchTerm = replaceAll('\\*', '.*', searchTerm); //Replace * with match any string of any length
	searchTerm = replaceAll('\\?', '.', searchTerm); //Replace ? with match any single character
	searchTerm = replaceAll('[/\\\\]', '', searchTerm); //Remove forward and backslashes, because they interfere with regex searches.
	return searchTerm;
}

Date.prototype.getUnixTime = function() { 
	//Goes from milliseconds to seconds.
	return this.getTime() / 1000 | 0;
};

Date.prototype.getDayName = function() {
	var days = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];
	return days[this.getDay()];
};

Date.parseCourseDate = function(course) {
	var day = course.datum2.substring(4, 6);
	var month = course.datum2.substring(2, 4);
	var year = '20' + course.datum2.substring(0, 2); //prefix 20, so JS knows we mean 2015 and not 1915. Will cause a bug after 2100
	return new Date(year, month - 1, day);
};

//extend jQuery with a function to check if a selector returned any element.
$.fn.exists = function () {
	return this.length !== 0;
};



//Everything below here are functions to create mock data. 
//TODO(Simon): Replace with actual API calls when possible

function getClasses() {
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

function getRoster(className) {
	return JSON.parse(
		'[{"groep":"Handel","lokaal":"EB041","datum":"20\/04\/15","datum2":"150420","van_uur":1130,"tot_uur":1230,"jaar":"2015","code_olod":"4537PR","ROWID":"45414530","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB041","datum":"20\/04\/15","datum2":"150420","van_uur":1130,"tot_uur":1230,"jaar":"2015","code_olod":"4537PR","ROWID":"46239891","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"20\/04\/15","datum2":"150420","van_uur":1030,"tot_uur":1130,"jaar":"2015","code_olod":"4536PR","ROWID":"45414576","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB041","datum":"20\/04\/15","datum2":"150420","van_uur":830,"tot_uur":930,"jaar":"2015","code_olod":"4411PR","ROWID":"45414592","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"20\/04\/15","datum2":"150420","van_uur":1030,"tot_uur":1130,"jaar":"2015","code_olod":"4536PR","ROWID":"46239937","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB041","datum":"20\/04\/15","datum2":"150420","van_uur":830,"tot_uur":930,"jaar":"2015","code_olod":"4411PR","ROWID":"46239953","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB352","datum":"21\/04\/15","datum2":"150421","van_uur":1330,"tot_uur":1430,"jaar":"2015","code_olod":"4419PR","ROWID":"45414676","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"},' +
		'{"groep":"Handel","lokaal":"EB352","datum":"21\/04\/15","datum2":"150421","van_uur":1330,"tot_uur":1430,"jaar":"2015","code_olod":"4419PR","ROWID":"46240037","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"},' +
		'{"groep":"Handel","lokaal":"EB341","datum":"21\/04\/15","datum2":"150421","van_uur":1430,"tot_uur":1630,"jaar":"2015","code_olod":"4537PR","ROWID":"45414537","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB134","datum":"21\/04\/15","datum2":"150421","van_uur":830,"tot_uur":1030,"jaar":"2015","code_olod":"4420PR","ROWID":"45414549","klas":"1TINB","olod":"Math for IT - PR (2TIN P2)","code_docent":"GoPa","docent":"Gonnissen Patrick"},' +
		'{"groep":"Handel","lokaal":"EB341","datum":"21\/04\/15","datum2":"150421","van_uur":1430,"tot_uur":1630,"jaar":"2015","code_olod":"4537PR","ROWID":"46239898","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB134","datum":"21\/04\/15","datum2":"150421","van_uur":830,"tot_uur":1030,"jaar":"2015","code_olod":"4420PR","ROWID":"46239910","klas":"1TINB","olod":"Math for IT - PR (2TIN P2)","code_docent":"GoPa","docent":"Gonnissen Patrick"},' +
		'{"groep":"Handel","lokaal":"EB121","datum":"21\/04\/15","datum2":"150421","van_uur":1230,"tot_uur":1330,"jaar":"2015","code_olod":"4536PR","ROWID":"45414583","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB121","datum":"21\/04\/15","datum2":"150421","van_uur":1230,"tot_uur":1330,"jaar":"2015","code_olod":"4536PR","ROWID":"46239944","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"22\/04\/15","datum2":"150422","van_uur":1030,"tot_uur":1230,"jaar":"2015","code_olod":"4536PR","ROWID":"45414584","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"22\/04\/15","datum2":"150422","van_uur":1030,"tot_uur":1230,"jaar":"2015","code_olod":"4536PR","ROWID":"46239945","klas":"1TINB","olod":"Web Essentials - PR (2TIN P2)","code_docent":"JaGr","docent":"Janssen Greta"},' +
		'{"groep":"Handel","lokaal":"EB253","datum":"22\/04\/15","datum2":"150422","van_uur":830,"tot_uur":1030,"jaar":"2015","code_olod":"4411PR","ROWID":"45414601","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB253","datum":"22\/04\/15","datum2":"150422","van_uur":830,"tot_uur":1030,"jaar":"2015","code_olod":"4411PR","ROWID":"46239962","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB253","datum":"22\/04\/15","datum2":"150422","van_uur":1330,"tot_uur":1430,"jaar":"2015","code_olod":"4411PR","ROWID":"46239964","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB152","datum":"23\/04\/15","datum2":"150423","van_uur":1330,"tot_uur":1530,"jaar":"2015","code_olod":"4420PR","ROWID":"45414692","klas":"1TINB","olod":"Math for IT - PR (2TIN P2)","code_docent":"TaHe","docent":"Tans Heidi"},' +
		'{"groep":"Handel","lokaal":"EB152","datum":"23\/04\/15","datum2":"150423","van_uur":1330,"tot_uur":1530,"jaar":"2015","code_olod":"4420PR","ROWID":"46240053","klas":"1TINB","olod":"Math for IT - PR (2TIN P2)","code_docent":"TaHe","docent":"Tans Heidi"},' +
		'{"groep":"Handel","lokaal":"EB152","datum":"23\/04\/15","datum2":"150423","van_uur":1230,"tot_uur":1330,"jaar":"2015","code_olod":"4537PR","ROWID":"45414539","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB152","datum":"23\/04\/15","datum2":"150423","van_uur":1230,"tot_uur":1330,"jaar":"2015","code_olod":"4537PR","ROWID":"46239900","klas":"1TINB","olod":"SQL - PR (WA)","code_docent":"GoIs","docent":"Godfrind Isabelle"},' +
		'{"groep":"Handel","lokaal":"EB246","datum":"23\/04\/15","datum2":"150423","van_uur":1030,"tot_uur":1130,"jaar":"2015","code_olod":"4411PR","ROWID":"45414603","klas":"1TINB","olod":".Net Essentials - PR (2TIN P2)","code_docent":"KrRe","docent":"Krekels Reinaut"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"24\/04\/15","datum2":"150424","van_uur":930,"tot_uur":1130,"jaar":"2015","code_olod":"4419PR","ROWID":"45414677","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"},' +
		'{"groep":"Handel","lokaal":"EB244","datum":"24\/04\/15","datum2":"150424","van_uur":1130,"tot_uur":1230,"jaar":"2015","code_olod":"4419PR","ROWID":"45414679","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"},' +
		'{"groep":"Handel","lokaal":"EB241","datum":"24\/04\/15","datum2":"150424","van_uur":930,"tot_uur":1130,"jaar":"2015","code_olod":"4419PR","ROWID":"46240038","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"},' +
		'{"groep":"Handel","lokaal":"EB244","datum":"24\/04\/15","datum2":"150424","van_uur":1130,"tot_uur":1230,"jaar":"2015","code_olod":"4419PR","ROWID":"46240040","klas":"1TINB","olod":"Communication skills 1 - PR (2TIN P2)","code_docent":"SlKi","docent":"Sleurs Kim"}]');
}