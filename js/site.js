"use strict";

var baseUrl = "http://localhost/pxl-api-opendata/v1/" /*"http://data.pxl.be/roosters/v1/"*/;
var templates = {};

var classes;
var roster;

var ScreensEnum = Object.freeze({CLASSLIST : 0, ROSTER : 1, ROSTER_TABBED : 2});
var currentScreen;

var tabbedRosterMinSize = 600;

$(document).ready(function() {
	compileTemplates();

	$(".button-collapse").sideNav();

	getClasses();
});

function compileTemplates() {
	templates.classList = Handlebars.compile($("#class-template").html());
	templates.classEntry = Handlebars.compile($("#class-item-template").html());
	templates.roster = Handlebars.compile($("#roster-template").html());
	templates.rosterDay = Handlebars.compile($("#roster-day-template").html());
	templates.rosterDayHeader = Handlebars.compile($("#roster-day-header-template").html());
	templates.rosterCourse = Handlebars.compile($("#roster-course-template").html());
	templates.courseModal = Handlebars.compile($("#course-modal-template").html());
	templates.noCourseNotice = Handlebars.compile($("#no-course-notice-template").html());
	templates.rosterTabList = Handlebars.compile($("#roster-tab-list-template").html());
	templates.rosterTab = Handlebars.compile($("#roster-tab-template").html());
	templates.rosterDayTabbed = Handlebars.compile($("#roster-day-tabbed-template").html());
	templates.noConnectionNotice = Handlebars.compile($("#no-connection-notice-template").html());
	templates.loadingIndicator = Handlebars.compile($("#loading-indicator-template").html());
}

//==========Classlist==========

function createClassList(classEntries) {
	clearMain();

	currentScreen = ScreensEnum.CLASSLIST;

	insertTemplate("classList", {}, $("#main"));

	classEntries.forEach(function(entry){
		insertTemplate("classEntry", entry, $("#class-list"));
	});

	$(".class-link").on("click", getRoster);
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

//=====Miscellaneous display stuff======

function noConnectionNotice() {
	clearMain();
	insertTemplate("noConnectionNotice", {}, $("#main"));
}

function loadingIndicator() {
	//TODO(Simon): Find a way to introduce an artificial delay here
	clearMain();
	insertTemplate("loadingIndicator", {}, $("#main"));
}

function clearMain() {
	$("#main").empty();
}

//==========Roster==========

$(window).resize(function(){
	if (currentScreen !== ScreensEnum.ROSTER && currentScreen !== ScreensEnum.ROSTER_TABBED){
		return;
	}

	if (currentScreen === ScreensEnum.ROSTER) {
		if (window.matchMedia("(min-width:" + tabbedRosterMinSize + "px)").matches){
			return;
		}
		
		refreshRoster();
	}

	if (currentScreen === ScreensEnum.ROSTER_TABBED) {
		if (window.matchMedia("(max-width:" + tabbedRosterMinSize + "px)").matches){
			return;
		}

		refreshRoster();
	}
});

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

		if (text === undefined) {
			return;
		}

		if (regex.test(text.toLowerCase())){
			$(this).addClass(highlightClass);
		} else {
			$(this).removeClass(highlightClass);
		}
	});
}

function refreshRoster() {
	clearMain();

	currentScreen = ScreensEnum.ROSTER;

	insertTemplate("roster", {}, $("#main"));

	$("#roster-back-button").on("click", function() {createClassList(classes);});

	var mondayDate = Date.parseCourseDate(roster[0]).getDayInThisWeek(1);

	for (var i = 0; i < 5; i++) {
		if (window.matchMedia("(min-width:" + tabbedRosterMinSize + "px)").matches){
			insertRosterDay(mondayDate.addDays(i));
		} else {
			insertRosterDayTabbed(mondayDate.addDays(i));
		}
	}

	if (window.matchMedia("(max-width:" + tabbedRosterMinSize + "px)").matches){
		$("ul.tabs").tabs();
		currentScreen = ScreensEnum.ROSTER_TABBED;
	}

	roster.forEach(insertRosterCourse);

	insertNoticeNoCourses();

	$(".olod").on("click", expandCourse);
	$(".olod").tooltip();
}

