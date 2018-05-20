var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var bodyParser = require('body-parser')
var PORT = 7777

class InBoxes {
  constructor() {
    this.inboxes = {}
    this.socket2name = {}
  }
  createUser(userName) {
    this.inboxes[userName] = {threads: {}, connections: []} 
  }
  send(user, eventName, msg) {
    var connections = this.inboxes[user].connections  
    for(let i=0; i<connections.length; i++){
      let client = connections[i]
      client.emit(eventName, msg)
    }
  }
  addMsg2Thread(msg, user1, user2) {
    var threads = this.inboxes[user1].threads
    if (user2 in threads) {
      threads[user2].msgs.push(msg)
    } else {
      threads[user2] = {msgs: [msg], lastAccessTime: 0}
    }
  }
  addMessage(msg) {
    var date = new Date()
    var msgWithTime = {...msg, time: date}
    this.addMsg2Thread(msgWithTime, msg.sender, msg.receiver)
    this.addMsg2Thread(msgWithTime, msg.receiver, msg.sender)
    this.send(msg.receiver, 'new-msg', msgWithTime)
    this.send(msg.sender, 'new-msg', msgWithTime)
    this.accessThread(msg.sender, msg.receiver)
  }
  userConnect(username, client) {
    console.log(username, ' joins');    
    this.inboxes[username].connections.push(client)
    this.socket2name[client.id] = username
    client.emit('init-info', 
    {
      contacts: this.getContacts(username), 
      threads: this.inboxes[username].threads,
    })
    client.broadcast.emit('friend-connect', username)
  }
  accessThread (user, threadName) {
    var threads = this.inboxes[user].threads
    if (threadName in threads) {
      var time = new Date()
      threads[threadName].lastAccessTime = new Date()
      this.send(user, 'update-accessTime', {threadName: threadName, time: time})
    }
  }
  userDisconnect(socket, io) {
    var socketId = socket.id
    var username = this.socket2name[socketId]
    var connections = this.inboxes[username].connections
    var index = connections.indexOf(socket)
    if (index >= 0) connections.splice(index, 1)
    
    delete this.socket2name[socketId]
    if (connections.length === 0) io.local.emit('friend-disconnect', username)
    console.log(username, ' leaves') 
  }
  isConnect(username) {
    return this.inboxes[username].connections.length !== 0
  }
  getContacts(username) {
    var all_users = Object.keys(this.inboxes)
    var contacts = {}
    for(let i=0; i<all_users.length; i++){
      var thatUser = all_users[i]
      if(thatUser !== username){
        contacts[thatUser] = {
          online: this.isConnect(thatUser),
        }
      }
    }
    return contacts
  }
  indexOf(username) {
    return Object.keys(this.inboxes).indexOf(username)
  }
  debugInit() {
    this.createUser('Alice')
    this.createUser('Bob')
    this.createUser('Carol')
    this.addMessage({text: 'Hi Alice, I am Bob', sender: 'Bob', receiver: 'Alice'})
    this.addMessage({text: 'How you doin?', sender: 'Bob', receiver: 'Alice'})
    // console.log(this.inboxes)
  }
  debugPrint() {
  }
}

app.use(express.static('public'))
app.use(bodyParser.json())

myInbox = new InBoxes()
myInbox.debugInit()

app.post('/login', function(req, res) {
  var access =  myInbox.indexOf(req.body.username) !== -1
  res.json({
    access: access,
    username: req.body.username,
  })
})

server.listen(PORT, () => {
  console.log('Server is running on port: ', PORT)
})
io.on('connection', function(client) {
  console.log('Client connected...');

  client.on('join', function(username) {
    myInbox.userConnect(username, client)
  });
  client.on('message', function(msg) {
    console.log(msg)
    myInbox.addMessage(msg)
  })
  client.on('disconnect', function(){
    myInbox.userDisconnect(client, io)
  })
  client.on('access-thread', function(data){
    console.log(data)
    myInbox.accessThread(data.user, data.threadName)
  })
});