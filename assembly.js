// numer zadania       [name="select_task"]:checked
// init_show_assembly()
var n = 4;
var maximumNumberOfSteps = 10000;
var boxes = [];
var names = [];
var instructions = [];
var prevStep;
var nextStep;
var boxToRead = -1;
var console_text = "";
var isMobile = false;
var timeoutId = 0;
var intervalId = 1;
var linesInSelect = 1;
var lastCodeSaved = '';

var failedTest = 0;
var testInputs, testInputIndex, testOutput, testStatus;

var testedProgramURL = "";
var assembly_byl_uruchomiony_i_zakonczony = false;
var assembly_byl_uruchomiony_i_zakonczony_kod = '';

var assembly_show_only = false;

const Messages = {
	NONE : 0,
	INPUT : 1,
	OUTPUT: 2,
	WAIT: 3
};
var last_message = Messages.NONE;

var param = parse_params(window.location.search.substr(1));

// BEGIN: OPERACJE JĘZYKA ASSEMBLU:
String.prototype.toNum = function(){
	return parseInt(this, 10);
}

function PrintBox(index, box) {
	this.index = index;
	this.box = box;
}
 
PrintBox.prototype.execute = function() {
	print(boxes[this.box], Messages.OUTPUT);
};

PrintBox.prototype.execute_test = function() {
	testOutput += boxes[this.box];
	print(boxes[this.box], Messages.OUTPUT);
};

PrintBox.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=pbox");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	return ret;
};

PrintBox.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor print-box">'
			+ '<strong>'
				+ 'Wypisz pudełko '
				+ getSelectBox(this.box)
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "none");
};

PrintBox.prototype.highlight = function() {}

function PrintStr(index, string) {
	this.index = index;
	this.string = string;
}

PrintStr.prototype.execute = function() {
	print(this.string, Messages.OUTPUT);
};

PrintStr.prototype.execute_test = function() {
	testOutput += this.string;
	print(this.string, Messages.OUTPUT);
};

PrintStr.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=pstr");
	ret.push("i" + this.index + "_s=" + encodeURIComponent(this.string));
	return ret;
};

PrintStr.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor print-string">'
			+ '<strong>'
				+ 'Wypisz napis '
				+ '<input type="text" class="input-data keyboard-ipad form-control" value="' + this.string +'">'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "iPad");
};

PrintStr.prototype.highlight = function() {}

function PrintLn(index) {
	this.index = index;
}

PrintLn.prototype.execute = function() {
	print('<br>&#8203;', Messages.OUTPUT); // Zero-width space
};

PrintLn.prototype.execute_test = function() {
	testOutput += '\n';
	print('<br>&#8203;', Messages.OUTPUT); // Zero-width space
};

PrintLn.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=pln");
	return ret;
};

PrintLn.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor println">'
			+ '<strong>'
				+ 'Przejdź do nowej linii'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "none");
};

PrintLn.prototype.highlight = function() {}

function Read(index, box) {
	this.index = index;
	this.box = box;
}

Read.prototype.execute = function() {
	clearTimeout(timeoutId);
	clearInterval(intervalId);
	boxToRead = this.box;
	print('', Messages.WAIT);
	switchInstrClass(nextStep, "list-group-item-success", "ui-state-default");
	$("#assembly_readInput").show().getkeyboard().reveal();
	$("#assembly_step").hide();
	$("#assembly_send").show();
};

Read.prototype.execute_test = function() {
	testOutput += '? ';
	if (testInputIndex < testInputs.length) {
		testOutput += testInputs[testInputIndex];
		testOutput += '\n';
		boxes[this.box] = testInputs[testInputIndex].toNum();
		++testInputIndex;
		print(boxes[this.box], Messages.INPUT);
	} else {
		testStatus = "ein" //end of input
	}
};

Read.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=read");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	return ret;
};

Read.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor read">'
			+ '<strong>'
				+ 'Wczytaj do '
				+ getSelectBox(this.box)
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "none");
};

Read.prototype.highlight = function() {}

//sprawdzenie i przypisanie wczytanej wartosci
function afterRead() {
	if (!$("#assembly_readInput").val()) {
		$("#assembly_alertRead").show();
		$("#assembly_readInput").getkeyboard().reveal();
	} else {
		$("#assembly_send").hide();
		$("#assembly_step").show();
		$("#assembly_alertRead").hide();
		$("#assembly_readInput").hide();
		switchInstrClass(nextStep, "ui-state-default", "list-group-item-info");
		boxes[boxToRead] = $("#assembly_readInput").val().toNum();
		print(boxes[boxToRead], Messages.INPUT);
		$("#assembly_box_" + boxToRead).text(names[boxToRead] + boxes[boxToRead]);
		boxToRead = -1;
		$("#assembly_readInput").val("");
		prevStep = nextStep++;
		if (nextStep == instructions.length) {
			stopProgram();
		}
		refreshFocus();
		refreshConsole();
	}
}

function Set(index, box, inputVal) {
	this.index = index;
	this.box = box;
	this.inputVal = inputVal;
}

Set.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=set");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	ret.push("i" + this.index + "_in=" + encodeURIComponent(this.inputVal));
	return ret;
};

Set.prototype.execute = function() {
	boxes[this.box] = convertInputToInt(this.inputVal);
	$("#assembly_box_" + this.box).text(names[this.box] + boxes[this.box]);
};

