var express = require('express');
var app = express();
var server = require('http').createServer(app);
// Socket IO
var io = require('socket.io')(server);
// Redis DB 
var redis = require('redis');
var url = require('url');
var redisURL = url.parse(process.env.REDISCLOUD_URL);
var redisClient = redis.createClient(redisURL.port,redisURL.hostname, {no_ready_check: true});
redisClient.auth(redisURL.auth.split(":")[1]);

redisClient.on('error',function(err){
	console.log(err);
});

app.use(express.static('public'));

app.get('/',function(req,res){
	res.sendFile();
});

io.sockets.on('connection',function(client){
	console.log('client connected');
	
	client.on('join',function(name){
		console.log(name + ' connected');
		storeMsg(name,' has connected.');
		sendMsg(client);
	});
	
	client.on('disconnect',function(){
		console.log("user disconnected");
	});
	
	client.on('userMsg',function(data){
		storeMsg(data.user,data.message);
		sendMsg(client);
	});

});

function storeMsg(name, msg){
	var jsonMsg = JSON.stringify({name:name,message:msg});
	redisClient.lpush('messages',jsonMsg,function(err,reply){
		redisClient.ltrim('messages',0,9);
	});
}

function sendMsg(client){
	redisClient.lrange('messages',0,-1,function(err,data){
		data = data.map(function(line){return line = JSON.parse(line);}).reverse();
		// or just data = data.map(JSON.parse);
		client.emit('loadMessages',data);
		client.broadcast.emit('loadMessages',data);
	});
}	

server.listen(8000,function(){
	console.log('Server is listening on port 8000...');
});
