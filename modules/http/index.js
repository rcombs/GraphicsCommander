var http = require("http"),
	socketio = require("socket.io"),
	mime = require("mime"),
	URL = require("url"),
	events = require("events"),
	fs = require("fs"),
	path = require("path");
	
var exports = module.exports = function(config){
	var self = this;
	var current = this.current = {};
	this.config = config;
	var resourceDir = __dirname + "/resources";
	var server = this.server = http.createServer(function(req, res){
		if(req.method == "POST"){
			res.end("POST DEPRECATED");
		}else{
			var url = URL.parse(req.url);
			switch(url.pathname.toLowerCase()){
				case "/favicon.ico":
				case "/favicon.png":
					stream(resourceDir + "/favicon.png", req, res, "image/png");
				break;
				case "/shortcuts.png":
					stream(resourceDir + "/shortcuts.png", req, res, "image/png");
				break;
			case "/current.json":
				res.setHeader("Content-Type","application/json");
				res.end(JSON.stringify(self.current));
				break;
			case "/ocr":
				stream(resourceDir + "/OCR.htm", req, res, "text/html");
				break;
			case "/draw":
				stream(resourceDir + "/draw.htm", req, res, "text/html");
				break;
			case "/debug":
				stream(resourceDir + "/Debug.htm", req, res, "text/html");
				break;
			case "/manage":
				stream(resourceDir + "/Manage.htm", req, res, "text/html");
				break;
			case "/rockathon":
				stream(resourceDir + "/Rockathon.htm", req, res, "text/html");
				break;
			case "/test.mp4":
				stream(resourceDir + "/test.mp4", req, res, "video/mp4");
				break;
			case "/baseball":
				stream(resourceDir + "/Baseball.htm", req, res, "text/html");
				break;
			default:
				if(fs.existsSync(resourceDir + url.pathname)){
					stream(resourceDir + url.pathname, req, res, mime.lookup(url.pathname));
				}else{
					var sent = false;
					for(var i = 0; i < self.modules.length; i++){
						var mod = self.modules[i];
						if(mod.paths && mod.paths[url.pathname]){
							mod.paths[url.pathname](req, res);
							sent = true;
							break;
						}
					}
					if(!sent){
						stream(resourceDir + "/Manual.htm", req, res, "text/html");
					}
				}
				break;
			}
		}
	});
	var io = this.io = socketio.listen(server);
	io.configure(function(){
		io.set("log level", 1);
		io.set("transports", ["websocket", "xhr-polling"]);
	});
	server.listen(config.port, "0.0.0.0");
	console.log("HTTP server listening on port "+config.port);
	var drawNum = this.drawNum = 0;
	io.sockets.on("connection", function(socket){
		socket.emit("state", self.current);
		socket.on("writeImage", function(data){
			var buf = new Buffer(data, 'base64');
			fs.writeFile("drawings/" + drawNum + ".png", buf, function(){
				var drawingPath = path.resolve("drawings/" + drawNum + ".png").replace(/\//g,"//");
				self.drawNum++;
				self.emit("flags", {drawingPath: drawingPath});
			});
		});
		socket.on("update", function(data){
			self.emit("flags", data);
		});
	});
	var modules = this.modules = [];
	if(config.modules){
		for(var i in config.modules){
			if(!config.modules[i]){
				continue;
			}
			var mod = require(path.join(__dirname, "modules", i));
			var modInfo = {
				server: server,
				io: io,
				parent: self,
				config: config.modules[i]
			}
			var instance = new mod(modInfo);
			modules.push(instance);
		}
	}
}

exports.prototype = new events.EventEmitter();

exports.prototype.writeFlags = function(flags){
	this.current = flags;
	this.io.sockets.emit("state", flags);
};

exports.type = "io";
	
var stream = exports.prototype.stream = function(file, req, res, type){
	fs.stat(file, function(err, stat){
		if(err){
			throw err;
		}
		if(!stat.isFile()){
			res.end();
		}
		
		var start = 0;
		var end = 0;
		var range = req.headers.Range;
		if(range != null){
			start = parseInt(range.slice(range.indexOf('bytes=') + 6, range.indexOf('-')));
			end = parseInt(range.slice(range.indexOf('-') + 1, range.length));
		}
		
		if (isNaN(start)){
			start = 0;
		}
		if (isNaN(end) || end == 0){
			end = stat.size;
		}
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
