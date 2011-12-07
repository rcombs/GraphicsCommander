#! /usr/bin/env node
var net = require("net");
var path = require("path");
var fs = require("fs");
var socketio = require("socket.io");
var http = require("http");
var rawFlags = {};
function makeString(hash){
	var str = "";
	for(var i in hash){
		var j = hash[i];
		str += i + " = " + j + "\n";
	}
	return str;
}
function stream(file, req, res){
	var stat = fs.statSync(file);
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
	if (isNaN(end) || end == 0) end = stat.size-1;
	
	if (start > end){
		res.end();
	}
	
	var date = new Date();
	
	res.writeHead(206, { // NOTE: a partial http response
		'Date': date.toUTCString(),
		'Connection': 'close',
		// 'Cache-Control':'private',
		'Content-Type': 'video/mp4',
		'Content-Length': end - start,
		'Content-Range': 'bytes '+start+'-'+end+'/'+stat.size,
		'Accept-Ranges':'bytes',
		// 'Server':'CustomStreamer/0.0.1',
		'Transfer-Encoding':'chunked'
	});
	
	var stream = fs.createReadStream(file, {
		flags: 'r', start: start, end: end
	});
	stream.pipe(res);
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
	}
};
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
			if(!path.existsSync(arg)){
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
	preload: {
		abbr: "l",
		full: "preload-file",
		list: true,
		help: "Scoreboard file to parse once on start",
		callback: function(arg){
			if(!path.existsSync(arg)){
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
	awayPossPath: function(){
		switch(rawFlags.Poss){
			case "V":
				return "C://Users//Truck Laptop//Desktop//Images//Possession.png";
			default:
				return "C://Users//Truck Laptop//Desktop//Images//Blank.png";
		}
	},
	timeoutPath: function(){
		if(rawFlags.flag == "on"){
			return "C://Users//Truck Laptop//Desktop//Images//Timeouts.png";
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
server.listen(options.port, 'localhost');
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
				res.setHeader("Content-Type","image/png");
				res.end(fs.readFileSync("favicon.png"));
				break;
            case "/shortcuts.png":
				res.setHeader("Content-Type","image/png");
				res.end(fs.readFileSync("shortcuts.png"));
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
				res.setHeader("Content-Type","text/html");
				res.end(fs.readFileSync("OCR.htm"));
				break;
            case "/test.mp4":
				stream("test.mp4",req,res);
				break;
			default:
				res.setHeader("Content-Type","text/html");
				res.end(fs.readFileSync("manual.htm"));
				break;
		}
	}
});
var io = socketio.listen(hserver);
io.configure(function(){
	io.set("log level",1);
	io.set("transports", ["websocket", "xhr-polling"]);
});
hserver.listen(options.httpport,"localhost");
console.log("HTTP server listening on port "+options.httpport);

io.sockets.on("connection", function(socket){
	socket.emit("state", rawFlags);
	socket.on("update", function(data){
		for(var i in data){
			rawFlags[i] = data[i];
		}
		writeOutput();
	});
})