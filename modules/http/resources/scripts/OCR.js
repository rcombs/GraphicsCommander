/*
The contents of this file may be used for any purpose, with the exception of use relating to graphics generation for live TV productions. It is otherwise exempt from the terms of the licensing agreement given in the readme file of this repository.
*/
"use strict";
var socket = io.connect();

var pointMatrices = {
  "7_segment": $M([
    [.5, 0],
    [0,.25],
    [1,.25],
    [.5,.5],
    [0,.75],
    [1,.75],
    [.5, 1]
  ])
}

var lineMatrices = {
  "7_segment": $M([
    [0,.5],
    [0, 0],
    [1, 0],
    [1,.5],
    [0,.5],
    [0, 1],
    [1, 1],
    [1,.5]
  ])
}

var fieldTypes = {
  "single": {},
  "home_away": {},
  "2_segment": {},
  "7_segment": {},
  "counter": {},
  "string": {},
  "composite": {},
  "switch": {}
};

var sRGBMatrix = $M([
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.0721750],
  [0.0193339, 0.1191920, 0.9503041]
]);

var sRGBInverse = $M([
  [ 3.2404542, -1.5371385, -0.4985314],
  [-0.9692660,  1.8760108,  0.0415560],
  [ 0.0556434, -0.2040259,  1.0572252]
]);

var D65White = [95.0429, 100, 108.89];

function Lab2RGB(Lab){
  var y = (Lab.L + 16) / 116;
  var y3 = Math.pow(y, 3);
  var x = (Lab.a / 500) + y;
  var x3 = Math.pow(x, 3);
  var z = y - (Lab.b / 200);
  var z3 = Math.pow(z, 3);
  
  if (y3 > 0.008856){
    y = y3;
  }else{
    y = (y - (16 / 116)) / 7.787;
  }
  if (x3 > 0.008856){
    x = x3;
  }else{
    x = (x - (16 / 116)) / 7.787;
  }
  if (z3 > 0.008856){
    z = z3;
  }else{
    z = (z - (16 / 116)) / 7.787;
  }
  
  // [r g b] = [X Y Z][Mi]
  var rgb = sRGBInverse.x($M([[(x * D65White[0]) / 100], [(y * D65White[1]) / 100], [(z * D65White[2]) / 100]]));
  
  var r = rgb.e(1, 1);
  var g = rgb.e(2, 1);
  var b = rgb.e(3, 1);
  
  // assume sRGB
  if (r > 0.0031308){
    r = ((1.055 * Math.pow(r, 1.0 / 2.4)) - 0.055);
  }else{
    r = (r * 12.92);
  }
  if (g > 0.0031308){
    g = ((1.055 * Math.pow(g, 1.0 / 2.4)) - 0.055);
  }else{
    g = (g * 12.92);
  }
  if (b > 0.0031308) {
    b = ((1.055 * Math.pow(b, 1.0 / 2.4)) - 0.055);
  }else{
    b = (b * 12.92);
  }
  
  r = (r < 0) ? 0 : r;
  g = (g < 0) ? 0 : g;
  b = (b < 0) ? 0 : b;
  
  // convert 0..1 into 0..255
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
};

function RGB2Lab(RGB){
  var r = RGB.r / 255,
    g = RGB.g / 255,
    b = RGB.b / 255;
  
  // assume sRGB
  if (r <= 0.04045){
    r /= 12.92;
  }else{
    r = Math.pow(((r + 0.055) / 1.055), 2.4);
  }
  if (g <= 0.04045){
    g /= 12.92;
  }else{
    g = Math.pow(((g + 0.055) / 1.055), 2.4);
  }
  if(b <= 0.04045){
    b /= 12.92;
  }else{
    b = Math.pow(((b + 0.055) / 1.055), 2.4);
  }
  
  r *= 100.0;
  g *= 100.0;
  b *= 100.0;

  var XYZ = sRGBMatrix.x($M([[r],[g],[b]]));
  
  var x = XYZ.e(1, 1) / D65White[0];
  var y = XYZ.e(2, 1) / D65White[1];
  var z = XYZ.e(3, 1) / D65White[2];
  
  if (x > 0.008856){
    x = Math.pow(x, 1/3);
  }else{
    x = (7.787 * x) + (16/116);
  }
  if (y > 0.008856){
    y = Math.pow(y, 1/3);
  }else{
    y = (7.787 * y) + (16/116);
  }
  if (z > 0.008856){
    z = Math.pow(z, 1/3);
  }else{
    z = (7.787 * z) + (16/116);
  }
  
  return {
    L: (116 * y) - 16,
    a: 500 * (x - y),
    b: 200 * (y - z)
  };
}

