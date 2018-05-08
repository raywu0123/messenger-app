import React, { Component } from 'react';
import './LoginComp.css'

export class LoginComp extends Component {
  render() {
    return (
      <div className="App">
        <div className="header">
          <h1 className="title">Login</h1>
        </div>
        <div className="LoginContent">
          <input placeholder="username" autoFocus className="username"
            value={this.props.inputValue} 
            onChange={this.props.updateInput}
            onKeyPress={this.props.handleKeyPress}
          />
          <button onClick={this.props.login} className="LoginBtn">Login</button>

          <div>
            <h3>Instructions:</h3>
            <ul>
              <li>There are now 3 available accounts:</li>
              <li>Alice, Bob, and Carol</li>
              <li>Type in the username and click the button.</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }
}
