var socket = io.connect('http://localhost:7777');
socket.on('connect', function(data) {
    socket.emit('join', 'Hello server from client');
});



var btn = document.getElementById('send-btn')
var cnt = 0
btn.onclick = function (e) {
  console.log('send')
  socket.emit('messages', cnt)
  cnt++
  return false;
}