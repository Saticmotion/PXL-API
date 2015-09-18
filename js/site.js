"use strict";

var baseUrl = "http://data.pxl.be/roosters/v1/";
var templates = {};

var classes;
var currentClass;
var roster;

var ScreensEnum = Object.freeze({
	CLASSLIST : 0,
	ROSTER : 1,
	ROSTER_TABBED : 2
});
var currentScreen;

var tabbedRosterMinSize = 720;

$(document).ready(function() {
	compileTemplates();

	$(".button-collapse").sideNav();

	var fav = getFavorite();

	if (fav === null) {
		getClasses();
	} else {
		getRoster(fav);
	}
});

function compileTemplates() {
	templates.classList = Handlebars.compile($("#class-template").html());
	templates.favoritesList = Handlebars.compile($("#favorites-template").html());
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
	templates.favoriteButton = Handlebars.compile($("#favorite-button-template").html());

	$('script[type="text/x-handlebars-template"]').remove();
}

//==========Classlist==========

function createClassList(classEntries) {
	if(classEntries === undefined) {
		getClasses();
		return;
	}

	clearMain();

	currentScreen = ScreensEnum.CLASSLIST;

	var fav = getFavorite()

	//Insert our favorited class at the very top.
	if (fav !== null) {
		appendTemplate("favoritesList", {}, $("#main"));
		appendTemplate("classEntry", {"klas": fav}, $("#favorites-list"));
	}

	appendTemplate("classList", {}, $("#main"));

	classEntries.forEach(function(entry){
		appendTemplate("classEntry", entry, $("#class-list"));
	});

	$(".class-link").on("click", loadRoster);
}

