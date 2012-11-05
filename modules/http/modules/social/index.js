var exports = module.exports = function(info){
	var self = this;
	var config = this.config = info.config;
	var io = this.io = info.io;
	var server = this.server = info.server;
	var parent = this.parent = info.parent;
	
	var twitter = require('ntwitter');
	var oauth = config.oauth;
	var twit = new twitter(oauth);
	
	var currentTweets = this.currentTweets = {};
	var twitterText = this.twitterText = "";
	
	io.sockets.on("connection", function(socket){
		socket.on("joinTwitter", function(){
			socket.join("twitter");
			socket.emit('showingTweets', currentTweets);
		});
		socket.on("approveTweet", function(tweet){
			currentTweets[tweet.id] = tweet;
			self.rebuildTwitterText();
			io.sockets.in('twitter').emit('showingTweets', currentTweets);
		});
		socket.on("removeTweet", function(tweet){
			delete currentTweets[tweet.id];
			self.rebuildTwitterText();
			io.sockets.in('twitter').emit('showingTweets', currentTweets);
		});
	});
	
	twit.stream('statuses/filter', config.params, function(stream) {
		stream.on('data', function (tweet) {
			io.sockets.in('twitter').emit('newTweet', tweet);
		});
		stream.on('error', function (error, code) {
			console.error('Twitter Error: ' + code);
		});
	});
	
	this.paths = {
		"/social": function(req, res){
			self.parent.stream(__dirname + "/resources/index.htm", req, res, "text/html");
		}
	};
};

exports.prototype.rebuildTwitterText = function(){
	var tweets = this.currentTweets;
	var twitterText = this.twitterText = "";
	var texts = []
	for(var i in tweets){
		var tweet = tweets[i];
		var tweetText = "@" + tweet.user.screen_name + ": " + tweet.text;
		texts.push(tweetText);
	}
	this.twitterText = texts.join(this.config.separator | " | ");
	this.parent.emit("flags", {twitterText: this.twitterText});
}