Set.prototype.execute_test = function() {
	boxes[this.box] = convertInputToInt(this.inputVal)
};

Set.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor set">'
			+ '<strong>'
				+ 'Ustaw '
				+ getSelectBox(this.box)
				+ ' na '
				+ '<input type="text" class="input-data keyboard-num form-control" value="' + this.inputVal +'">'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "num");
};

Set.prototype.highlight = function() {}

function Decrease(index, box, inputVal) {
	this.index = index;
	this.box = box;
	this.inputVal = inputVal;
}

Decrease.prototype.execute = function() {
	boxes[this.box] -= convertInputToInt(this.inputVal);
	$("#assembly_box_" + this.box).text(names[this.box] + boxes[this.box]);
};

Decrease.prototype.execute_test = function() {
	boxes[this.box] -= convertInputToInt(this.inputVal)
};

Decrease.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=dec");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	ret.push("i" + this.index + "_in=" + encodeURIComponent(this.inputVal));
	return ret;
};

Decrease.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor decrease">'
			+ '<strong>'
				+ 'Zmniejsz '
				+ getSelectBox(this.box)
				+ ' o '
				+ '<input type="text" class="input-data keyboard-num form-control" value="' + this.inputVal +'">'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "num");
};

Decrease.prototype.highlight = function() {}

function Increase(index, box, inputVal) {
	this.index = index;
	this.box = box;
	this.inputVal = inputVal;
}

Increase.prototype.execute = function() {
	boxes[this.box] += convertInputToInt(this.inputVal);
	$("#assembly_box_" + this.box).text(names[this.box] + boxes[this.box]);
};

Increase.prototype.execute_test = function() {
	boxes[this.box] += convertInputToInt(this.inputVal)
};

Increase.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=inc");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	ret.push("i" + this.index + "_in=" + encodeURIComponent(this.inputVal));
	return ret;
};

Increase.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor increase">'
			+ '<strong>'
				+ 'Zwiększ '
				+ getSelectBox(this.box)
				+ ' o '
				+ '<input type="text" class="input-data keyboard-num form-control" value="' + this.inputVal +'">'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "num");
};

Increase.prototype.highlight = function() {}

function IfThenElse(index, box, sign, lines, inputVal, jumpForSuccess, jumpForFailure) {
	this.index = index;
	this.box = box;
	this.sign = sign;
	this.lines = lines;
	this.inputVal = inputVal;
	this.jumpForSuccess = jumpForSuccess;
	this.jumpForFailure = jumpForFailure;
}

IfThenElse.prototype.fulfilled = function() {
	value = convertInputToInt(this.inputVal);
	switch(this.sign) {
		case 0:
			return boxes[this.box] < value;
		case 1:
			return boxes[this.box] <= value;
		case 2:
			return boxes[this.box] == value;
		case 3:
			return boxes[this.box] != value;
		case 4:
			return boxes[this.box] >= value;
		case 5:
			return boxes[this.box] > value;
	}
}

IfThenElse.prototype.execute = function() {
	if (this.fulfilled()) {
		if (this.jumpForSuccess != 'n') {
			nextStep = this.jumpForSuccess - 1;
		}
	} else {
		if (this.jumpForFailure != 'n') {
			nextStep = this.jumpForFailure - 1;
		}
	}
	
	$('.selected-jumper').removeClass('selected-jumper');
}

IfThenElse.prototype.execute_test = IfThenElse.prototype.execute;

IfThenElse.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=if");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	ret.push("i" + this.index + "_s=" + encodeURIComponent(this.sign));
	ret.push("i" + this.index + "_in=" + encodeURIComponent(this.inputVal));
	ret.push("i" + this.index + "_ls=" + encodeURIComponent(this.jumpForSuccess));
	ret.push("i" + this.index + "_lf=" + encodeURIComponent(this.jumpForFailure));
	return ret;
};

IfThenElse.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor if">'
			+ '<strong style=" display: inline-block;">'
				+ 'Jeżeli '
				+ getSelectBox(this.box)
				+ ' '
				+ getSelectSign(this.sign)
				+ ' '
				+ '<input type="text" class="input-data keyboard-num form-control" value="' + this.inputVal +'">'
			+ '</strong>'
			+ ' '
			+ '<strong style=" display: inline-block;">'
				+ 'skocz do '
				+ getSelectLine(this.jumpForSuccess, this.lines, true)
			+ '</strong>'
			+ ' '
			+ '<strong style=" display: inline-block;">'
				+ 'inaczej skocz do '
				+ getSelectLine(this.jumpForFailure, this.lines, true)
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "num");
};

IfThenElse.prototype.highlight = function() {
	if (this.fulfilled()) {
		$($($('#assembly_editor li')[nextStep]).find('.select-line')[0]).addClass('selected-jumper');
	} else {
		$($($('#assembly_editor li')[nextStep]).find('.select-line')[1]).addClass('selected-jumper');
	}
}

function GoTo(index, jump, lines) {
	this.index = index;
	this.jump = jump;
	this.lines = lines;
}

GoTo.prototype.execute = function() {
	nextStep = this.jump - 1;
};

GoTo.prototype.execute_test = GoTo.prototype.execute;