Math.degrees = function(radians){
  return radians / (Math.PI / 180);
}

Math.radians = function(degrees){
  return degrees * (Math.PI / 180);
}

function compareLab(col1, col2, pl, pc){
  if(pl === undefined){
    pl = 2;
  }
  if(pc === undefined){
    pc = 1;
  }
  
  var delta = {
    L: col1.L - col2.L,
    a: col1.a - col2.a,
    b: col1.b - col2.b
  };
  
  var C1 = Math.sqrt(Math.pow(col1.a, 2) + Math.pow(col1.b, 2));
  var C2 = Math.sqrt(Math.pow(col2.a, 2) + Math.pow(col2.b, 2));
  
  var H1 = Math.degrees(Math.atan2(col1.b, col1.a));
  
  if(H1 < 0){
    H1 = H1 + 360;
  }
  
  var F = Math.sqrt(Math.pow(C1, 4) / (Math.pow(C1, 4) + 1900));
  
  var T = (164 <= H1 && H1 <= 345) ?
      (.56 + Math.abs(.2 * Math.cos(Math.radians(H1 + 168)))) :
      (.36 + Math.abs(.4 * Math.cos(Math.radians(H1 + 35 ))));
  
  var SL = (col1.L < 16) ? (.511) : ((.040975 * col1.L) / (1 + .01765 * col1.L));
  var SC = ((.0638 * C1) / (1 + .0131 * C1)) + .638;
  var SH = SC * (F * T + 1 - F);
  
  delta.C = C1 - C2;
  
  delta.H = Math.sqrt(Math.pow(delta.a, 2) + Math.pow(delta.b, 2) - Math.pow(delta.C, 2));
  if(isNaN(delta.H)){
    delta.H = 0;
  }
  
  var L_group = delta.L / (pl * SL);
  var C_group = delta.C / (pc * SC);
  var H_group = delta.H / SH;
  
  return Math.sqrt(Math.pow(L_group, 2) + Math.pow(C_group, 2) + Math.pow(H_group, 2));
}

var cornerColors = [];
var cornerDifferenceThreshold = 40;
var maxCornerMovement = 10;