$("#search").on("input", function() {
	if (currentScreen === ScreensEnum.CLASSLIST){
		var val = $(this).val();
		var matches = searchClassList(val);
		createClassList(matches);
	}
	else if (currentScreen === ScreensEnum.ROSTER ||
		currentScreen === ScreensEnum.ROSTER_TABBED) {
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

function loadRoster(target) {
	var selectedClass = target.currentTarget.dataset["class"];
	getRoster(selectedClass);
}

function refreshRoster() {
	clearMain();

	currentScreen = ScreensEnum.ROSTER;

	appendTemplate("roster", {"klas": currentClass}, $("#main"));
	insertFavoriteButton();

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

	var vanLength = course.van_uur.length;
	var totLength = course.tot_uur.length;
	var van = course.van_uur.substring(0, vanLength - 2) + ":" + course.van_uur.substring(vanLength - 2, vanLength);
	var tot = course.tot_uur.substring(0, totLength - 2) + ":" + course.tot_uur.substring(totLength - 2, totLength);

	if (van.length == 4) {
		van = "0" + van;
	}

	if (tot.length == 4) {
		tot = "0" + tot;
	}

	course.van_uur = van;
	course.tot_uur = tot;

	appendTemplate("rosterCourse", course, columnForDate);
}

function insertRosterDay(date) {
	appendTemplate("rosterDay", {"date":date.getUnixTime()}, $("#roster"));

	var columnForDate = $("#roster").children(getDayAttribute(date)).children(".row");

	insertRosterDayHeader(date, columnForDate);
}

function insertRosterDayTabbed(date) {
	var tabs = $(".tabs");
	var roster = $("#roster");

	if (!tabs.exists()) {
		appendTemplate("rosterTabList", {}, roster);
		tabs = $(".tabs");
	}

	appendTemplate("rosterTab", {"date": date.getUnixTime(), "day": date.getDayName()}, tabs);

	appendTemplate("rosterDayTabbed", {"date": date.getUnixTime()}, roster);
}

function insertRosterDayHeader(date, columnForDate) {
	appendTemplate("rosterDayHeader", {"weekday": date.getDayName()}, columnForDate);
}

function insertNoticeNoCourses() {
	var columns = $("#roster").children().children(".row");
	columns.each(function() {
		var children = $(this).children().length;
		if (children <= 1){
			appendTemplate("noCourseNotice", {}, $(this));
		}
	});
}

function getDayAttribute(date) {
	return "[data-date=" + date.getUnixTime() + "]";
}

function expandCourse() {
	var rowID = $(this).data("rowid").toString();
	var course = findWithAttr(roster, 'ROWID', rowID);

	course.weekday = Date.parseCourseDate(course).getDayName();

	$(".modal").remove();
	appendTemplate("courseModal", course, $("body"));

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
	if (parseInt(a.van_uur, 10) < parseInt(b.van_uur, 10)) {
		return -1;
	}
	if (parseInt(a.van_uur, 10) > parseInt(b.van_uur, 10)) {
		return 1;
	}
	//From here on, begin hour is equal, so compare end hour
	if (parseInt(a.tot_uur, 10) < parseInt(b.tot_uur, 10)) {
		return -1;
	}
	if (parseInt(a.tot_uur, 10) > parseInt(b.tot_uur, 10)) {
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

function filterWeek(courses) {
	var currentWeek = new Date().getWeekNumber() + 1;

	var i = courses.length
	while(i--) {
		var date = Date.parseCourseDate(courses[i]);
		if(date.getWeekNumber() != currentWeek) {
			courses.splice(i, 1)
		}
	}

	return courses;
}

//=========Favorites=========

function getFavorite() {
	return localStorage.getItem("favorited");
}

function setFavorite(favorite) {
	localStorage.setItem("favorited", favorite);
}

function removeFavorite() {
	localStorage.removeItem("favorited");
}

function insertFavoriteButton() {
	var saved = localStorage.getItem("favorited");
	var favorited = saved === currentClass;

	$("#favorite").remove();
	appendTemplate("favoriteButton", {"favorited" : favorited}, $("#roster"));

	$("#favorite .btn").on("click", function () {
		toggleFavoriteButton();
	});
}

function toggleFavoriteButton() {
	var button = $("#favorite .btn");

	//TODO(Simon): This is ugly, fix this.
	if ($(".mdi-action-favorite", button).exists()){
		removeFavorite();
		button.html('<i class="mdi-action-favorite-outline left"></i>Opslaan')
		console.log("unselect");
	} else {
		setFavorite(currentClass);
		button.html('<i class="mdi-action-favorite left"></i>Opgeslagen')
		console.log("select");
	}
}

//=====Miscellaneous display stuff======

function noConnectionNotice() {
	clearMain();
	appendTemplate("noConnectionNotice", {}, $("#main"));
}

function loadingIndicator() {
	//TODO(Simon): Find a way to introduce an artificial delay here
	clearMain();
	appendTemplate("loadingIndicator", {}, $("#main"));
}

function clearMain() {
	$("#main").empty();
}

//=========API Calls=========

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

			if (classes === null) {
				noConnectionNotice();
				$("#roster-back-button").on("click", function() {createClassList(classes);});
			} else {
				createClassList(classes);
			}
		}
	});
}

function getRoster(selectedClass) {
	currentClass = selectedClass;
	//TODO(Simon): fix this once API has the option to get by date.
	//%25 passes the procent sign, the wildcard for SQL LIKE
	var scriptUrl = baseUrl + "klassen/" + currentClass + "/rooster";

	loadingIndicator();

	$.ajax({
		url: scriptUrl,
		type: 'get',
		dataType: 'html',
		async: true,
		success: function(data) {
			roster = JSON.parse(data);
			roster.sort(compareCourse);
			roster = filterWeek(roster);
			roster = deleteDuplicateCourses(roster);

			localStorage.setItem("roster-" + currentClass, JSON.stringify(roster));

			refreshRoster();
		},
		error: function() {
			roster = JSON.parse(localStorage.getItem("roster-" + currentClass));

			if (roster === null) {
				noConnectionNotice();
				$("#roster-back-button").on("click", function() {createClassList(classes);});
			} else {
				refreshRoster();
			}
		}
	});
}

//==========Helpers==========

function prependTemplate(templateName, data, target) {
	var html = templates[templateName](data);
	target.prepend(html);
}

function appendTemplate(templateName, data, target) {
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

Date.prototype.getUnixTime = function() {
	//Goes from milliseconds to seconds.
	return this.getTime() / 1000 | 0;
};

Date.days = ['Zondag','Maandag','Dinsdag','Woensdag','Donderdag','Vrijdag','Zaterdag'];

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

Date.prototype.getWeekNumber = function(){
    var d = new Date(+this);
    d.setHours(0,0,0);
    d.setDate(d.getDate()+4-(d.getDay()||7));
    return Math.ceil((((d-new Date(d.getFullYear(),0,1))/8.64e7)+1)/7);
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