GoTo.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=goto");
	ret.push("i" + this.index + "_j=" + encodeURIComponent(this.jump));
	return ret;
};

GoTo.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor goto">'
			+ '<strong>'
				+ 'Skocz do '
				+ getSelectLine(this.jump, this.lines, false)
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "none");
};

GoTo.prototype.highlight = function() {}

function PrintSymbol(index, box) {
	this.index = index;
	this.box = box;
}

PrintSymbol.prototype.execute = function() {
	var ret = String.fromCharCode(boxes[this.box]);
	print(ret, Messages.OUTPUT);
}

PrintSymbol.prototype.execute_test = function() {
	testOutput += String.fromCharCode(boxes[this.box]);
	var ret = String.fromCharCode(boxes[this.box]);
	print(ret, Messages.OUTPUT);
};

PrintSymbol.prototype.toURL = function() {
	var ret = [];
	ret.push("i" + this.index + "_t=psym");
	ret.push("i" + this.index + "_b=" + encodeURIComponent(this.box));
	return ret;
}

PrintSymbol.prototype.toHTML = function() {
	var instr = '<li class="list-group-item list-group-item-info pointer on-editor print-symbol">'
			+ '<strong>'
				+ 'Wypisz pudełko '
				+ getSelectBox(this.box)
				+ '<span> jako symbol </span>'
			+ '</strong>'
		+ '</li>';

	addInstr(instr, this.index + 1, "symbol");
};

PrintSymbol.prototype.highlight = function() {}
//END: OPERACJE JĘZYKA ASSEMBLU


function addInstr(instr, badgeNum, keyboard) {
	instr = $(instr);
	if (keyboard == "iPad") {
		addKeyIpad(instr);
	}
	if (keyboard == "num") {
		addKeyNum(instr);
	}
	if (keyboard == "symbol") {
		addKeySymbol(instr);
	}
	addCross(instr);
	instr.append('<span class="badge marg">' + badgeNum + '</span>')
	$("#assembly_editor").append(instr);
}

function addCross(instr) {
	var cross = $('<div type="button" class="close delete-instr marg">'
			+ '<span>&emsp;</span><span aria-hidden="true" class="glyphicon glyphicon-remove"></span></div>');
	cross.on("click", function(){
		instr.remove();
		mappingLines = refreshBadges();
		refreshLines(mappingLines);
	});
	instr.append(cross);
}

function getSelectLine(selected, all, visibleNext) {
	var ret = '<select class="select-line form-control form-control-inline">';
	if (visibleNext) {
		ret += '<option ';
		if ('n' == selected) {
			ret += 'selected ';
		}
		ret += 'value="n">następnej</option>';
	}
	for (var i = 0; i < all; ++i) {
		ret += '<option ';
		if (i == selected) {
			ret += 'selected ';
		}
		ret += 'value="' + i + '">' + (i+1) + '</option>';
	}
	ret += '<option ';
	if (all == selected) {
		ret += 'selected ';
	}
	ret += 'value="' + all + '">końca</option>';
	ret += '</select>';
	return ret;
}

function getSelectSign(selected) {
	var ret = '<select class="select-sign form-control form-control-inline">';
	var signs = ['&lt;', '&le;', '=', '&ne;', '&ge;', '&gt;'];
	for (var i = 0; i < signs.length; ++i) {
		ret += '<option ';
		if (i == selected) {
			ret += 'selected ';
		}
		ret += 'value="' + i + '">' + signs[i] + '</option>';
	}
	ret += '</select>';
	return ret;
}

function getSelectBox(selected) {
	var ret = '<select class="select-box form-control form-control-inline">';
	for (var i = 0; i < n; ++i) {
		ret += '<option ';
		if (i == selected) {
			ret += 'selected ';
		}
		ret += 'value="' + i + '">' + String.fromCharCode(65 + i) + '</option>';
	}
	ret += '</select>';
	return ret;
}

//instrukcja wypisania na konsole
function print(value, type) {
	if (last_message != Messages.NONE) {
		console_text = console_text.substr(0, console_text.length - 12); // </div></div>
	}
	switch (type) {
		case Messages.OUTPUT:
			if (last_message != Messages.OUTPUT) {
				if (last_message != Messages.NONE) {
					console_text += '</div></div>';
				}
				console_text += '<div class="yours messages"><div class="message last">';
			}
			break;
		case Messages.INPUT:
			if (last_message != Messages.WAIT) {
				if (last_message != Messages.NONE) {
					console_text += '</div></div>';
				}
				console_text += '<div class="mine messages"><div class="message last">';
			}
			break;
		case Messages.WAIT:
			if (last_message != Messages.NONE) {
				console_text += '</div></div>';
			}
			console_text += '<div class="mine messages"><div class="message last">';
			break;
		default:
			break;
	}
	last_message = type;
	console_text += value;
	console_text += '</div></div>';
}

function update_task_content(task) {
	var html = '<div class="tresc">' + task.Tresc + '</div>\n';

	task['examples'].forEach(function(example, index) {
		html += '<div class="przyklad">';
		html += '<h3>Przyklad ' + String(index + 1) + '</h3>';
		html += example.zawartosc;

		if (task.is_nianiolang) {
			html += '<pre>\n' + example.kod + '\n</pre>';
		} else {
			html += '<pre><div class="chat">' + convert_console_output(example.kod) + '</div></pre>';
		}

		html += '</div>';
	});

	task.Tresc = html;

	return task;
}