function getDistance(point1, point2){
  return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

var globalReferenceColor = RGB2Lab({
  r: 255,
  g: 255,
  b: 255
});

var globalReferenceColorOff = {L: 0, a: 0, b: 0}

var Display = function(type, context, settings){
  if(!(type in fieldTypes)){
    throw new Error("Bad type!");
  }
  if(!(context instanceof CanvasRenderingContext2D)){
    throw new Error("Bad context!");
  }
  this.type = type;
  this.points = [];
  this.settings = settings || {
    referenceColor: globalReferenceColor,
    referenceColorOff: globalReferenceColorOff,
    threshold: globalThreshold,
    LabWeight: globalLabWeight
  };
  this.context = context;
};

Display.prototype = {
  getPointValue: function getPointValue (i) {
    if (this.points[i] !== undefined) {
      if (this.type == "composite" || this.type == "switch") {
        return displays[this.points[i]].getValue();
      } else {
        var Lab = interpolatePixels(this.context.getImageData(this.points[i].x - 0, this.points[i].y - 0, 1, 1).data);
        var difference1 = compareLab(this.settings.referenceColor, Lab, this.settings.LabWeight, 1) * this.settings.threshold;
        var difference2 = compareLab(this.settings.referenceColorOff || {L: 0, a: 0, b: 0}, Lab, this.settings.LabWeight, 1);
        return Math.abs(difference1) < Math.abs(difference2);
      }
    } else {
      return false;
    }
  }
};

var sevenSegmentMaps = [
  {
    map: [0, 0, 0, 0, 0, 0, 0],
    value: 0
  },
  {
    map: [1, 1, 1, 0, 1, 1, 1],
    value: 0
  },
  {
    map: [0, 0, 1, 0, 0, 1, 0],
    value: 1
  },
  {
    map: [1, 0, 1, 1, 1, 0, 1],
    value: 2
  },
  {
    map: [1, 0, 1, 1, 0, 1, 1],
    value: 3
  },
  {
    map: [0, 1, 1, 1, 0, 1, 0],
    value: 4
  },
  {
    map: [1, 1, 0, 1, 0, 1, 1],
    value: 5
  },
  {
    map: [1, 1, 0, 1, 1, 1, 1],
    value: 6
  },
  {
    map: [0, 1, 0, 1, 1, 1, 1],
    value: 6
  },
  {
    map: [1, 0, 1, 0, 0, 1, 0],
    value: 7
  },
  {
    map: [1, 1, 1, 1, 1, 1, 1],
    value: 8
  },
  {
    map: [1, 1, 1, 1, 0, 1, 1],
    value: 9
  },
  {
    map: [1, 1, 1, 1, 0, 1, 0],
    value: 9
  }
];

Display.prototype.getValue = function getValue(){
  var value = this.getRawValue();
  if(this.settings.collapse0){
    if(value == "0"){
      value = "";
    }
  }
  return value;
}

Display.prototype.getRawValue = function getRawValue(){
  var points = [];
  if(this.type == "composite"){
    var str = "";
    for(var i = 0; i < this.points.length; i++){
      str += displays[this.points[i]].getValue();
    }
    return str;
  }
  if(this.type == "switch"){
    return this.getPointValue(this.settings.which);
  }
  if(this.type == "string"){
    return this.points[0];
  }
  for(var i = 0; i < this.points.length; i++){
    points[i] = this.getPointValue(i);
  }
  switch(this.type){
    case "single":
      return points[0];
    case "2_segment":
      return (points[0] && points[1]) ? "1" : "0";
    case "home_away":
      if(points[0]){
        return "H";
      }else if(points[1]){
        return "V";
      }else{
        return "";
      }
    case "7_segment":
      mapLoop: for(var i = 0; i < sevenSegmentMaps.length; i++){
        pointLoop: for(var j = 0; j < sevenSegmentMaps[i].map.length; j++){
          if(sevenSegmentMaps[i].map[j] != points[j]){
            continue mapLoop;
          }
        }
        return this.lastValue = sevenSegmentMaps[i].value;
      }
      return this.lastValue;
    case "counter":
      var out = 0;
  }
}

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
    x.settings = displays[i].settings;
    if(["string", "composite", "switch"].indexOf(x.type) != -1){
      x.points = displays[i].points;
    }else{
      x.points = perstrans(pointArrayToMatrix(displays[i].points), conversionMatrix).elements;
    }
    if(displays[i].corners){
      x.corners = perstrans(pointArrayToMatrix(displays[i].corners), conversionMatrix).elements;
    }
    d.push(x);
  }
  var saveFiles = JSON.parse(localStorage.saves);
  saveFiles[name] = {name: name, displays: d, referenceColor: globalReferenceColor, referenceColorOff: globalReferenceColorOff, threshold: globalThreshold, LabWeight: globalLabWeight};
  localStorage.saves = JSON.stringify(saveFiles);
  localStorage.lastName = name;
  updateSaveFileList(name);
}

function clearFields(){
  if(!confirm("Are you sure you want to clear all fields?")){
    return;
  }
  while(displays.length){
    deleteField(0, true);
    rebuildFields();
    clearDialog();
  }
}

