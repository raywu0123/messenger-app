import React, { Component } from 'react';
import { Switch, Route } from 'react-router-dom'
import './App.css';
import {LoginComp} from './components/LoginComp'
import {MessengerComp} from './components/MessengerComp'

class App extends Component {
  constructor() {
    super()
    this.state = {
      inputValue: 'Alice',
    }
    this.login = this.login.bind(this)
    this.updateInput = this.updateInput.bind(this)
    this.handleKeyPress = this.handleKeyPress.bind(this)
  }

  login () {
    if (this.state.inputValue !== ''){
      fetch('/login', {
        body: JSON.stringify({username: this.state.inputValue}),
        headers: {'content-type': 'application/json'},
        method: 'POST',
      })
      .then(res => res.json())
      .then(res => {
        if (!res.access) window.alert('Access Denied')
        else {
          window.location = '/messenger'     
          localStorage.setItem('user-info', JSON.stringify(res))
        }
        this.setState({
          inputValue: '',
        })
      })
    }
  }

  handleKeyPress(e){
    if (e.key === 'Enter') this.login()
  }
  updateInput(e) {
    this.setState({inputValue: e.target.value})
  }

  render() {
    return (
      <Switch>
        <Route exact path='/' render={() => 
        <LoginComp 
          inputValue={this.state.inputValue}
          updateInput={this.updateInput}
          handleKeyPress={this.handleKeyPress}
          login={this.login}/>
        }/>
        <Route path='/messenger' component={MessengerComp} />
        }/>
      </Switch>
    )
  }
}
export default App;