function convert_console_output(console_output) {
	output_lines = console_output.split(/\r\n/);
	var input_regex = /\? (\d)+$/;
	last_message = Messages.NONE;
	console_text = '';
	for (var i = 0; i < output_lines.length; ++i) {
		var input = output_lines[i].match(input_regex);
		var output = output_lines[i].replace(input_regex, '');
		if (output.length != 0) {
			print(output + '<br>', Messages.OUTPUT);
		}
		if (input != null) {
			print(input[0].substr(2), Messages.INPUT);
		}
	}
	return console_text;
}

function convertInputToInt(inputVal) {
	if (isNaN(inputVal)) {
		return boxes[inputVal.charCodeAt(0)-65];
	} else {
		return inputVal.toNum();
	}
}

function initBoxes() {
	for (var i = 0; i < n; ++i) {
		boxes[i] = 0;
	}
	var charCodeRange = {
		start: 65,
		end: 90
	}
	for (var cc = charCodeRange.start; cc <= charCodeRange.end; cc++) {
		names[cc - charCodeRange.start] = String.fromCharCode(cc) + ": ";
	}
	//aktualizacja wartosci pudelek
	for (var i = 0; i < n; ++i) {
		$("#assembly_box_" + i).text(names[i] + boxes[i]);
	}
}

//zmienia klase wybranej instrukcji
function switchInstrClass(index, oldClass, newClass) {
	if (index < $("#assembly_editor li").size()) {
		$("#assembly_editor li").eq(index).switchClass(oldClass, newClass, 0);
	}
}

//podswietlenie nastepnej instrukcji w edytorze
function refreshFocus() {
	switchInstrClass(prevStep, "list-group-item-success", "list-group-item-info");
	switchInstrClass(nextStep, "list-group-item-info", "list-group-item-success");
	if (nextStep < instructions.length) {
		instructions[nextStep].highlight();
	}
}

//aktualizacja numerow linii w badgach i zwraca mapowanie lini
function refreshBadges() {
	if (isNaN(linesInSelect)) {
		linesInSelect = 0;
	}
	var mappingLines = {'n' : 'n'};
	mappingLines['' + linesInSelect] = $("#assembly_editor li").length;
	mappingLines['' + (linesInSelect - 1)] = $("#assembly_editor li").length;
	if (mappingLines['' + linesInSelect] < linesInSelect) {
		for (var i = 1; i < linesInSelect - 1; i++) {
			mappingLines['' + i] = i;
		}
	}
	$("#assembly_editor li").each(function(index) {
		mappingLines['' + ($(this).find(".badge").text().toNum() - 1)] = index ;
		$(this).find(".badge").text(index + 1);
	});
	return mappingLines;
}

//aktualizacja mozliwosci skoku w goto i if, osraz ustawia zaznaczone wartości
function refreshLines(mappingLines) {
	var last = linesInSelect;
	var editorSize = $("#assembly_editor li").size();
	var added = last < editorSize && last > 0;
	var disappeared = last > editorSize && editorSize > 0;
	
	$(".select-line").each(function() {
		var newValue = mappingLines[this.value];
		if (added) {
			$(this).children().last().before($("<option/>", {
				value: last ,
				text: last + 1
			}));
		}
		
		if (disappeared) {
			$(this).children()[$(this).children().length - 2].remove();
		}
		$(this).children().last().val(editorSize);
		$(this).val(newValue);
	});
	linesInSelect = editorSize;
}

function refreshConsole() {
	$("#assembly_console").html('<h4>' + console_text + '<h4>');
	$('#assembly_console').find('div:last').append('<span style="background-color: gray">&nbsp</span></h>');
	$('#assembly_console').scrollTop($('#assembly_console')[0].scrollHeight);
}

//wykonanie jednej, odpowieniej instrukcji
function executeStep() {
	prevStep = nextStep;
	instructions[nextStep].execute();
	if (boxToRead == -1) {
		++nextStep;
		refreshFocus();
		if (nextStep >= instructions.length) {
			clearTimeout(timeoutId);
			clearInterval(intervalId);
			stopProgram();
		}
	}
	refreshConsole();
}

function setErrorsOnEmptyInputs(typeOfInput) {
	var ret = true;
	$("." + typeOfInput).each(function(index) {
		$(this).removeClass("input-error");
	});
	$("." + typeOfInput + ":visible").each(function(index) {
		if (!$(this).val()) {
			$(this).addClass("input-error");
			$(this).change(function() {
				if (!(!$(this).val())) {
					$(this).removeClass("input-error");
				}
			});
			ret = false;
		}
	});
	return ret;
}

//sprawdzenie poprawnosci instruckji w edytorze - czy wszystkie inputy w kodzie sa wypelnione
function validateInstr() {
	var ret = true;
	if (!setErrorsOnEmptyInputs("input-data")) ret = false;
	if (!setErrorsOnEmptyInputs("select-line")) ret = false;
	
	if (ret) {
		$("#assembly_alertEditor").hide();
	} else {
		$("#assembly_alertEditor").show();
	}
	if ($("#assembly_editor li").size() == 0) {
		$("#assembly_alertEmpty").show();
		return false;
	} else {
		$("#assembly_alertEmpty").hide();
	}
	return ret;
}