function deleteFile(){
  var name = document.getElementById("slot").value;
  if(name == "NEW"){
    alert("Choose a file to delete.");
    return;
  }
  if(!confirm("Are you sure you want to delete this file?")){
    return;
  }
  var saveFiles = JSON.parse(localStorage.saves);
  delete saveFiles[name];
  localStorage.saves = JSON.stringify(saveFiles);
  if(localStorage.lastName == name){
    localStorage.lastName = "";
  }
  updateSaveFileList();
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
  globalReferenceColor = j[name].referenceColor;
  globalReferenceColorOff = j[name].referenceColorOff || {L: 0, a: 0, b: 0};
  document.getElementById("defaultReference").value = formatRGB(Lab2RGB(globalReferenceColor), true);
  document.getElementById("defaultReferenceOff").value = formatRGB(Lab2RGB(globalReferenceColorOff), true);
  document.getElementById("defaultThreshold_output").value = document.getElementById("defaultThreshold").value = globalThreshold = j[name].threshold;
  document.getElementById("defaultLabWeight_output").value = document.getElementById("defaultLabWeight").value = globalLabWeight = j[name].LabWeight;
  document.getElementById("fields").innerHTML = "";
  var conversionMatrix = mapSquareToQuad(pointArrayToMatrix(corners));
  for(var i = 0; i < displays.length; i++){
    var d = new Display(displays[i].type,ctx,displays[i].settings);
    d.settings = displays[i].settings;
    if(d.type == "composite" || d.type == "string" || d.type == "switch"){
      d.points = displays[i].points;
    }else{
      d.points = matrixToPointArray(perstrans($M(displays[i].points), conversionMatrix));
      d.matrixPoints = displays[i].points;
    }
    if(displays[i].corners){
      d.corners = matrixToPointArray(perstrans($M(displays[i].corners), conversionMatrix));
      d.matrixCorners = displays[i].corners;
    }
    window.displays.push(d);
    buildLi(d);
  }
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || false;
window.URL = window.URL || window.webkitURL || window.mozURL || false;

var animationFrame = 0;

document.addEventListener("DOMContentLoaded",function(){
  if(location.search != "?prerec" && navigator.getUserMedia){
    navigator.webkitGetUserMedia({audio:false, video:true}, function(stream){ 
      document.getElementById("img").src = URL.createObjectURL(stream);
    }, function(err){
      console.log("Stream refused: " + err);
    });
  }
  animationFrame = requestAnimationFrame(render);
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
      this.downEvent(event);
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
        this.moveEvent(event);
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
      this.nextEvent(event);
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
  document.getElementById("start_render").addEventListener("click", render, false);
  document.getElementById("stop_render").addEventListener("click", function(){
    cancelAnimationFrame(animationFrame);
  }, false);
  document.getElementById("delete").addEventListener("click", deleteFile, false);
  document.getElementById("clear").addEventListener("click", clearFields, false);
  document.getElementById("add").addEventListener("click", function(){
    var type = document.getElementById("type").value;
    var d = new Display(type, document.getElementById("canvas").getContext("2d"));
    makeDialog(type);
    startInput(type, d);
  }, false);
  document.getElementById("clearCorners").addEventListener("click", function(){
    corners = false;
  });
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
      var setPoints = true;
      if(corners == false){
        corners = [
          {x: 0, y: 0},
          {x: 640, y: 0},
          {x: 640, y: 480},
          {x: 0, y: 480}
        ];
        setPoints = false;
      }
      document.getElementById("canvas").currentPoints = corners;
      shapePoints = corners;
      shapeEnd = true;
      this.innerHTML = "Done";
      this.active = true;
      document.getElementById("canvas").moveEvent = function(){
        var conversionMatrix = mapSquareToQuad(pointArrayToMatrix(corners));
        for(var i = 0; i < displays.length; i++){
          if(displays[i].type == "string" || displays[i].type == "composite" || displays[i].type == "switch"){
            continue;
          }
          if(setPoints){
            var newPoints = matrixToPointArray(perstrans($M(displays[i].matrixPoints), conversionMatrix));
            for(var j = 0; j < newPoints.length; j++){
              displays[i].points[j].x = newPoints[j].x;
              displays[i].points[j].y = newPoints[j].y;
            }
          }
          if(displays[i].type == "7_segment"){
            displays[i].corners = matrixToPointArray(perstrans($M(displays[i].matrixCorners), conversionMatrix));
          }
        }
      }
      setAllDots();
    }
  }, false);
  document.getElementById("defaultReference").addEventListener("change", function(){
    globalReferenceColor = RGB2Lab(parseRGB(this.value));
    if(document.getElementById("propogateDefaults").checked){
                        for(var i = 0; i < displays.length; i++){
                                displays[i].settings.referenceColor = globalReferenceColor;
                        }
                }
  }, false);
  document.getElementById("defaultReferenceOff").addEventListener("change", function(){
    globalReferenceColorOff = RGB2Lab(parseRGB(this.value));
    if(document.getElementById("propogateDefaults").checked){
      for(var i = 0; i < displays.length; i++){
        displays[i].settings.referenceColorOff = globalReferenceColorOff;
      }
    }
  }, false);
  document.getElementById("defaultReference").addEventListener("click", startEyedropper);
  document.getElementById("defaultReferenceOff").addEventListener("click", startEyedropper);
  document.getElementById("defaultThreshold").addEventListener("change", function(){
    globalThreshold = this.valueAsNumber;
    document.getElementById("defaultThreshold_output").value = this.value;
    if(document.getElementById("propogateDefaults").checked){
      for(var i = 0; i < displays.length; i++){
        displays[i].settings.threshold = globalThreshold;
      }
    }
  }, false);
  document.getElementById("defaultLabWeight").addEventListener("change", function(){
    globalLabWeight = this.valueAsNumber;
    document.getElementById("defaultLabWeight_output").value = this.value;
    if(document.getElementById("propogateDefaults").checked){
      for(var i = 0; i < displays.length; i++){
        displays[i].settings.LabWeight = globalLabWeight;
      }
    }
  }, false);
    document.getElementById('clearStorage').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear all settings?')) {
            localStorage.clear();
            location.href = location.href;
        }
    }, false);
}, false);

