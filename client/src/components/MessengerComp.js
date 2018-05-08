import React, { Component } from 'react';
import './MessengerComp.css'
import io from 'socket.io-client'

export class MessengerComp extends Component {
  constructor(props) {
    super(props)
    this.state = {
      username: "", threads: {}, contacts: {},
      contactFocus: null,
      inputValue: '',
      socket: null,
    }
    this.focus = this.focus.bind(this)
    this.updateInputValue = this.updateInputValue.bind(this)
    this.sendMsg = this.sendMsg.bind(this)
    this.handleWindowClose = this.handleWindowClose.bind(this)
  }
  focus (e, key) {
    let intKey = parseInt(key, 10) 
    this.setState({contactFocus: intKey})
    this.state.socket.emit('access-thread', {
      user: this.state.username, 
      threadName: Object.keys(this.state.contacts)[intKey],
    })
  }
  updateInputValue (e) {
    var newChar = e.target.value.slice(-1)
    if (!(this.state.inputValue === '' && newChar === '\n'))
      this.setState({inputValue: e.target.value})
  }
  sendMsg (e) {
    if (this.state.contactFocus !== null && this.state.inputValue !== ''){
      console.log('send')
      var socket = this.state.socket
      socket.emit('message', 
      {
        text: this.state.inputValue, 
        receiver: Object.keys(this.state.contacts)[this.state.contactFocus],
        sender: this.state.username,
      })
      this.setState({inputValue: ""})
    }
  }

  componentDidMount() {
    var userInfo = JSON.parse(localStorage.getItem('user-info'))
    console.log('user-info', userInfo)

    var socket = io.connect('http://localhost:7777');
    this.setState({
      username: userInfo.username,
      socket: socket,
    })
    socket.on('connect', function(data) {
      socket.emit('join', userInfo.username);
    });
    socket.on('friend-connect', friendName => {
      console.log('friend-connect')
      if (friendName !== this.state.username) {
        let contacts = {...this.state.contacts}
        contacts[friendName].online = true
        this.setState({contacts})
      }
    })
    socket.on('friend-disconnect', friendName => {
      if (friendName !== this.state.username) {
        let contacts = {...this.state.contacts}
        contacts[friendName].online = false
        this.setState({contacts})
      }
    })
    socket.on('init-info', data => {
      console.log('init-info', data)
      let fullThreads = {...data.threads}
      let contactArr = Object.keys(data.contacts)
      for (let i=0; i<contactArr.length; i++){
        if (!(contactArr[i] in fullThreads)){
          fullThreads[contactArr[i]] = {msgs: [], lastAccessTime: 0}
        }
      }
      this.setState({
        contacts: data.contacts,
        threads: fullThreads,
      })
    })
    socket.on('new-msg', msg => {
      console.log('new msg', msg)
      let threads = {...this.state.threads}
      let threadName = msg.sender === this.state.username ? msg.receiver : msg.sender
      threads[threadName].msgs.push(msg)
      this.setState({threads: threads})
    })
    socket.on('update-accessTime', msg => {
      console.log(msg)
      let threads = {...this.state.threads}
      threads[msg.threadName].lastAccessTime = msg.time
      this.setState({threads: threads})      
    })
    window.addEventListener('onbeforeunload', this.handleWindowClose)
  }
  componentWillUnmount() {
    window.removeEventListener('onbeforeunload', this.handleWindowClose )
  }
  handleWindowClose() {
    this.state.socket.disconnect()
  }
  render() {
    if (this.state.contactFocus !== null){
      var threadName = Object.keys(this.state.contacts)[this.state.contactFocus]
      var thread = this.state.threads[threadName]
    } else {
      thread = {msgs: []}
    }
    return (
      <div className="App">
        <AppHeader name={this.state.username}/>
        <div className="Content">
          <Contacts 
            contacts={this.state.contacts} 
            focus={this.focus} 
            focusId={this.state.contactFocus}
            threads={this.state.threads}
          />
          <MsgThread
            myName={this.state.username} 
            thread={thread} 
            inputValue={this.state.inputValue}
            updateInputValue={this.updateInputValue} 
            sendMsg={this.sendMsg}
          />
        </div>
      </div>
    )
  }
}