function parseAllInstr() {
	instructions = [];
	var lines = $("#assembly_editor li").size();
	$("#assembly_editor li").each(function(index) {
		if ($(this).hasClass("print-string")) {
			instructions[index] = new PrintStr(index, $(this).find(".input-data").val());
		} else if ($(this).hasClass("println")) {
			instructions[index] = new PrintLn(index);
		} else {
			var box = $(this).find(".select-box").val();
			if ($(this).hasClass("print-box")) {
				instructions[index] = new PrintBox(index, box);
			} else if ($(this).hasClass("print-symbol")) {
				instructions[index] = new PrintSymbol(index, box);
			} else if ($(this).hasClass("read")) {
				instructions[index] = new Read(index, box);
			} else if ($(this).hasClass("goto")) {
				var jump = $(this).find(".select-line").val().toNum();
				instructions[index] = new GoTo(index, jump, lines);
			} else {
				var inputVal = $(this).find(".keyboard-num").val();
				if ($(this).hasClass("set")) {
					instructions[index] = new Set(index, box, inputVal);
				} else if ($(this).hasClass("increase")) {
					instructions[index] = new Increase(index, box, inputVal);
				} else if ($(this).hasClass("decrease")) {
					instructions[index] = new Decrease(index, box, inputVal);
				} else if ($(this).hasClass("if")) {
					var sign = $(this).find(".select-sign").val().toNum();
					var jumpForSuccess = checkLine($(this).find('.select-line')[0].value, lines + 1);
					var jumpForFailure = checkLine($(this).find('.select-line')[1].value, lines + 1);
					instructions[index] = new IfThenElse(index, box, sign, lines, inputVal, jumpForSuccess, jumpForFailure);
				}
			}
		}
	});
}

function convertProgramtoToURL() {
	parseAllInstr();
	var ret = [];
	ret.push("i_len=" + instructions.length);
	for (var i = 0; i < instructions.length; ++i) {
		ret = ret.concat(instructions[i].toURL());
	}
	return ret.join("&");
}

function get_code_block() {
	return convertProgramtoToURL();
}

function getParamVal(params, key) {
	if (key in params) {
		return params[key];
	} else {
		return "";
	}
}

function checkLen(len) {
	if (isNaN(len)) {
		return 0;
	}
	return len.toNum();
}

function checkNum(num, to) {
	if (isNaN(num) || num < 0 || num >= to) {
		return 0;
	}
	return num.toNum();
}

function checkBox(box) {
	return checkNum(box, n);
}

function checkSign(sign) {
	return checkNum(sign, 6);
}

function checkLine(line, to) {
	if (isNaN(line) || line == 'n' || line < 0 || line >= to) {
		return 'n';
	}
	return line.toNum();
}

function checkInput(input) {
	if (isNaN(input) && (input.length > 1 || input.charCodeAt(0) - 65 < 0 || input.charCodeAt(0) - 65 >= n)) {
		return "";
	}
	return input;
}

function checkSymbol(symbol) {
	if (symbol.length != 1) {
		return '*';
	}
	return symbol;
}

function parse_params(param) {
	var params = {}; 
	if (param != null) {
		param.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
			params[decodeURIComponent(key)] = decodeURIComponent(value);
		});
	}
	return params;
}

function set_code_block(param) {
	var task = parseInt($('[name="select_task"]:checked').val());
	if (task >= 1) {
		lastCodeSaved = task+";"+param;
	}
	instructions = [];
	var params = parse_params(param);
	var len = checkLen(getParamVal(params, "i_len"));

	for (var i = 0; i < len; ++i) {
		var pref = "i" + i + "_";
		var type = getParamVal(params, pref + "t");
		if (type == "pbox") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new PrintBox(i, checkBox(box)));
		}
		if (type == "pstr") {
			var string = getParamVal(params, pref + "s");
			instructions.push(new PrintStr(i, string));
		}
		if (type == "pln") {
			instructions.push(new PrintLn(i));
		}
		if (type == "read") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new Read(i, checkBox(box)));
		}
		if (type == "set") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Set(i, checkBox(box), checkInput(input)));
		}
		if (type == "inc") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Increase(i, checkBox(box), checkInput(input)));
		}
		if (type == "dec") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Decrease(i, checkBox(box), checkInput(input)));
		}
		if (type == "if") {
			var box = getParamVal(params, pref + "b");
			var sign = getParamVal(params, pref + "s");
			var input = getParamVal(params, pref + "in");
			var jumpForSuccess = getParamVal(params, pref + "ls");
			var jumpForFailure = getParamVal(params, pref + "lf");
			if (jumpForFailure == '')
				jumpForFailure = '' + (i + 2);
			instructions.push(new IfThenElse(i, checkBox(box), checkSign(sign), len,
				checkInput(input), checkLine(jumpForSuccess,len + 1), checkLine(jumpForFailure,len + 1)));
		}
		if (type == "goto") {
			var jump = getParamVal(params, pref + "j");
			instructions.push(new GoTo(i, checkNum(jump, len + 1), len));
		}
		if (type == "psym") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new PrintSymbol(i, checkBox(box)));
		}
	}
	linesInSelect = len;
	showInstr();
	updatePanel();
}