var globalThreshold = 1;
var globalLabWeight = 1;

function setAllDots(){
  dots = [];
  for(var i = 0; i < displays.length; i++){
    if(displays[i].type == "string" || displays[i].type == "composite" || displays[i].type == "switch"){
      continue;
    }
    for(var j = 0; j < displays[i].points.length; j++){
      dots.push(displays[i].points[j]);
    }
  }
}

var dialogs = {
  "0": 'Clock on the <span id="pos">top-left</span> corner.',
  "single": "Click on the pixel.",
  "2_segment": 'Click on the <span id="pos">first</span> segment.',
  "composite": 'Choose the fields you want to use and press <button onclick="finishComposite();">OK</button>',
  "switch": 'Choose the fields you want to use and press <button onclick="finishComposite();">OK</button>',
  "home_away": 'Click on the pixel for <span id="pos">home</span>.',
  "counter": 'Click on the <span id="pos">first</span> pixel.',
  "string": 'Enter the fixed string <input type="text" placeholder="here" id="fixedText"></input><button onclick="finishFixed();">OK</button>',
  "7_segment": 'Click on the <span id="pos">top-left</span> corner.'
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

function interpolatePixels(canvasImageData, keepRGB){
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
  var rgb = {
    r: r,
    g: g,
    b: b
  };
  return keepRGB ? rgb : RGB2Lab(rgb);
}

function makeDialog(type){
  document.getElementById("dialog").innerHTML = dialogs[type];
}

function updateCornerColors(){
  var ctx = document.getElementById("canvas").getContext("2d");
  for(var i = 0; i < corners.length; i++){
    var color = interpolatePixels(ctx.getImageData(corners[i].x - 1, corners[i].y - 1, 3, 3).data);
    cornerColors.push(color);
  }
}

function checkCornerColors(){
  var ctx = document.getElementById("canvas").getContext("2d");
  for(var i = 0; i < corners.length; i++){
    var cornerColorNow = interpolatePixels(ctx.getImageData(corners[i].x - 1, corners[i].y - 1, 3, 3).data);
    var cornerColorCorrect = cornerColors[i];
    var difference = compareLab(cornerColorCorrect, cornerColorNow);
    if(difference > cornerDifferenceThreshold){
      //console.log(cornerColorNow);
      //console.log("BAD CORNER #" + (i + 1) + "! OFF BY " + difference + "! ATTEMPTING CORRECTION!");
    }
  }
}

var totalFrames = 0;

function render(){
  cancelAnimationFrame(animationFrame); // Avoid running two render loops
  var v = document.getElementById("img");
  var ctx = document.getElementById("canvas").getContext("2d");
  ctx.drawImage(v,0,0,640,480);
  if(totalFrames > 10){
    if(cornerColors.length == 0){
      //updateCornerColors();
    }
    //checkCornerColors();
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
  animationFrame = requestAnimationFrame(render);
}

var shapePoints = [];
var shapeEnd = false;
var dots = [];
var oldDots = [];
function deleteField(number,noConfirm){
  if(noConfirm || confirm("Are you sure you want to delete this field?")){
    displays.splice(number,1);
    // Delete any composite fields that use this one
    for(var i = 0; i < displays.length; i++){
      if(displays[i].type == "composite" || displays[i].type == "switch"){
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

function zeroPad(str, count){
  while(str.length < count){
    str = "0" + str;
  }
  return str;
}

function formatRGB(rgb, showHash){
  return (showHash ? "#" : "") + zeroPad(Math.round(rgb.r).toString(16), 2) + zeroPad(Math.round(rgb.g).toString(16), 2) + zeroPad(Math.round(rgb.b).toString(16), 2);
};

function parseRGB(text){
  if(text.indexOf("#") == 0){
    text = text.substring(1);
  }
  return {
    r: parseInt(text.substring(0, 2), 16),
    g: parseInt(text.substring(2, 4), 16),
    b: parseInt(text.substring(4, 6), 16)
  }
}

function startEyedropper(ev) {
  var self = this;
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  canvas.currentPoints = false;
  if (this.active) {
    this.active = false;
    canvas.moveEvent = canvas.downEvent = false;
  } else {
    this.active = true;
    canvas.moveEvent = canvas.downEvent = function(e) {
      var val = interpolatePixels(ctx.getImageData(e.offsetX, e.offsetY, 1, 1).data, true);
      self.value = formatRGB(val, true);
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("change", false, true);
      self.dispatchEvent(evt);
    }
    ev.preventDefault();
  }
}

var lockPoints = false;
function buildInfo(field){
  if(!field.number){
    field.number = 0;
  }
  var d = displays[field.number];
  document.getElementById("dialog").innerHTML = '<span class="field-name">'+field.getElementsByClassName("field-name")[0].innerHTML+'</span>' +
  '<button id="setFieldCorners">Set Field Corners</button>' +
  '<br>' +
  (d.type == "string" ? "" : '<ol id="cPoints"></ol>' +
  (d.corners ? '<ol id="cornerPoints"></ol>' : "") +
  ((d.type == "composite" || d.type == "switch") ? "" : 'Color/Lightness Weight <input type="range" id="Lab_weight" min="0" step="0.1" max="2" value="'+d.settings.LabWeight+'"><output for="Lab_weight" id="Lab_weight_output" value="'+d.settings.LabWeight+'"></output><br>On/Off Weight <input type="range" id="threshold" min="0" step="0.1" max="2" value="'+d.settings.threshold+'"><output for="threshold" id="threshold_output" value="'+d.settings.threshold+'"></output><br>Reference Color <input type="color" id="reference_color" value="' + formatRGB(Lab2RGB(d.settings.referenceColor), true) + '"/><br>Reference Color Off <input type="color" id="reference_color_off" value="' + formatRGB(Lab2RGB(d.settings.referenceColorOff || globalReferenceColorOff), true) + '"/><br>') +
  'Field name: <select id="fieldName"><option value="" selected>(None)</option></select><br>' +
  '<label for="collapse0">Collapse 0 to Blank</label><input type="checkbox" id="collapse0"' + (d.settings.collapse0 ? ' checked' : '') + '><br>') +
  '<button id="deleteField">Delete</button>';
  if(d.type != "string"){
    if(d.type != "composite" && d.type != "switch"){
      document.getElementById("threshold").addEventListener("change", function updateThreshold(){
        d.settings.threshold = this.valueAsNumber;
        document.getElementById("threshold_output").value = this.value;
      }, false);
      document.getElementById("threshold_output").value = d.settings.threshold;
      document.getElementById("Lab_weight").addEventListener("change", function updateLabWeight(){
        d.settings.LabWeight = this.valueAsNumber;
        document.getElementById("Lab_weight_output").value = this.value;
      }, false);
      document.getElementById("Lab_weight_output").value = d.settings.LabWeight;
      document.getElementById("reference_color").addEventListener("click", startEyedropper);
      document.getElementById("reference_color").addEventListener("change", function updateReferenceColor(){
        d.settings.referenceColor = RGB2Lab(parseRGB(this.value));
      }, false);
      document.getElementById("reference_color_off").addEventListener("click", startEyedropper);
      document.getElementById("reference_color_off").addEventListener("change", function updateReferenceColorOff(){
        d.settings.referenceColorOff = RGB2Lab(parseRGB(this.value));
      }, false);
    }
    var select = document.getElementById("fieldName");
    if(select){
      for(var i = 0; i < fieldNames.length; i++){
        var el = document.createElement("option");
        el.value = fieldNames[i].internal;
        el.innerHTML = fieldNames[i].friendly;
        if(el.value == d.settings.fieldName){
          el.selected = true;
        }
        select.appendChild(el);
      }
      select.addEventListener("change", function(){
        if(this.value != ""){
          d.settings.fieldName = this.value
        }else{
          delete this.settings.fieldName;
        }
      }, false);
    }
    document.getElementById("collapse0").addEventListener("change", function(){
      d.settings.collapse0 = this.checked;
    }, false);
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
  document.getElementById("deleteField").addEventListener("click",function(){deleteField(this.number);rebuildFields();clearDialog();},false);
  document.getElementById("deleteField").number = field.number;
  dots = [];
  shapePoints = [];
  if(lineMatrices[d.type]){
    shapePoints = matrixToPointArray(perstrans(lineMatrices[d.type], mapSquareToQuad(pointArrayToMatrix(d.corners))));
  }
  var points = document.getElementById("cPoints");
  points.className = "itype-" + d.type;
  var cornerPoints = document.getElementById("cornerPoints");
  if(points){
    points.display = d;
    for(var i = 0; i < d.points.length; i++){
      var li = document.createElement("li");
      li.number = i;
      li.display = d;
      li.className = "point";
      if(d.type == "composite" || d.type == "switch"){
        li.innerHTML = '<span class="name' + (i == d.settings.which ? " switch_on" : "") + '">'+displays[d.points[i]].settings.name+'</span> <span class="value"></span>';
        if(d.type == "switch"){
          li.i = i;
          li.d = d;
          li.addEventListener("click", function(){
            this.d.settings.which = this.i;
            updateValues();
          }, false);
        }
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
        //if(!cornerPoints){
          li.addEventListener("click",function(){
            var li = this;
            var lis = li.parentNode.childNodes;
            for(var i = 0; i < lis.length; i++){
              lis[i].style.backgroundColor = "initial";
            }
            lockPoints = true;
            document.getElementById("canvas").currentPoint = this.display.points[this.number];
            dots = [this.display.points[this.number]];
            li.style.backgroundColor = "#00CC00";
            document.getElementById("canvas").nextEvent = function(){
              this.currentPoint = false;
              this.nextEvent = false;
              dots = oldDots;
              lockPoints = false;
              buildInfo(field);
            }
          });
        //}
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
  li.innerHTML = '<span class="field-name">'+d.settings.name+'</span> <span class="value"></span>';
  li.addEventListener("click",processFieldClick,false);
  li.number = fields.getElementsByClassName("field").length;
  fields.appendChild(li);
}

function finishNewInput(d){
  document.getElementById("dialog").innerHTML = "";
  var canvas = document.getElementById("canvas").nextEvent = false;
  if(d.type == "string"){
    d.settings.name = 'FIXED: "' + d.points[0] + '"';
  }else{
    d.settings.name = prompt("Name the display.");
  }
  if(pointMatrices[d.type]){
    // Matrix transforms to make the 7-segments easier
    d.corners = d.points;
    d.points = matrixToPointArray(perstrans(pointMatrices[d.type], mapSquareToQuad(pointArrayToMatrix(d.points))));
  }
  if(d.type != "string" && d.type != "composite" && d.type != "switch"){
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
  if(type == "composite" || type == "switch"){
    buildingComposite = true;
    compositeSegments = [];
    compositeDisplay = d;
    return;
  }
  if(type == "string"){
    buildingFixed = true;
    fixedDisplay = d;
    return;
  }
  var canvas = document.getElementById("canvas");
  d.points.push(canvas.currentPoint = {});
  canvas.nextEvent = function(){
    switch(type){
      case "corners":
        if(d.points.length == 4){
          finishNewInput(d);
          return;
        }else{
          document.getElementById("pos").innerHTML = cornerPos[d.points.length];
        }
        break;
      case "single": 
        finishNewInput(d);
        return;
      case "2_segment":
        if(d.points.length == 2){
          finishNewInput(d);
          return;
        }else{
          document.getElementById("pos").innerHTML = "second";
        }
        break;
      case "home_away":
        if(d.points.length == 2){
          finishNewInput(d);
          return;
        }else{
          document.getElementById("pos").innerHTML = "away";
        }
        break;
      case "7_segment":
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
    var value = displays[i].getValue();
    field.getElementsByClassName("value")[0].innerHTML = value;
    if(displays[i].settings.fieldName){
      sendObj[displays[i].settings.fieldName] = value.toString();
    }
  }
  socket.emit("update",sendObj);
  var points = document.getElementsByClassName("point");
  if(document.getElementById("cPoints")){
    var d = document.getElementById("cPoints").display;
    for(var i = 0; i < points.length; i++){
      var valueField = points[i].getElementsByClassName("value")[0];
      var value = d.getPointValue(i);
      if(d.type == "composite"){
        valueField.className = "value other";
        valueField.innerHTML = value;
      }else if(d.type == "switch"){
        valueField.className = "value " + (i == d.settings.which ? "on" : "off");
        valueField.innerHTML = value;
        valueField.i = i;
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
