"use strict";
var socket = io.connect();
if(typeof requestAnimationFrame == "undefined" && typeof webkitRequestAnimationFrame != "undefined"){
    window.requestAnimationFrame = webkitRequestAnimationFrame;
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
            var point = this.context.getImageData(
                this.points[i].x,
                this.points[i].y,
                1,
                1
            ).data;
            var bright = (point[0]+point[1]+point[2])/3;
            return bright > this.threshold;
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
var corners = [];
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
        if(d.type == 0 || d.type == 3 || d.type == 6){
            d.points = displays[i].points;
        }else{
            console.log(displays[i].points);
            d.points = matrixToPointArray(perstrans($M(displays[i].points), conversionMatrix));
            console.log(d.points);
        }
        d.name = displays[i].name;
        d.fieldName = displays[i].fieldName;
        window.displays.push(d);
        buildLi(d);
    }
}

document.addEventListener("DOMContentLoaded",function(){
    document.getElementById("canvas").addEventListener("click",function(){
        if(!rendering){
            rendering = true;
            render();
        }
    },false);
    canvas.addEventListener("mouseup",function(event){
        if(this.currentPoint){
            this.currentPoint.x = event.offsetX;
            this.currentPoint.y = event.offsetY;
        }
        if(this.nextEvent){
            this.nextEvent();
        }
    },false);
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
    },false);
},false);

var dialogs = {
    0: 'Clock on the <span id="pos">top-left</span> corner.',
    1: "Click on the pixel.",
    2: 'Click on the <span id="pos">first</span> segment.',
    3: 'Choose the fields you want to use and press <button onclick="finishComposite();">OK</button>',
    4: 'Click on the pixel for <span id="pos">home</span>.',
    5: 'Click on the <span id="pos">first</span> pixel.',
    6: 'Enter the fixed string <input type="text" placeholder="here" id="fixedText"></input><button onclick="finishFixed();">OK</button>',
    7: 'Click on the <span id="pos">top</span> segment.'
};

function finishFixed(){
    fixedDisplay.points[0] = document.getElementById("fixedText").value;
    finishNewInput(fixedDisplay, 6);
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

function makeDialog(type){
    document.getElementById("dialog").innerHTML = dialogs[type];
}

function render(){
    var v = document.getElementById("img");
    var ctx = document.getElementById("canvas").getContext("2d");
    ctx.drawImage(v,0,0,640,480);
    updateValues();
    ctx.fillStyle = "blue";
    ctx.strokeStyle = "red";
    for(var i = 0; i < dots.length; i++){
        ctx.beginPath();
        ctx.arc(dots[i].x,dots[i].y,3,0,Math.PI*2,true);
        ctx.fill();
        ctx.stroke();
    }
    requestAnimationFrame(render);
}

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
                    }else{
                        console.log(displays[i].points[j],i,j,number);
                    }
                }
            }
        }
    }
}

function clearDialog(){
    document.getElementById("dialog").innerHTML = "";
}

function updateThreshold(){
    var number = this.number;
    displays[number].threshold = this.value;
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
    document.getElementById("dialog").innerHTML = '<span>'+field.getElementsByClassName("field-name")[0].innerHTML+'</span><br>' + 
    ((displays[field.number].type == 6) ? "" : '<ol id="cPoints"></ol>')+
    (displays[field.number].type == 3 ? "" : 'Threshold <input type="range" id="threshold" min="1" max="255" value="'+displays[field.number].threshold+'"><br>')+
    'Field name: <select id="fieldName"><option value="" selected>(None)</option></select><br>'+
    '<button id="delete">Delete</button>';
    if(displays[field.number].type != 3){
        document.getElementById("threshold").number = field.number;
        document.getElementById("threshold").addEventListener("change",updateThreshold,false);
    }
    var d = displays[field.number];
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
    document.getElementById("delete").addEventListener("click",function(){deleteField(this.number);rebuildFields();clearDialog();},false);
    document.getElementById("delete").number = field.number;
    var points = document.getElementById("cPoints");
    if(points){
        points.display = d;
        dots = [];
        for(var i = 0; i < d.points.length; i++){
            var li = document.createElement("li");
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
                li.number = i;
                li.display = d;
                li.addEventListener("click",function(){
                    lockPoints = true;
                    document.getElementById("canvas").currentPoint = this.display.points[this.number];
                    document.getElementById("canvas").nextEvent = function(){
                        this.currentPoint = false;
                        this.nextEvent = false;
                        dots = oldDots;
                        lockPoints = false;
                        buildInfo(field);
                    }
                });
                dots.push({x: li.x, y: li.y});
            }
            li.className = "point";
            li.number = i;
            points.appendChild(li);
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
    li.number = fields.childNodes.length;
    fields.appendChild(li);
}

function finishNewInput(d){
    document.getElementById("dialog").innerHTML = "";
    var canvas = document.getElementById("canvas").nextEvent = false;
    if(d.type == 6){
        d.name = 'FIXED: "' + d.points[0] + '"';
    }else if(d.type == 0){
        d.name = "CORNERS";
        corners = d.points;
        localStorage.lastCorners = JSON.stringify(corners);
        return;
    }else{
        d.name = prompt("Name the display.");
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
                if(d.points.length == 7){
                    finishNewInput(d);
                    return;
                }else{
                    document.getElementById("pos").innerHTML = pos[d.points.length];
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