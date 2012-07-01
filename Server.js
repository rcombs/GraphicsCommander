#! /usr/bin/env node

/*
Copyright (C) 2012 Rodger Combs.
The program encoded in this text file (herein the PROGRAM) is provided by Rodger Combs (herein the AUTHOR) for use by any individual or company (herein the USER) in conjunction with NewTek LiveText (herein LIVETEXT) and/or its related products, including, but not limited to, the NewTek Tricaster 850 and NewTek Tricaster 850XD (herein RELATED PRODUCTS) under any of the three (3) conditions listed below:
    1. The USER uses the PROGRAM solely for non-commercial and/or non-profit use, including, but not limited to, and at the sole discretion of the AUTHOR:
        a. Schools
        b. Churches
        c. Charities
        d. USERs who do not profit from use of the PROGRAM, LIVETEXT, or RELATED PRODUCTS
    2. Both of the following conditions are fulfilled:
        a. The USER has received express permission from the AUTHOR to use the PROGRAM, including, but not limited to, permission granted as a result of a purchase from the AUTHOR
        b. Any conditions specified by the AUTHOR for use of the PROGRAM by the USER are followed
    3. The USER intends to profit from use of the PROGRAM, LIVETEXT, or RELATED PRODUCTS, but will not profit from the current use of the PROGRAM, including, but not limited to, a USER who wishes to test the functionality of the PROGRAM or its usefulness in their workflow.
     
Any use of the PROGRAM that does not fulfill one of these conditions is prohibited.

If a USER is licensed for use of the PROGRAM under the above license, then that USER is licensed to modify any portion of the PROGRAM with the exception of this license statement. Such a modified version of the PROGRAM may NOT be redistributed to any other USER except when expressly permitted by the AUTHOR. If the USER is unable to make such a modification, then the USER may submit a feature request or bug report at the GITHUB ISSUES PAGE at https://github.com/11rcombs/LiveText-Control/issues

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/


"use strict";
var VERSION = 1.0;
var net = require("net");
var path = require("path");
var fs = require("fs");
var socketio = require("socket.io");
var http = require("http");
var dgram = require("dgram");
var util = require("util");
var rawFlags = {};
var quartzFlags = {
	keeps: {
		showDrawing: false
	}
};
var flashOn = false;

setInterval(function(){
	flashOn = !flashOn;
	if(rawFlags.goalOn){
		writeOutput();
	}
}, 250);

/**
 * The following method is adopted from jquery's extend method. Under the terms of MIT License, listed below:
 Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by mscdex to use Array.isArray instead of the custom isArray method
 */
function runCountdown(){
	var write = false;
	if(rawFlags.countdown > 0 && rawFlags.countdownRunning == true){
		rawFlags.countdown = Math.max(rawFlags.countdown - 1000, 0);
		write = true;
	}else{
		rawFlags.countdownRunning = false;
	}
	if(rawFlags.countdown2 > 0 && rawFlags.countdown2Running == true){
		rawFlags.countdown2 = Math.max(rawFlags.countdown2 - 1000, 0);
		write = true;
	}else{
		rawFlags.countdown2Running = false;
	}
	if(write){
		writeOutput();
	}
}
setInterval(runCountdown, 1000);
function extend() {
  // copy reference to target object
  var target = arguments[0] || {}, i = 1, length = arguments.length, deep = false, options, name, src, copy;

  // Handle a deep copy situation
  if (typeof target === 'boolean') {
	deep = target;
	target = arguments[1] || {};
	// skip the boolean and the target
	i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== 'object' && !typeof target === 'function')
	target = {};

  var isPlainObject = function(obj) {
	// Must be an Object.
	// Because of IE, we also have to check the presence of the constructor property.
	// Make sure that DOM nodes and window objects don't pass through, as well
	if (!obj || toString.call(obj) !== '[object Object]' || obj.nodeType || obj.setInterval)
	  return false;
	
	var has_own_constructor = hasOwnProperty.call(obj, 'constructor');
	var has_is_property_of_method = hasOwnProperty.call(obj.constructor.prototype, 'isPrototypeOf');
	// Not own constructor property must be Object
	if (obj.constructor && !has_own_constructor && !has_is_property_of_method)
	  return false;
	
	// Own properties are enumerated firstly, so to speed up,
	// if last one is own, then all properties are own.

	var last_key;
	for (var key in obj)
	  last_key = key;
	
	return typeof last_key === 'undefined' || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
	// Only deal with non-null/undefined values
	if ((options = arguments[i]) !== null) {
	  // Extend the base object
	  for (name in options) {
		src = target[name];
		copy = options[name];

		// Prevent never-ending loop
		if (target === copy)
			continue;

		// Recurse if we're merging object literal values or arrays
		if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
		  var clone = src && (isPlainObject(src) || Array.isArray(src)) ? src : Array.isArray(copy) ? [] : {};

		  // Never move original objects, clone them
		  target[name] = extend(deep, clone, copy);

		// Don't bring in undefined values
		} else if (typeof copy !== 'undefined')
		  target[name] = copy;
	  }
	}
  }

  // Return the modified object
  return target;
};