function updatePanel() {
	$("#assembly_instructions .select-line").each(function() {
		$(this).find('option:not(:contains(końca)):not(:contains(następnej))').remove();
		for (var i = 0; i < (linesInSelect || 1); ++i) {
			$(this).children().last().before($("<option/>", {
				value: i ,
				text: i + 1
			}));
		}
		$(this).children().last().val(linesInSelect);
	});
}

function showInstr() {
	for (var i = 0; i < instructions.length; ++i) {
		instructions[i].toHTML();
	}
}

//uruchomienie walidacji instrukcji i programu
function runProgram() {
	$("#assembly_alertInfo").hide();
	if (validateInstr()) {
		$("#assembly_editor").sortable("disable");
		$("#assembly_instrPreview").hide();
		$("#assembly_consolePreview").show();
		prevStep = 0;
		nextStep = 0;
		boxToRead = -1;
		console_text = '';
		last_message = Messages.NONE;
		$("#assembly_runMe").hide();
		$("#assembly_edit").show();
		$("#assembly_step").show();
		initBoxes();
		parseAllInstr();
		refreshFocus();
		$("#assembly_editor li").each(function(index) {
			$(this).find(".form-control").attr('disabled', true);
			$(this).removeClass("pointer");
			$(this).find(".delete-instr").hide();
		});
		$("#assembly_firstCol").show();
		$("#assembly_secondCol").switchClass("col-sm-8", "col-sm-6", 0);
		$("#assembly_thirdCol").switchClass("col-sm-4", "col-sm-3", 0);
		$("#assembly_runMe").switchClass("lg", "sm", 0);
		$("#assembly_edit").switchClass("lg", "sm", 0);
		$("#assembly_btn_start_test").switchClass("lg", "sm", 0);
		$("#assembly_toLesson").switchClass("lg", "sm", 0);
		$("#assembly_rejectSolution").switchClass("lg", "sm", 0);
		$("#assembly_acceptSolution").switchClass("lg", "sm", 0);
		$("#urlModal").switchClass("lg", "sm", 0);
	}
}

//przywrocenie domyslnego stanu programu
function resetProgram() {
	$("#assembly_editor").sortable("enable");
	$("#assembly_consolePreview").hide();
	$("#assembly_instrPreview").show();
	$("#assembly_alertRead").hide();
	$("#assembly_readInput").val("").hide();
	$("#assembly_alertOK").hide();
	$("#assembly_nie_uruchomiony_przed_testem").hide();
	switchInstrClass(nextStep, "list-group-item-success", "list-group-item-info");
	switchInstrClass(nextStep, "ui-state-default", "list-group-item-info");
	$('.selected-jumper').removeClass('selected-jumper');
	initBoxes();
	console_text = '';
	last_message = Messages.NONE;
	refreshConsole();
	$("#assembly_edit").hide();
	$("#assembly_runMe").show();
	$("#assembly_step")
		.attr('disabled', false)
		.hide();
	$("#assembly_send").hide();
	$("#assembly_editor li").each(function(index) {
		$(this).find(".form-control").attr('disabled', false);
		$(this).addClass("pointer");
		$(this).find(".delete-instr").show();
	});
	$("#assembly_firstCol").hide();
	$("#assembly_secondCol").switchClass("col-sm-6", "col-sm-8", 0);
	$("#assembly_thirdCol").switchClass("col-sm-3", "col-sm-4", 0);
	$("#assembly_runMe").switchClass("sm", "lg", 0);
	$("#assembly_edit").switchClass("sm", "lg", 0);
	$("#urlModal").switchClass("sm", "lg", 0);
}

//wywolywane po zakonczeniu sie programu
function stopProgram() {
	$("#assembly_alertOK").show();
	$("#assembly_step").attr('disabled', true);
	assembly_byl_uruchomiony_i_zakonczony = true;
	assembly_byl_uruchomiony_i_zakonczony_kod = get_code_block();
}

function convertOutputToTable(out) {
	return out.replace(/(\n)/g, '<br />');
}

function runTest(output, correctBoxes) {
	var numberOfSteps = 0;
	prevStep = 0;
	nextStep = 0;
	initBoxes();
	testInputs = getInputs(output);
	testInputIndex = 0;
	testOutput = "";
	testStatus = "run";
	console_text = "";
	last_message = Messages.NONE;
	while (testStatus == "run") {
		prevStep = nextStep;
		instructions[nextStep].execute_test();
		++nextStep;
		++numberOfSteps;
		if (nextStep >= instructions.length) {
			if (testStatus == "run") {
				output = output.replace(/\r/g, '');
				testStatus = "ok";
				if (testOutput != output)
					testStatus = "wa";
				else {
					for (var i = 0; i < n; i++) {
						if (correctBoxes[i].check && boxes[i] != correctBoxes[i].value)
							testStatus = "wa";
					}
				}
			}
		}
		if (numberOfSteps > maximumNumberOfSteps)
			testStatus = "tle";
	}
	return {'status' : testStatus, 'numberOfSteps' : numberOfSteps};
}

function getInputs(data) {
	var result = [];
	var regexInput = /[\?][\ ]([0-9]+)/gi;
	while (match = regexInput.exec(data)) {
		result.push(match[1]);
	}
	return result;
}
			
