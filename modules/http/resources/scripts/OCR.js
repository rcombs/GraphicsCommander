/*
The contents of this file may be used for any purpose, with the exception of use relating to graphics generation for live TV productions. It is otherwise exempt from the terms of the licensing agreement given in the readme file of this repository.
*/
"use strict";
var socket = io.connect();
if(typeof requestAnimationFrame == "undefined" && typeof webkitRequestAnimationFrame != "undefined"){
    window.requestAnimationFrame = webkitRequestAnimationFrame;
}

var pointMatrices = {
    7: $M([[0.5,0],[0,0.25],[1,0.25],[0.5,0.5],[0,0.75],[1,0.75],[0.5,1]])
}

var lineMatrices = {
    7: $M([[0,.5],[0,0],[1,0],[1,.5],[0,.5],[0,1],[1,1],[1,.5]])
}

var cornerColors = [];
var cornerDifferenceThreshold = 40;
var maxCornerMovement = 10;

function getDistance(point1, point2){
    return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

var Display = function(type, context, threshold){
    if([0,1,2,3,4,5,6,7].indexOf(type) == -1){
        throw new Error("Bad type!");
    }
    if(!(context instanceof CanvasRenderingContext2D)){
        throw new Error("Bad context!");
    }
    this.type = type;
    this.points = [];
    this.threshold = threshold;
    this.context = context;
};

Display.prototype.getPointValue = function(i){
    if(this.points[i] !== undefined){
        if(this.type == 3){
            return displays[this.points[i]].value;
        }else{
            return interprolatePixels(this.context.getImageData(this.points[i].x - 1, this.points[i].y - 1, 3, 3).data).bright > this.threshold;
        }
    }else{
        return false;
    }
};

Object.defineProperty(Display.prototype, "value", {
    get: function(){
        var points = [];
        if(this.type == 3){
            var str = "";
            for(var i = 0; i < this.points.length; i++){
                str += displays[this.points[i]].value;
            }
            return str;
        }
        if(this.type == 6){
            return this.points[0];
        }
        for(var i = 0; i < this.points.length; i++){
            points[i] = this.getPointValue(i);
        }
        switch(this.type){
            case 1:
                return points[0];
            case 2:
                return (points[0] && points[1]) ? "1" : "0";
            case 4:
                if(points[0]){
                    return "H";
                }else if(points[1]){
                    return "V";
                }else{
                    return "";
                }
            case 7:
                if(points == "true,true,true,false,true,true,true"){
                    return "0";
                }else if(points == "false,false,true,false,false,true,false"){
                    return "1";
                }else if(points == "true,false,true,true,true,false,true"){
                    return "2";
                }else if(points == "true,false,true,true,false,true,true"){
                    return "3";
                }else if(points == "false,true,true,true,false,true,false"){
                    return "4";
                }else if(points == "true,true,false,true,false,true,true"){
                    return "5";
                }else if(points == "true,true,false,true,true,true,true"){
                    return "6";
                }else if(points == "true,false,true,false,false,true,false"){
                    return "7";
                }else if(points == "true,true,true,true,true,true,true"){
                    return "8";
                }else if(points == "true,true,true,true,false,true,true"){
                    return "9";
                }else if(points == "true,true,true,true,false,true,false"){
                    return "9";
                }else{
                    return "0";
                }
        }
    },
    set: undefined
});

function pointArrayToMatrix(points){
    var newArr = [];
    for(var i = 0; i < points.length; i++){
        var point = points[i];
        newArr.push([point.x, point.y]);
    }
    return $M(newArr);
}

function matrixToPointArray(matrix){
    var newArr = [];
    for(var i = 0; i < matrix.rows(); i++){
        newArr.push({x: Math.round(matrix.e(i+1, 1)), y: Math.round(matrix.e(i+1, 2))});
    }
    return newArr;
}

var square = $M([[0,0], [1,0], [1,1], [0,1]]);

var displays = [];
var corners = [
    {x: 0, y: 0},
    {x: 640, y: 0},
    {x: 640, y: 480},
    {x: 0, y: 480}
];

function updateSaveFileList(selectedName){
    var optgroup = document.getElementById("files");
    optgroup.innerHTML = "";
    var saveFiles = JSON.parse(localStorage.saves);
    for(var i in saveFiles){
        var opt = document.createElement("option");
        opt.innerHTML = saveFiles[i].name;
        opt.value = i;
        if(saveFiles[i].name == selectedName){
            opt.selected = true;
        }
        optgroup.appendChild(opt);
    }
}

var rendering = false;
function saveFile(){
    var name = document.getElementById("slot").value;
    if(name == "NEW"){
        name = prompt("Name the save file.");
    }
    if(!name){
        return;
    }
    if(corners.length == 0){
        alert("Enter corners first!");
        return;
    }
    var d = [];
    var conversionMatrix = mapQuadToSquare(pointArrayToMatrix(corners));
    for(var i = 0; i < displays.length; i++){
        var x = {};
        x.type = displays[i].type;
        if(x.type == 0 || x.type == 3 || x.type == 6){
            x.points = displays[i].points;
        }else{
            x.points = perstrans(pointArrayToMatrix(displays[i].points), conversionMatrix).elements;
        }
        if(displays[i].corners){
            x.corners = perstrans(pointArrayToMatrix(displays[i].corners), conversionMatrix).elements;
        }
        x.threshold = displays[i].threshold;
        x.name = displays[i].name;
        x.fieldName = displays[i].fieldName;
        d.push(x);
    }
    var saveFiles = JSON.parse(localStorage.saves);
    var lcName = name.toLowerCase();
    saveFiles[lcName] = {name: name, displays: d};
    localStorage.saves = JSON.stringify(saveFiles);
    localStorage.lastName = name;
    updateSaveFileList(name);
}

function loadFile(){
    var name = document.getElementById("slot").value;
    if(name == "NEW"){
        alert("Please select a file.");
        return;
    }
    if(corners.length == 0){
        alert("Enter corners first!");
        return;
    }
    var j = JSON.parse(localStorage.saves);
    var displays = j[name].displays;
    var ctx = document.getElementById("canvas").getContext("2d");
    window.displays = [];
    document.getElementById("fields").innerHTML = "";
    var conversionMatrix = mapSquareToQuad(pointArrayToMatrix(corners));
    for(var i = 0; i < displays.length; i++){
        var d = new Display(displays[i].type,ctx,displays[i].threshold);
        if(d.type == 3 || d.type == 6){
            d.points = displays[i].points;
        }else{
            d.points = matrixToPointArray(perstrans($M(displays[i].points), conversionMatrix));
            d.matrixPoints = displays[i].points;
        }
        if(displays[i].corners){
            d.corners = matrixToPointArray(perstrans($M(displays[i].corners), conversionMatrix));
            d.matrixCorners = displays[i].corners;
        }
        d.name = displays[i].name;
        d.fieldName = displays[i].fieldName;
        window.displays.push(d);
        buildLi(d);
    }
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || false;
window.URL = window.URL || window.webkitURL || window.mozURL || false;

document.addEventListener("DOMContentLoaded",function(){
    if(location.search != "?prerec" && navigator.getUserMedia){
        navigator.webkitGetUserMedia({audio:false, video:true}, function(stream){ 
            document.getElementById("img").src = URL.createObjectURL(stream);
        }, function(err){
            console.log("Stream refused: " + err);
        });
    }
    document.getElementById("canvas").addEventListener("click", function(){
        if(!rendering){
            rendering = true;
            render();
        }
    }, false);
    canvas.addEventListener("mousedown", function(event){
        if(this.currentPoints){
            var distance = 100000000;
            for(var i = 0; i < this.currentPoints.length; i++){
                var newDistance = getDistance(this.currentPoints[i], {x: event.offsetX, y: event.offsetY});
                if(newDistance < distance){
                    distance = newDistance;
                    this.currentPoint = this.currentPoints[i];
                }
            }
        }
        if(this.currentPoint){
            this.currentPoint.x = event.offsetX;
            this.currentPoint.y = event.offsetY;
        }
        if(this.downEvent){
            this.downEvent();
        }
        this.mousedDown = true;
    }, false);
    canvas.addEventListener("mousemove", function(event){
        if(this.mousedDown){
            if(this.currentPoint){
                this.currentPoint.x = event.offsetX;
                this.currentPoint.y = event.offsetY;
            }
            if(this.moveEvent){
                this.moveEvent();
            }
        }
    }, false);
    canvas.addEventListener("mouseup", function(event){
        this.mousedDown = false;
        if(this.currentPoint){
            this.currentPoint.x = event.offsetX;
            this.currentPoint.y = event.offsetY;
        }
        if(this.nextEvent){
            this.nextEvent();
        }
    }, false);
    if(!localStorage.saves){
        localStorage.saves = "{}";
    }
    updateSaveFileList(localStorage.lastName);
    if(localStorage.lastCorners){
        corners = JSON.parse(localStorage.lastCorners);
    }
    if(localStorage.lastName){
        loadFile(localStorage.lastName);
    }
    document.getElementById("save").addEventListener("click", saveFile, false);
    document.getElementById("load").addEventListener("click", loadFile, false);
    document.getElementById("add").addEventListener("click", function(){
        var type = parseInt(document.getElementById("type").value,10);
        var d = new Display(type,document.getElementById("canvas").getContext("2d"),110);
        makeDialog(type);
        startInput(type,d);
    }, false);
    document.getElementById("setCorners").addEventListener("click", function(){
        if(this.active){
            document.getElementById("canvas").currentPoints = false;
            shapePoints = [];
            shapeEnd = false;
            this.innerHTML = "Set Corners";
            this.active = false;
            dots = [];
            localStorage.lastCorners = JSON.stringify(corners);
        }else{
            document.getElementById("canvas").currentPoints = corners;
            shapePoints = corners;
            shapeEnd = true;
            this.innerHTML = "Done";
            this.active = true;
            document.getElementById("canvas").moveEvent = function(){
                var conversionMatrix = mapSquareToQuad(pointArrayToMatrix(corners));
                for(var i = 0; i < displays.length; i++){
                    if(displays[i].type == 3 || displays[i].type == 6){
                        continue;
                    }
                    var newPoints = matrixToPointArray(perstrans($M(displays[i].matrixPoints), conversionMatrix));
                    for(var j = 0; j < newPoints.length; j++){
                        displays[i].points[j].x = newPoints[j].x;
                        displays[i].points[j].y = newPoints[j].y;
                    }
                    if(displays[i].type == 7){
                        var newShape = matrixToPointArray(perstrans($M(displays[i].matrixCorners), conversionMatrix));
                    }
                }
            }
            setAllDots();
        }
    }, false);
},false);

function setAllDots(){
    dots = [];
    for(var i = 0; i < displays.length; i++){
        if(displays[i].type == 3 || displays[i].type == 6){
            continue;
        }
        for(var j = 0; j < displays[i].points.length; j++){
            dots.push(displays[i].points[j]);
        }
    }
}

var dialogs = {
    0: 'Clock on the <span id="pos">top-left</span> corner.',
    1: "Click on the pixel.",
    2: 'Click on the <span id="pos">first</span> segment.',
    3: 'Choose the fields you want to use and press <button onclick="finishComposite();">OK</button>',
    4: 'Click on the pixel for <span id="pos">home</span>.',
    5: 'Click on the <span id="pos">first</span> pixel.',
    6: 'Enter the fixed string <input type="text" placeholder="here" id="fixedText"></input><button onclick="finishFixed();">OK</button>',
    7: 'Click on the <span id="pos">top-left</span> corner.'
};

function finishFixed(){
    fixedDisplay.points[0] = document.getElementById("fixedText").value;
    finishNewInput(fixedDisplay);
    buildingFixed = false;
}

function finishComposite(){
    for(var i = 0; i < compositeSegments.length; i++){
        compositeDisplay.points.push(compositeSegments[i].number);
        document.getElementById("fields").getElementsByClassName("field")[compositeSegments[i].number].style.backgroundColor = "initial";
    }
    finishNewInput(compositeDisplay);
    buildingComposite = false;
}

function interprolatePixels(canvasImageData){
    var totalPixels = canvasImageData.length/4;
    var r = 0,
        g = 0,
        b = 0;
    for(var i = 0; i < canvasImageData.length; i += 4){
        r += canvasImageData[i];
        g += canvasImageData[i + 1];
        b += canvasImageData[i + 2];
    }
    r /= totalPixels;
    g /= totalPixels;
    b /= totalPixels;
    var bright = (r + g + b) / 3;
    return {
        r: r,
        g: g,
        b: b,
        bright: bright
    };
}

function makeDialog(type){
    document.getElementById("dialog").innerHTML = dialogs[type];
}

function updateCornerColors(){
    var ctx = document.getElementById("canvas").getContext("2d");
    for(var i = 0; i < corners.length; i++){
        var color = interprolatePixels(ctx.getImageData(corners[i].x - 1, corners[i].y - 1, 3, 3).data);
        cornerColors.push(color);
    }
}

function checkCornerColors(){
    var ctx = document.getElementById("canvas").getContext("2d");
    for(var i = 0; i < corners.length; i++){
        var difference = 0;
        var cornerColorNow = interprolatePixels(ctx.getImageData(corners[i].x - 1, corners[i].y - 1, 3, 3).data);
        var cornerColorCorrect = cornerColors[i];
        difference += Math.abs(cornerColorCorrect.r - cornerColorNow.r)/3;
        difference += Math.abs(cornerColorCorrect.g - cornerColorNow.g)/3;
        difference += Math.abs(cornerColorCorrect.b - cornerColorNow.b)/3;
        if(difference > cornerDifferenceThreshold){
            //console.log(cornerColorNow);
            //console.log("BAD CORNER #" + (i + 1) + "! OFF BY " + difference + "! ATTEMPTING CORRECTION!");
        }
    }
}

var totalFrames = 0;

function render(){
    var v = document.getElementById("img");
    var ctx = document.getElementById("canvas").getContext("2d");
    ctx.drawImage(v,0,0,640,480);
    if(totalFrames > 10){
        if(cornerColors.length == 0){
            updateCornerColors();
        }
        checkCornerColors();
    }
    updateValues();
    ctx.strokeStyle = "#00CC00";
    if(shapePoints.length){
        ctx.lineWidth = 2;
        ctx.beginPath();
        var firstPoint = shapePoints[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for(var i = 1; i < shapePoints.length; i++){
            ctx.lineTo(shapePoints[i].x, shapePoints[i].y);
        }
        if(shapeEnd){
            ctx.lineTo(firstPoint.x, firstPoint.y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
    }
    ctx.fillStyle = "blue";
    ctx.strokeStyle = "red";
    for(var i = 0; i < dots.length; i++){
        ctx.beginPath();
        ctx.arc(dots[i].x,dots[i].y,2,0,Math.PI*2,true);
        ctx.fill();
        ctx.stroke();
    }
    totalFrames++;
    requestAnimationFrame(render);
}

var shapePoints = [];
var shapeEnd = false;
var dots = [];
var oldDots = [];
function deleteField(number,noConfirm){
    if(noConfirm || confirm("Are you sure you want to delete this field?")){
        displays.splice(number,1);
        for(var i = 0; i < displays.length; i++){
            if(displays[i].type == 3){
                for(var j = 0; j < displays[i].points.length; j++){
                    if(displays[i].points[j] == number){
                        deleteField(i,true);
                        break;
                    }else if(displays[i].points[j] > number){
                        displays[i].points[j]--;
                    }
                }
            }
        }
        dots = [];
        shapePoints = [];
    }
}

function clearDialog(){
    document.getElementById("dialog").innerHTML = "";
}

function updateThreshold(){
    displays[this.number].threshold = this.value;
}

var fieldNames = [
    {friendly: "Possession", internal: "Poss"},
    {friendly: "Down", internal: "Down"},
    {friendly: "Yards To Go", internal: "ToGo"},
    {friendly: "Ball On", internal: "BallOn"},
    {friendly: "Home Score", internal: "HScore"},
    {friendly: "Away Score", internal: "VScore"},
    {friendly: "Period", internal: "Period"},
    {friendly: "Clock", internal: "GameClk"}
];

var lockPoints = false;
function buildInfo(field){
    if(!field.number){
        field.number = 0;
    }
    var d = displays[field.number];
    document.getElementById("dialog").innerHTML = '<span class="field-name">'+field.getElementsByClassName("field-name")[0].innerHTML+'</span>' +
    '<button id="setFieldCorners">Set Field Corners</button>' +
    '<br>' + 
    (d.type == 6 ? "" : '<ol id="cPoints"></ol>' +
    (d.corners ? '<ol id="cornerPoints"></ol>' : "") +
    (d.type == 3 ? "" : 'Threshold <input type="range" id="threshold" min="1" max="255" value="'+d.threshold+'"><br>') +
    'Field name: <select id="fieldName"><option value="" selected>(None)</option></select><br>') +
    '<button id="delete">Delete</button>';
    if(d.type != 6){
        if(d.type != 3){
            document.getElementById("threshold").number = field.number;
            document.getElementById("threshold").addEventListener("change",updateThreshold,false);
        }
        var select = document.getElementById("fieldName");
        for(var i = 0; i < fieldNames.length; i++){
            var el = document.createElement("option");
            el.value = fieldNames[i].internal;
            el.innerHTML = fieldNames[i].friendly;
            if(el.value == d.fieldName){
                el.selected = true;
            }
            select.appendChild(el);
        }
        select.addEventListener("change",function(){if(this.value != ""){d.fieldName = this.value}else{this.fieldName = false;}},false);
    }
    document.getElementById("setFieldCorners").addEventListener("click", function(){
        if(this.active){
            this.innerHTML = "Set Field Corners";
            this.active = false;
            document.getElementById("canvas").currentPoints = false;
            document.getElementById("canvas").moveEvent = false;
        }else{
            this.innerHTML = "Done";
            document.getElementById("canvas").currentPoints = d.corners;
            this.active = true;
            var conversionMatrix2 = mapQuadToSquare(pointArrayToMatrix(corners));
            document.getElementById("canvas").moveEvent = function(){
                var conversionMatrix = mapSquareToQuad(pointArrayToMatrix(d.corners));
                var newPoints = matrixToPointArray(perstrans(pointMatrices[li.display.type], conversionMatrix));
                shapePoints = matrixToPointArray(perstrans(lineMatrices[li.display.type], conversionMatrix));
                for(var j = 0; j < newPoints.length; j++){
                    d.points[j].x = newPoints[j].x;
                    d.points[j].y = newPoints[j].y;
                }
                d.matrixPoints = perstrans(pointArrayToMatrix(d.points), conversionMatrix2).elements;
            }
        }
    }, false);
    document.getElementById("delete").addEventListener("click",function(){deleteField(this.number);rebuildFields();clearDialog();},false);
    document.getElementById("delete").number = field.number;
    dots = [];
    shapePoints = [];
    if(lineMatrices[d.type]){
        shapePoints = matrixToPointArray(perstrans(lineMatrices[d.type], mapSquareToQuad(pointArrayToMatrix(d.corners))));
    }
    var points = document.getElementById("cPoints");
    var cornerPoints = document.getElementById("cornerPoints");
    if(points){
        points.display = d;
        for(var i = 0; i < d.points.length; i++){
            var li = document.createElement("li");
            li.number = i;
            li.display = d;
            li.className = "point";
            if(d.type == 3){
                li.innerHTML = '<span class="name">'+displays[d.points[i]].name+'</span> <span class="value"></span>';
            }else{
                li.innerHTML = '<span class="name">'+d.points[i].x+", "+d.points[i].y+'</span> <span class="value"></span>';
                li.x = d.points[i].x;
                li.y = d.points[i].y;
                li.addEventListener("mouseover",function(){
                    if(!lockPoints){
                        oldDots = dots;
                        dots = [{x: this.x, y: this.y}];
                    }
                },false);
                li.addEventListener("mouseout",function(){
                    if(!lockPoints){
                        dots = oldDots;
                    }
                },false);
                if(!cornerPoints){
                    li.addEventListener("click",function(){
                        var li = this;
                        lockPoints = true;
                        document.getElementById("canvas").currentPoint = this.display.points[this.number];
                        dots = [document.getElementById("canvas").currentPoint];
                        li.style.backgroundColor = "#00CC00";
                        document.getElementById("canvas").nextEvent = function(){
                            this.currentPoint = false;
                            this.nextEvent = false;
                            dots = oldDots;
                            lockPoints = false;
                            buildInfo(field);
                        }
                    });
                }
                dots.push(d.points[i]);
            }
            points.appendChild(li);
        }
    }
    if(cornerPoints){
        cornerPoints.display = d;
        for(var i = 0; i < d.corners.length; i++){
            var li = document.createElement("li");
            li.className = "corner";
            li.number = i;
            li.display = d;
            li.innerHTML = '<span class="name">'+d.corners[i].x+", "+d.corners[i].y+'</span>';
            li.x = d.corners[i].x;
            li.y = d.corners[i].y;
            li.addEventListener("mouseover",function(){
                if(!lockPoints){
                    oldDots = dots;
                    dots = [{x: this.x, y: this.y}];
                }
            },false);
            li.addEventListener("mouseout",function(){
                if(!lockPoints){
                    dots = oldDots;
                }
            },false);
            cornerPoints.appendChild(li);
        }
    }
}

function processFieldClick(){
    if(buildingComposite){
        this.style.backgroundColor = "#BBDDEE";
        compositeSegments.push(this);
    }else if(!document.getElementById("canvas").nextEvent){
        buildInfo(this);
    }
}

function buildLi(d){
    var fields = document.getElementById("fields");
    var li = document.createElement("li");
    li.className = "field";
    li.innerHTML = '<span class="field-name">'+d.name+'</span> <span class="value"></span>';
    li.addEventListener("click",processFieldClick,false);
    li.number = fields.getElementsByClassName("field").length;
    fields.appendChild(li);
}

function finishNewInput(d){
    document.getElementById("dialog").innerHTML = "";
    var canvas = document.getElementById("canvas").nextEvent = false;
    if(d.type == 6){
        d.name = 'FIXED: "' + d.points[0] + '"';
    }else{
        d.name = prompt("Name the display.");
    }
    if(pointMatrices[d.type]){
        // Matrix transforms to make the 7-segments easier
        d.corners = d.points;
        d.points = matrixToPointArray(perstrans(pointMatrices[d.type], mapSquareToQuad(pointArrayToMatrix(d.points))));
    }
    if(d.type != 3 && d.type != 6){
        d.matrixPoints = perstrans(pointArrayToMatrix(d.points), mapQuadToSquare(pointArrayToMatrix(corners))).elements;
    }
    displays.push(d);
    buildLi(d);
}

var buildingComposite = false;
var buildingFixed = false;
var compositeSegments = [];
var compositeDisplay = false;
var fixedDisplay = false;
var pos = ["top", "top-left", "top-right", "center", "bottom-left", "bottom-right", "bottom"];
var cornerPos = ["top-left", "top-right", "bottom-right", "bottom-left"];
function startInput(type, d){
    if(type == 3){
        buildingComposite = true;
        compositeSegments = [];
        compositeDisplay = d;
        return;
    }
    if(type == 6){
        buildingFixed = true;
        fixedDisplay = d;
        return;
    }
    var canvas = document.getElementById("canvas");
    d.points.push(canvas.currentPoint = {});
    canvas.nextEvent = function(){
        switch(type){
            case 0:
                if(d.points.length == 4){
                    finishNewInput(d);
                    return;
                }else{
                    document.getElementById("pos").innerHTML = cornerPos[d.points.length];
                }
                break;
            case 1: 
                finishNewInput(d);
                return;
            case 2:
                if(d.points.length == 2){
                    finishNewInput(d);
                    return;
                }else{
                    document.getElementById("pos").innerHTML = "second";
                }
                break;
            case 4:
                if(d.points.length == 2){
                    finishNewInput(d);
                    return;
                }else{
                    document.getElementById("pos").innerHTML = "away";
                }
                break;
            case 7:
                if(d.points.length == 4){
                    finishNewInput(d);
                    return;
                }else{
                    document.getElementById("pos").innerHTML = cornerPos[d.points.length];
                }
        }
        d.points.push(canvas.currentPoint = {});
    };
}

function rebuildFields(){
    var fields = document.getElementById("fields");
    fields.innerHTML = "";
    for(var i = 0; i < displays.length; i++){
        buildLi(displays[i]);
    }
}

function updateValues(){
    var fields = document.getElementById("fields");
    var sendObj = {};
    for(var i = 0; i < displays.length; i++){
        var field = fields.getElementsByClassName("field")[i];
        var value = displays[i].value;
        field.getElementsByClassName("value")[0].innerHTML = value;
        if(displays[i].fieldName){
            sendObj[displays[i].fieldName] = value.toString();
        }
    }
    socket.emit("update",sendObj);
    var points = document.getElementsByClassName("point");
    if(document.getElementById("cPoints")){
        var d = document.getElementById("cPoints").display;
        for(var i = 0; i < points.length; i++){
            var valueField = points[i].getElementsByClassName("value")[0];
            var value = d.getPointValue(i);
            if(d.type == 3){
                valueField.className = "value other";
                valueField.innerHTML = value;
            }else{
                if(value){
                    valueField.className = "value on";
                    valueField.innerHTML = "ON";
                }else{
                    valueField.className = "value off";
                    valueField.innerHTML = "OFF";
                }
            }
        }
    }
}