/*
    END MIT Licensed Section
*/

function makeString(hash){
	var str = "";
	for(var i in hash){
		var j = hash[i];
		str += i + " = " + j + "\n";
	}
	return str;
}
function stream(file, req, res, type){
	fs.stat(file, function(err, stat){
	if(err){
		throw err;
	}
	if (!stat.isFile()){
		res.end();
	}
	
	var start = 0;
	var end = 0;
	var range = req.headers.Range;
	if (range != null) {
	start = parseInt(range.slice(range.indexOf('bytes=')+6,
	  range.indexOf('-')));
	end = parseInt(range.slice(range.indexOf('-')+1,
	  range.length));
	}
	if (isNaN(start)){
		start = 0;
	}
	if (isNaN(end) || end == 0) end = stat.size;
	
	if (start > end){
		res.end();
	}
	
	var date = new Date();

	if(range == null){
		res.writeHead(200, {
			"Date": date.toUTCString(),
			"Connection": "close",
			"Content-Type": type,
			"Content-Length": stat.size
		});
	}else{
	
	res.writeHead(206, { // NOTE: a partial http response
		'Date': date.toUTCString(),
		'Connection': 'close',
		// 'Cache-Control':'private',
		'Content-Type': type,
		'Content-Length': end - start,
		'Content-Range': 'bytes '+start+'-'+end+'/'+stat.size,
		'Accept-Ranges':'bytes',
		// 'Server':'CustomStreamer/0.0.1',
		'Transfer-Encoding':'chunked'
	});

	}
	
	var stream = fs.createReadStream(file, {
		flags: 'r', start: start, end: end
	});
	stream.pipe(res);
	});
}
function writeOutput(){
	runFixes();
	var string = makeString(writeFlags);
	try{
		 fs.writeFileSync(options.outfile,string);
	}catch(e){
	}
}
var added = {
	DownAndTogo: function(){
		if(writeFlags.Down && writeFlags.ToGo){
			return writeFlags.Down+" and "+writeFlags.ToGo;
		}else{
			return "";
		}
	},
	timeoutsLeftHome: function(){
		if(writeFlags.timeout == "home"){
			return writeFlags.HToL;
		}else{
			return "";
		}
	},
	timeoutsLeftAway: function(){
		if(writeFlags.timeout == "away"){
			return writeFlags.VToL;
		}else{
			return "";
		}
	},
};
function zeroPad(num, numZeros) {
        var n = Math.abs(num);
        var zeros = Math.max(0, numZeros - Math.floor(n).toString().length );
        var zeroString = Math.pow(10,zeros).toString().substr(1);
        if( num < 0 ) {
                zeroString = '-' + zeroString;
        }

        return zeroString+n;
}
var fixes = {
	Down: function(down){
		switch(down){
			case "1":
				return "1st";
			case "2":
				return "2nd";
			case "3":
				return "3rd";
			case "4":
				return "4th";
			default:
				return down;
		}
	},
	countdown: function(countdown){
		if(!rawFlags.showCountdown){
			return "";
		}
		var x = Math.floor(countdown / 1000);
		var seconds = x % 60;
		x = Math.floor(x / 60);
		var minutes = x % 60;
		x = Math.floor(x / 60);
		var hours = x;
		var str = "";
		if(hours > 0){
			str += zeroPad(hours, 2) + ":";
		}
		str += zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
		return str;
	},
	countdown2: function(countdown){
		if(!rawFlags.showCountdown2){
			return "";
		}
		var x = Math.floor(countdown / 1000);
		var seconds = x % 60;
		x = Math.floor(x / 60);
		var minutes = x % 60;
		x = Math.floor(x / 60);
		var hours = x;
		var str = "";
		if(hours > 0){
			str += zeroPad(hours, 2) + ":";
		}
		str += zeroPad(minutes, 2) + ":" + zeroPad(seconds, 2);
		return str;
	},
	ToGo: function(togo){
		if(togo <= 10 && togo == rawFlags.BallOn){
			return "G";
		}else{
			return togo;
		}
	},
	GameClk: function(time){
		if(time.indexOf("0:") == 0){
			return time.substring(2);
		}else{
			return time;
		}
	},
	BallOn: function(on){
		if(on){
			return "on the "+on;
		}else{
			return "";
		}
	},
	Period: function(p){
		return writeFlags.periodPrefix+p;
	}
};
var writeFlags = {};
function runFixes(){
	for(var i in rawFlags){
		if(i in fixes){
			writeFlags[i] = fixes[i](rawFlags[i]);
		}else{
			writeFlags[i] = rawFlags[i];
		}
	}
	for(var i in added){
		writeFlags[i] = added[i]();
	}
}
function parseScoreboard(infile){
	var ignores = ["HTName","VTName"];
	var string = fs.readFileSync(infile).toString();
	parseData(string, ignores);
}
var options = require("nomnom").opts({
	infile: {
		abbr: "i",
		full: "in-file",
		list: true,
		help: "Scoreboard file to poll automatically",
		callback: function(arg){
			if(!fs.existsSync(arg)){
				return "File "+arg+" does not exist!";
			}else{
			try{
					fs.watchFile(arg, {persistent: true, interval: 60}, function(curr,prev){
							if(curr.mtime.getTime() != prev.mtime.getTime()){
								parseScoreboard(arg);
							 	writeOutput();
								sendUpdates();
							}
					});
			}catch(e){
				setInterval(function(){
					parseScoreboard(arg);
					writeOutput();
					sendUpdates();
				},60);
			}
				parseScoreboard(arg);
			}
		}
	},
	startHostedNetwork: {
		abbr: "s",
		full: "start-hosted-network",
		flag: true,
		help: "Begin acting as a wireless access point on start",
		callback: function(){
			var proc = require('child_process').spawn("netsh", ["wlan", "start", "hostednetwork"]);
			proc.on("exit", function(code){
				if(code == 0){
					console.log("Successfully started hosted network");
				}else{
					console.error("Hosted network not started; threw error code "+code);
				}
			});
		}
	},
	preload: {
		abbr: "l",
		full: "preload-file",
		list: true,
		help: "Scoreboard file to parse once on start",
		callback: function(arg){
			if(!fs.existsSync(arg)){
				return "File "+arg+" does not exist!";
			}else{
				parseScoreboard(arg);
				writeOutput();
			}
		}
	},
	outfile: {
		abbr: "o",
		full: "out-file",
		help: "File to write for Livetext",
		default: "livetext.txt"
	},
	port: {
		abbr: "p",
		full: "port",
		help: "Port to listen on for Socket server",
		default: 8989
	},
	httpport: {
		abbr: "h",
		full: "http-port",
		help: "Port to listen on for HTTP server",
		default: 8990
	}
}).parseArgs();
writeOutput();
var parseAdds = {
	homePossPath: function(){
		switch(rawFlags.Poss){
			case "H":
				return "C://Users//Truck Laptop//Desktop//Images//Possession.png";
			default:
				return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	goalPath: function(){
		if(rawFlags.goalOn && flashOn){
			return "C://Users//Truck Laptop//Desktop//Images//Goal.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	awayPossPath: function(){
		switch(rawFlags.Poss){
			case "V":
				return "C://Users//Truck Laptop//Desktop//Images//Possession.png";
			default:
				return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	timeoutPath: function(){
		if(rawFlags.timeout == "on"){
			return "C://Users//Truck Laptop//Desktop//Images//Timeouts.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	base1Path: function(){
		if(rawFlags.base1){
			return "C://Users//Truck Laptop//Desktop//Images//BaseOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	base2Path: function(){
		if(rawFlags.base2){
			return "C://Users//Truck Laptop//Desktop//Images//BaseOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	base3Path: function(){
		if(rawFlags.base3){
			return "C://Users//Truck Laptop//Desktop//Images//BaseOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	ball1Path: function(){
		if(rawFlags.ball > 0){
			return "C://Users//Truck Laptop//Desktop//Images//BallOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	ball2Path: function(){
		if(rawFlags.ball > 1){
			return "C://Users//Truck Laptop//Desktop//Images//BallOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	ball3Path: function(){
		if(rawFlags.ball > 2){
			return "C://Users//Truck Laptop//Desktop//Images//BallOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	strike1Path: function(){
		if(rawFlags.strike > 0){
			return "C://Users//Truck Laptop//Desktop//Images//StrikeOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	strike2Path: function(){
		if(rawFlags.strike > 1){
			return "C://Users//Truck Laptop//Desktop//Images//StrikeOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	out1Path: function(){
		if(rawFlags.out > 0){
			return "C://Users//Truck Laptop//Desktop//Images//OutOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	out2Path: function(){
		if(rawFlags.out > 1){
			return "C://Users//Truck Laptop//Desktop//Images//OutOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	TopPath: function(){
		if(rawFlags.inningType == 1){
			return "C://Users//Truck Laptop//Desktop//Images//TopOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	BottomPath: function(){
		if(rawFlags.inningType == -1){
			return "C://Users//Truck Laptop//Desktop//Images//BottomOn.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	flagPath: function(){
		if(rawFlags.flag == "on"){
			return "C://Users//Truck Laptop//Desktop//Images//Flag.png";
		}else{
			return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	}
}
function parseData(x,ignores){
	var arr = x.replace(/\r/g,"").split("\n");
	for(var i = 0; i < arr.length; i++){
		var lr = arr[i].split(" = ");
		if(lr.length != 2){
			continue;
		}
		if(ignores && ignores.indexOf(lr[0]) != -1){
			continue;
		}
		rawFlags[lr[0]] = lr[1];
	}
	for(var i in parseAdds){
		rawFlags[i] = parseAdds[i]();
	}
}
var server = net.createServer(function(c){
	console.log("Socket connection from " + c.remoteAddress);
	c.on("data",function(data){
	if(data){
			console.log("Received data from socket: " + data.toString());
			parseData(data.toString());
			writeOutput();
			sendUpdates();
	}
	});
});
function sendUpdate(res){
	res.write("data: "+JSON.stringify(rawFlags)+"\n\n");
}
function sendUpdates(){
	for(var i = 0; i < ESRes.length; i++){
		sendUpdate(ESRes[i]);
	}
	io.sockets.emit("state",rawFlags);
}
var ESRes = [];
server.listen(options.port, "0.0.0.0");
console.log("Socket listening on port "+options.port);
var hserver = http.createServer(function(req,res){
	if(req.method == "POST"){
		req.on("data",function(data){
			console.log("Received data over HTTP: "+data.toString());
			parseData(data.toString());
		});
		req.on("end",function(){
			writeOutput();
			sendUpdates();
			res.setHeader("Content-Type","text/plain");
			res.end("OK");
		});
	}else{
		switch(req.url.toLowerCase()){
			case "/favicon.ico":
			case "/favicon.png":
			stream("favicon.png", req, res, "image/png");
				break;
			case "/shortcuts.png":
			stream("shortcuts.png", req, res, "image/png");
			break;
		case "/stats.json":
			res.setHeader("Content-Type","application/json");
			res.end(JSON.stringify(rawFlags));
			break;
		case "/es":
			res.setHeader("Content-Type","text/event-stream");
			ESRes.push(res);
			res.on("close",function(){
				ESRes.splice(ESReqs.indexOf(res),1);
			});
			sendUpdate(res);
			break;
		case "/ocr":
			stream("OCR.htm", req, res, "text/html");
			break;
		case "/draw":
			stream("draw.htm", req, res, "text/html");
			break;
		case "/debug":
			stream("Debug.htm", req, res, "text/html");
			break;
		case "/manage":
			stream("Manage.htm", req, res, "text/html");
			break;
		case "/rockathon":
			stream("Rockathon.htm", req, res, "text/html");
			break;
		case "/test.mp4":
			stream("test.mp4", req, res, "video/mp4");
			break;
		case "/baseball":
			stream("Baseball.htm", req, res, "text/html");
			break;
		default:
            if(fs.existsSync("."+req.url)){
                stream("."+req.url, req, res, "image/png");
                               break;
            }
			stream("Manual.htm", req, res, "text/html");
			break;
		}
	}
});
var io = socketio.listen(hserver);
io.configure(function(){
	io.set("log level",1);
	io.set("transports", ["websocket", "xhr-polling"]);
});
hserver.listen(options.httpport, "0.0.0.0");
console.log("HTTP server listening on port "+options.httpport);
var drawNum = 0;
io.sockets.on("connection", function(socket){
	socket.emit("state", rawFlags);
	socket.emit("quartzState", quartzFlags);
	socket.on("writeImage", function(data){
		var buf = new Buffer(data, 'base64');
		fs.writeFile("drawings/"+drawNum+".png", buf, function(){
			rawFlags.drawingPath = path.resolve("drawings/"+drawNum+".png").replace(/\//g,"//");
			drawNum++;
			writeOutput();
		});
	});
	socket.on("sendUDP", function(data){
		extend(true, quartzFlags, data);
		UDPSendObject(data);
	});
	socket.on("update", function(data){
		for(var i in data){
			rawFlags[i] = data[i];
		}
		for(var i in parseAdds){
			rawFlags[i] = parseAdds[i]();
		}
		writeOutput();
	});
	socket.on("text", function(text){
		parseData(text);
		writeOutput();
	});
});
var udpSocket = dgram.createSocket("udp4");
udpSocket.bind(50000);
udpSocket.on("message", function(msg, rinfo){
	console.log("Quartz Message: \""+msg+"\" from "+rinfo.address+":"+rinfo.port);
});
udpSocket.setBroadcast(true);
function UDPSendObject(obj){
	UDPSendText(JSON.stringify(obj));
}
function UDPSendText(text){
	var newText = "";
	for(var i = 0; i < text.length; i++){
		newText += "\0\0\0"+text[i];
	}
	var buffer = new Buffer(newText.substring(0,420), "utf8");
	var buffer2 = new Buffer(newText.substring(420), "utf8");
	udpSocket.send(buffer, 0, buffer.length, 50000, "192.168.1.255");
	udpSocket.send(buffer2, 0, buffer2.length, 50001, "192.168.1.255");
}