function insertRosterCourse(course) {
	var date = Date.parseCourseDate(course);

	var columnForDate = $("#roster").children(getDayAttribute(date)).children(".row");

	//TODO(Simon): Fix display of times
	insertTemplate("rosterCourse", course, columnForDate);
}
 
function insertRosterDay(date) {
	insertTemplate("rosterDay", {"date":date.getUnixTime()}, $("#roster"));

	var columnForDate = $("#roster").children(getDayAttribute(date)).children(".row");

	insertRosterDayHeader(date, columnForDate);
}

function insertRosterDayTabbed(date) {
	var tabs = $(".tabs");
	var roster = $("#roster");

	if (!tabs.exists()) {
		insertTemplate("rosterTabList", {}, roster);
		tabs = $(".tabs");
	}

	insertTemplate("rosterTab", {"date": date.getUnixTime(), "day": date.getDayName()}, tabs);

	insertTemplate("rosterDayTabbed", {"date": date.getUnixTime()}, roster);
}

function insertRosterDayHeader(date, columnForDate) {
	insertTemplate("rosterDayHeader", {"weekday": date.getDayName()}, columnForDate);
}

function insertNoticeNoCourses() {
	var columns = $("#roster").children().children(".row");
	columns.each(function() {
		var children = $(this).children().length;
		if (children <= 1){
			insertTemplate("noCourseNotice", {}, $(this));
		}
	});
}

function getDayAttribute(date) {
	return "[data-date=" + date.getUnixTime() + "]";
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

function findWithAttr(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] === value) {
            return array[i];
        }
    }
}

Date.days = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];

Date.prototype.getUnixTime = function() { 
	//Goes from milliseconds to seconds.
	return this.getTime() / 1000 | 0;
};

Date.prototype.getDayName = function() {
	return Date.days[this.getDay()];
};

Date.prototype.getDayInThisWeek = function(dayIndex) {
	//First, subtract days to day 0, then add the day we want.
	return this.addDays(-this.getDay() + dayIndex);
};

Date.prototype.addDays = function(days){	
    var dat = new Date(this.valueOf());
    dat.setDate(dat.getDate() + days);
    return dat;
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

function getClasses() {
	var scriptUrl = baseUrl + "klassen";

	loadingIndicator();

	$.ajax({
		url: scriptUrl,
		type: 'get',
		dataType: 'html',
		async: true,
		success: function(data) {
			classes = JSON.parse(data);
			localStorage.setItem("classes", JSON.stringify(classes));
			createClassList(classes);
		},
		error: function() {
			classes = JSON.parse(localStorage.getItem("classes"));

			if (classes === "") {
				noConnectionNotice();
			} else {
				createClassList(classes);
			}
		}
	});
}

function getRoster(target) {
	var className = target.currentTarget.dataset["class"];
	//TODO(Simon): fix this once API has the option to get by date. 
	//%25 passes the procent sign, the wildcard for SQL LIKE
	var scriptUrl = baseUrl + "klassen/" + className + "/vakken/%25";
	
	loadingIndicator();

	$.ajax({
		url: scriptUrl,
		type: 'get',
		dataType: 'html',
		async: true,
		success: function(data) {
			roster = JSON.parse(data);
			roster.sort(compareCourse);
			roster = deleteDuplicateCourses(roster);

			localStorage.setItem("roster-" + className, JSON.stringify(roster));
			
			refreshRoster();
		},
		error: function() {
			roster = JSON.parse(localStorage.getItem("roster-" + className));

			if (roster === null) {
				noConnectionNotice();
			} else {
				refreshRoster();
			}
		}
	});
}