class MsgThread extends Component {
  constructor(props) {
    super(props)
    this.scrollToBottom = this.scrollToBottom.bind(this)
  }
  scrollToBottom() {
    this.messagesEnd.scrollIntoView({behavior: "smooth"})
  }
  componentDidMount() {
    this.scrollToBottom()
  }
  componentDidUpdate() {
    this.scrollToBottom()
  }
  render() {
    var msgLines = []
    var msgs = this.props.thread.msgs
    for (let i=0; i<msgs.length; i++){
      var msg = msgs[i]
      var type = msg.sender === this.props.myName ? 'send': 'receive'
      msgLines.push(<MsgLine key={i} text={msg.text} type={type}/>)
    }
    const noShowMsg = <MsgLine key={0} text='nothing to show' type="system"/>
    if (msgLines.length === 0) msgLines.push(noShowMsg)
    return (
      <div className="MsgThread">
        <ul className="Msgs">
          {msgLines}
          <div style={{ float:"left", clear: "both" }}
             ref={(el) => { this.messagesEnd = el; }}>
          </div>
        </ul>
        <TextInput  
          inputValue={this.props.inputValue} 
          updateInputValue={this.props.updateInputValue} 
          sendMsg={this.props.sendMsg}
        />
      </div>
    )
  }
}

class MsgLine extends Component {
  render() {
    const lenLimit = 5
    let className = "MsgText " + this.props.type
    let textLines = this.props.text.split('\n')
    let lineNum = textLines.length
    let maxlen = textLines.reduce((a, b) => (a.length > b.length ? a.length : b.length), 0)
    let sentNum = textLines.reduce((a, b) => (a + Math.ceil(b.length/(lenLimit+1))), 0)
    if (maxlen > lenLimit) {
      maxlen = lenLimit
      // console.log('longsentnum', sentNum)
    }
    return (
      <li className="MsgLine">
        <textarea 
          className={className} 
          value={this.props.text} 
          autoCorrect="none"
          readOnly
        />
      </li>
    )
  }
}

class Contacts extends Component {
  render() {
    function getUnreadNum(name, thread) {
      var num = 0
      for(let i=thread.msgs.length-1; i>=0; i--) {
        if (Date.parse(thread.msgs[i].time) > Date.parse(thread.lastAccessTime)) num++
        else break
      }
      return num
    }
    var lis = []
    var contactKeys = Object.keys(this.props.contacts)
    for(let i=0; i<contactKeys.length; i++){
      let name = contactKeys[i]
      let type = 'plain'
      let unReadNum = getUnreadNum(name, this.props.threads[name])
      if (i === this.props.focusId) type = 'focus'
      lis.push(
        <ContactName 
          name={name} 
          online={this.props.contacts[name].online}
          key={i} id={i}
          focus={this.props.focus} 
          type={type}
          unReadNum={unReadNum}
        />
      )
    }
    return (
      <ul className="Contacts">
        {lis}
      </ul>
    )
  }
}

class ContactName extends Component {
  constructor(props){
    super(props)
    this.focus = this.focus.bind(this)
  }
  focus(event) {
    this.props.focus(event, this.props.id)
  }
  render() {
    var classname = "ContactName"
    var unReadNum = ""
    if (this.props.unReadNum > 9) unReadNum = "∞"
    else if (this.props.unReadNum > 0) unReadNum = this.props.unReadNum

    if (this.props.type === 'focus') classname += ' focus'
    if (this.props.online) classname += ' online'
    return <li className={classname} onClick={this.focus}>
      <div className="name">{this.props.name}</div>
      <div className="unreadNum">{unReadNum}</div>
    </li>
  }
}

class TextInput extends Component {
  constructor(){
    super()
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }
  handleKeyPress(e){
    if (e.keyCode === 13 && ! e.shiftKey){
      this.props.sendMsg()  
    }
  }
  render() {
    return (
      <div className="TextInput">
        <textarea 
          cols = "10"
          className="InputBar"
          value={this.props.inputValue} 
          onChange={this.props.updateInputValue} 
          onKeyDown={this.handleKeyPress} 
          autoFocus
        />
        <button className="Send-btn" onClick={this.props.sendMsg}> Send </button>
      </div>
    )
  }
}

class AppHeader extends Component {
  constructor(props) {
    super(props)
    this.logout = this.logout.bind(this)
  }
  logout() {
    window.location = '/'
  }
  render() {
    return (
      <div className="header">
        <h1 className="title">Messenger</h1>
        <div className='title-item'>
          <h1 className='title-label'>{this.props.name}</h1>
          <button className="title-btn">Settings</button>
          <button className="title-btn" onClick={this.logout}>Logout</button>
        </div>
      </div>
    )
  }
}