function addKeyNum(instr) {
	instr.find(".keyboard-num")
		.keyboard({ 
			display: {
				'bksp' : '\u2190'
			},	
			layout: 'custom', 
			customLayout: { 
				'default' : [
				'A 7 8 9', 
				'B 4 5 6', 
				'C 1 2 3', 
				'D {bksp} 0 {a}' 
				] 
			}, 
			maxLength : 6, 
			autoAccept : true,
			lockInput : isMobile,
			restrictInput : true, // Prevent keys not in the displayed keyboard from being typed in 
		});
}

function addKeyIpad(instr) {
	instr.find(".keyboard-ipad")
		.keyboard({ 
			display: {
				'bksp'   :  "\u2190",
				'default': 'ABC',
				'meta1'  : '.?123',
				'meta2'  : '#+='
			},

			layout: 'custom',
			customLayout: {
				'default': [
					'q w e r t y u i o p {bksp}',
					'a s d f g h j k l',
					'{s} z x c v b n m , . {s}',
					'{meta1} {space} {a}'
				],
				'shift': [
					'Q W E R T Y U I O P {bksp}',
					'A S D F G H J K L',
					'{s} Z X C V B N M ! ? {s}',
					'{meta1} {space} {a}'
				],
				'meta1': [
					'1 2 3 4 5 6 7 8 9 0 {bksp}',
					'- / : ; ( ) \u20ac & @',
					'{meta2} . , ? ! \' " {meta2}',
					'{default} {space} {a}'
				],
				'meta2': [
					'[ ] { } # % ^ * + = {bksp}',
					'_ \\ | ~ < > $ \u00a3 \u00a5',
					'{meta1} . , ? ! \' " {meta1}',
					'{default} {space} {a}'
				]
			},
			lockInput : isMobile,
			autoAccept : true,
		});
}

function addKeySymbol(instr) {
	instr.find(".keyboard-symbol")
		.keyboard({ 
			display: {
				'bksp' : '\u2190'
			},	
			layout: 'custom', 
			customLayout: { 
				'default' : [
				'! @ # $ % ^', 
				'& * ( ) - _', 
				'= + / [ ] ;',
				': " < > , .',
				'{bksp} { ? } \u2665 {a}' 
				] 
			}, 
			maxLength : 1, 
			autoAccept : true,
			lockInput : isMobile,
		});
}

function adjustInstr(instr) {
	instr.find(":hidden").show();
	addCross(instr);
	instr
		.removeClass("ui-state-default")
		.append('<span class="badge marg"></span>')
		.addClass("list-group-item-info")
		.addClass("on-editor");

	//podpiecie klawiatury ekranowej
	addKeyNum(instr);
	addKeyIpad(instr);
	addKeySymbol(instr);	
}

function confirmExit() {
	var task = parseInt($('[name="select_task"]:checked').val());
	if (task < 1) return;
	if (task+";"+get_code_block() != lastCodeSaved) {
		return "Program nie został zapisany, powróć do lekcji a program sam się zapisze.";
	}
}


function load_code() {
	resetProgram();
	$(".list-group-item-info").remove();
	editor_get_code('block', 0, function (data) {set_code_block(data);});
}

function load_task_preview() {
	let id = parseInt($('[name="select_task"]:checked').val());
	if (baza_zadan[id] != undefined) {
		$("#assembly_task_title").html(baza_zadan[id].Tytul);
		$("#assembly_task_save_title").html(baza_zadan[id].Tytul);
		$("#assembly_task_content").html(baza_zadan[id].Tresc);
		$(".panel-task-button").css("display", "inline-block");
		if (is_teacher && baza_zadan[id].jest_wzorcowe) {
			$(".panel-solution-button").css("display", "inline-block");
		} else {
			$(".panel-solution-button").css("display", "none");
		}
		if (is_admin) {
			$(".panel-save-button").css("display", "inline-block");
		}
	} else {
		$.getJSON(
			'handlers/get_task.php?id='+id,
			function (data) {
				if (data.success) {
					baza_zadan[id] = update_task_content(data.data);
					load_task_preview();
				}
			}
		);
	}
}

function init_show_assembly() {
	assembly_byl_uruchomiony_i_zakonczony = false;
	assembly_show_only = false;
	load_code();
	load_task_preview();
	$("#view_assembly_editor").show();
	$("#assembly_btn_start_test").show();
}

function init_show_student_assembly() {
	assembly_byl_uruchomiony_i_zakonczony = false
	assembly_show_only = true;
	resetProgram();
	$(".list-group-item-info").remove();
	var code = window.location.search.substr(1);
	set_code_block(code);
	$("#view_assembly_editor").show();
	$("#assembly_alertInfo").hide();
}

function click_to_editor() {
	init_view_editor();
}

function assembly_accept_solution() {
	var solution_id = getParamVal(param, "solution_id");
	$.getJSON(
		'db/solution.php?id='+solution_id+'&action=accept',
		function (data) {
			if (data.success) {
				update_solution_state(data.data);
			}
		}
	);
}

function parseURL() {
	instructions = [];
	var params = {}; 
	location.search.substring(1).replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
		params[decodeURIComponent(key)] = decodeURIComponent(value);
	});

	var len = checkLen(getParamVal(params, "i_len"));
	testedTask = ("0"+getParamVal(params, "task")).toNum();

	for (var i = 0; i < len; ++i) {
		var pref = "i" + i + "_";
		var type = getParamVal(params, pref + "t");
		if (type == "pbox") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new PrintBox(i, checkBox(box)));
		}
		if (type == "pstr") {
			var string = getParamVal(params, pref + "s");
			instructions.push(new PrintStr(i, string));
		}
		if (type == "pln") {
			instructions.push(new PrintLn(i));
		}
		if (type == "read") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new Read(i, checkBox(box)));
		}
		if (type == "set") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Set(i, checkBox(box), checkInput(input)));
		}
		if (type == "inc") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Increase(i, checkBox(box), checkInput(input)));
		}
		if (type == "dec") {
			var box = getParamVal(params, pref + "b");
			var input = getParamVal(params, pref + "in");
			instructions.push(new Decrease(i, checkBox(box), checkInput(input)));
		}
		if (type == "if") {
			var box = getParamVal(params, pref + "b");
			var sign = getParamVal(params, pref + "s");
			var input = getParamVal(params, pref + "in");
			var jumpForSuccess = getParamVal(params, pref + "ls");
			var jumpForFailure = getParamVal(params, pref + "lf");
			if (jumpForFailure == '')
				jumpForFailure = '' + (i + 2);
			instructions.push(new IfThenElse(i, checkBox(box), checkSign(sign), len,
				checkInput(input), checkLine(jumpForSuccess,len + 1), checkLine(jumpForFailure,len + 1)));
		}
		if (type == "goto") {
			var jump = getParamVal(params, pref + "j");
			instructions.push(new GoTo(i, checkNum(jump, len + 1), len));
		}
		if (type == "psym") {
			var box = getParamVal(params, pref + "b");
			instructions.push(new PrintSymbol(i, checkBox(box)));
		}
	}
	linesInSelect = len;
	showInstr();
	updatePanel();
}

function generateURL() {
	var params = convertProgramtoToURL();
	if (testedProgramURL == params) {
		var x = Math.floor((Math.random() * 500));
		testedTask = ("" + testedTask).toNum();
		if (failedTest == 0) {
			x += 7 - ((instructions.length + testedTask + x) % 7);
		} else {
			if ((instructions.length + testedTask + x) % 7 == 0) x++;
		}
		
		params += "&task=" + testedTask + "&result=" + x;
	}
	return (location.protocol + '//' + location.host + location.pathname + "?" + params);
}

$(document).ready(function () {
	$("#assembly_editor").sortable({
		revert: 0,
		scroll: true,
		//po zmianie ukladu aktualizacja nr linii w badgach i selektorach lini (go, if)
		update: function(event, ui) {
			mappingLines = refreshBadges();
			refreshLines(mappingLines);
		}
	});
	$("#assembly_editor").droppable({
		
		drop: function(event, ui) {
			if (!($(ui.draggable).hasClass("on-editor"))) {
				adjustInstr($(ui.draggable));
			}
		}
	});
	
	$("#assembly_instructions li")
		.draggable({
			connectToSortable: "#assembly_editor",
			helper: "clone",
			revert: 0
		})
		.click(function() {
			var instr = $(this).clone();
			adjustInstr(instr);
			$("#assembly_editor").append(instr);
			mappingLines = refreshBadges();
			refreshLines(mappingLines);
		});

	initBoxes();
	$("#assembly_runMe").click(runProgram);
	$("#assembly_edit").click(resetProgram);
	$("#assembly_send").click(afterRead);
	$("#assembly_toEditor").click(click_to_editor);
	if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
		isMobile = true;
	}
	$("#assembly_readInput")
		.keyboard({
			display: {
				'bksp'   : '\u2190'
			},	
			layout: 'custom', 
			customLayout: { 
				'default' : [
				'7 8 9', 
				'4 5 6', 
				'1 2 3', 
				'{bksp} 0 {a}' 
				] 
			}, 
			maxLength : 6, 
			autoAccept : true,
			lockInput : isMobile,
			restrictInput : true, // Prevent keys not in the displayed keyboard from being typed in 
		});
	$("[data-hide]").on("click", function(){
		$(this).closest("." + $(this).attr("data-hide")).hide();
	});

	$('#assembly_step').mousedown(function() {
		if ($("#assembly_step").attr('disabled')) {
			return;
		}
		executeStep();
		clearTimeout(timeoutId);
		timeoutId = setTimeout(function() {
			clearInterval(intervalId);
			intervalId = setInterval(executeStep, 100);
		}, 500);
	}).bind('mouseup mouseleave', function() {
		clearTimeout(timeoutId);
		clearInterval(intervalId);
	});
	parseURL();
	$('#modal').on('show.bs.modal', function (e) {
		var url = generateURL();
		$("#modalBody").val(url);
		$("#shareURL").html('<div class="fb-share-button" data-href="' + url +'" data-layout="button"></div>');
		if (typeof FB !== 'undefined') {
			FB.XFBML.parse(document.getElementById('shareURL'));
		}

		setTimeout(function() {
			$('#modalBody').select();
		}, 250);
	});
	$('#modalToTest').on('show.bs.modal', function (e) {
		$("#programCorrect").hide();
		$("#programIncorrect").hide();
	});
	window.onbeforeunload = confirmExit;
})
